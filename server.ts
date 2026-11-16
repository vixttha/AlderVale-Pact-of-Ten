import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import { buyListing, cancelListing, changeHouseMembership, createHouse, listHouses, listBazaar, listTours, postListing, publishTour, unpublishTour, RequestError } from './server/market.ts';
import { createServer } from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { verifyFirebaseBearerToken } from './server/authVerify.ts';
import { resourceStore } from './server/authzStore.ts';
import { generateArchivistAdvice, type StrategizeRequest } from './server/lecternAi.ts';
import { attachAldervaleWebSocketServer } from './server/wsHub.ts';
import type { RealmId } from './shared/realms.ts';


function isRealmId(val: string): val is RealmId {
  return val === 'breeze' || val === 'horizon' || val === 'everpeak';
}

export async function createAldervaleApp({ frontend = true } = {}) {
  const app = express();
  app.use('/api/academy/strategize', express.json({ limit: '4kb' }));
  app.use('/api', express.json({ limit: '32kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, game: 'Aldervale: Pact of Ten' });
  });

  // Strict Transactional Resource Update (Orange Team Pattern: 401/404/204, zero override headers)
  app.patch('/api/resources/:resourceId', async (req, res) => {
    const result = await resourceStore.updateResourceAuthorized({
      headers: req.headers as Record<string, string | string[] | undefined>,
      authenticate: async (headers) => {
        const auth = typeof headers.authorization === 'string' ? headers.authorization : undefined;
        const verified = await verifyFirebaseBearerToken(auth);
        return verified ? { userId: verified.uid } : null;
      },
      resourceId: req.params.resourceId,
      changes: (req.body ?? {}) as Record<string, unknown>,
    });
    if (result.status === 204) {
      res.status(204).end();
    } else {
      res.status(result.status).json({ error: result.error });
    }
  });

  function realmRoute(handler: (req: Request, res: Response, realm: RealmId) => Promise<unknown>) {
    return (req: Request, res: Response, next: NextFunction) => {
      const realm = req.params.realmId;
      if (!isRealmId(realm)) return res.status(400).json({ error: 'Invalid realm' });
      void handler(req, res, realm).catch(next);
    };
  }

  async function requireAccount(req: Request): Promise<string> {
    const principal = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!principal?.emailVerified) throw new RequestError(401, 'Sign in with a verified Google account');
    return principal.uid;
  }

  app.get('/api/bazaar/:realmId', realmRoute(async (req, res, realm) => {
    const uid = req.headers.authorization ? await requireAccount(req) : undefined;
    res.json(await listBazaar(realm, uid));
  }));
  app.post('/api/bazaar/:realmId/list', realmRoute(async (req, res, realm) => {
    res.status(201).json(await postListing(realm, await requireAccount(req), req.body ?? {}));
  }));
  app.post('/api/bazaar/:realmId/buy/:listingId', realmRoute(async (req, res, realm) => {
    res.json(await buyListing(realm, await requireAccount(req), req.body?.wizardId, req.params.listingId));
  }));
  app.post('/api/bazaar/:realmId/cancel/:listingId', realmRoute(async (req, res, realm) => {
    res.json(await cancelListing(realm, await requireAccount(req), req.params.listingId));
  }));
  app.get('/api/houses/:realmId', realmRoute(async (req, res, realm) => {
    const uid = req.headers.authorization ? await requireAccount(req) : undefined;
    res.json(await listHouses(realm, uid));
  }));
  app.post('/api/houses/:realmId/:houseId/:action(join|leave)', realmRoute(async (req, res, realm) => {
    const uid = await requireAccount(req);
    const action = req.params.action === 'join' ? 'join' : 'leave';
    await changeHouseMembership(realm, uid, req.params.houseId, action);
    res.json(await listHouses(realm, uid));
  }));
  app.post('/api/houses/:realmId', realmRoute(async (req, res, realm) => {
    res.status(201).json({ house: await createHouse(realm, await requireAccount(req), req.body ?? {}) });
  }));
  app.get('/api/tours/:realmId', realmRoute(async (_req, res, realm) => {
    res.json({ tours: await listTours(realm) });
  }));
  app.post('/api/tours/:realmId/publish', realmRoute(async (req, res, realm) => {
    res.json(await publishTour(realm, await requireAccount(req), req.body?.wizardId));
  }));
  app.post('/api/tours/:realmId/unpublish', realmRoute(async (req, res, realm) => {
    res.json(await unpublishTour(realm, await requireAccount(req), req.body?.wizardId));
  }));

  const allowance = new Map<string, { resetAt: number; count: number }>();
  app.post('/api/academy/strategize', (req, res, next) => {
    const body = req.body as Partial<StrategizeRequest> | undefined;
    const goal = body?.goal;
    if (!body || ![body.wizardName, body.raceName, body.elementName, body.activeCreatureName].every(
      (value) => typeof value === 'string' && value.trim().length > 0 && value.length <= 64
    ) || typeof goal !== 'string' || !goal.trim() || goal.length > 400 ||
      typeof body.level !== 'number' || !Number.isInteger(body.level) || body.level < 1 || body.level > 50 ||
      typeof body.rank !== 'number' || !Number.isInteger(body.rank) || body.rank < 1 || body.rank > 20) {
      return res.status(400).json({ error: 'Enter a strategy question of up to 400 characters' });
    }
    if (process.env.GEMINI_API_KEY) {
      const now = Date.now();
      for (const [key, value] of allowance) if (value.resetAt <= now) allowance.delete(key);
      const keys = ['global', `ip:${req.ip}`];
      if (keys.some((key, index) => (allowance.get(key)?.count ?? 0) >= (index === 0 ? 30 : 5))) {
        return res.set('Retry-After', '60').status(429).json({ error: 'The Lectern is busy. Try again in a minute.' });
      }
      for (const key of keys) {
        const entry = allowance.get(key) ?? { resetAt: now + 60_000, count: 0 };
        entry.count += 1;
        allowance.set(key, entry);
      }
    }
    void generateArchivistAdvice(body as StrategizeRequest).then((result) => res.json(result)).catch(next);
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found' }));
  app.use('/api', (error: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(error);
    if (error instanceof RequestError) return res.status(error.status).json({ error: error.message });
    const status = (error as { status?: number } | null)?.status;
    if (status === 400 || status === 413) return res.status(status).json({ error: 'Invalid request body' });
    console.warn('Aldervale API temporarily unavailable:', error instanceof Error ? error.message : 'Unknown error');
    return res.status(503).json({ error: 'Service temporarily unavailable. Try again shortly.' });
  });

  if (!frontend) return app;

  // Vite middleware in dev, static dist in prod
  const distDir = path.resolve(process.cwd(), 'dist');
  if (process.env.NODE_ENV === 'production' && existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  return app;
}

if (process.env.VITEST !== 'true') {
  const port = Number(process.env.PORT ?? 3000);
  createAldervaleApp().then((app) => {
    const httpServer = createServer(app);
    attachAldervaleWebSocketServer(httpServer);
    httpServer.listen(port, '0.0.0.0', () => {
      console.log(`Aldervale: Pact of Ten listening on http://0.0.0.0:${port}`);
    });
  });
}
