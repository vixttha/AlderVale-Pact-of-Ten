import 'dotenv/config';
import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { verifyFirebaseBearerToken } from './server/authVerify.ts';
import { realmWorldStore } from './server/authzStore.ts';
import { generateArchivistAdvice, type StrategizeRequest } from './server/lecternAi.ts';
import { attachAldervaleWebSocketServer } from './server/wsHub.ts';
import type { RealmId } from './shared/realms.ts';
import type { ElementId } from './shared/elements.ts';

function isRealmId(val: string): val is RealmId {
  return val === 'breeze' || val === 'horizon' || val === 'everpeak';
}

export async function createAldervaleApp() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, game: 'Aldervale: Pact of Ten' });
  });

  // Strict Transactional Resource Update (Orange Team Pattern: 401/404/204, zero override headers)
  app.patch('/api/resources/:resourceId', async (req, res) => {
    const result = await realmWorldStore.resourceStore.updateResourceAuthorized({
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

  // Realm-isolated Courtyard Bazaar
  app.get('/api/bazaar/:realmId', (req, res) => {
    if (!isRealmId(req.params.realmId)) return res.status(400).json({ error: 'Invalid realm' });
    const listings = Array.from(realmWorldStore.bazaar[req.params.realmId].values()).filter((l) => l.status === 'open');
    res.json({ listings });
  });

  app.post('/api/bazaar/:realmId/list', async (req, res) => {
    if (!isRealmId(req.params.realmId)) return res.status(400).json({ error: 'Invalid realm' });
    const principal = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!principal) return res.status(401).json({ error: 'Authentication required' });

    const body = req.body as {
      sellerWizardId?: string;
      sellerName?: string;
      itemType?: 'gear' | 'card' | 'runestone' | 'furniture' | 'reagent';
      itemId?: string;
      itemName?: string;
      priceFlorins?: number;
    };
    const price = Math.max(1, Math.min(1000000, Math.floor(Number(body.priceFlorins ?? 0))));
    if (!body.itemId || !body.itemName || !body.sellerWizardId || price < 1) {
      return res.status(400).json({ error: 'Invalid listing payload' });
    }

    const id = `baz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const listing = {
      id,
      realmId: req.params.realmId,
      sellerId: principal.uid,
      sellerName: String(body.sellerName ?? 'Wizard').slice(0, 24),
      itemType: body.itemType ?? 'gear',
      itemId: String(body.itemId).slice(0, 64),
      itemName: String(body.itemName).slice(0, 48),
      priceFlorins: price,
      status: 'open' as const,
    };
    realmWorldStore.bazaar[req.params.realmId].set(id, listing);
    res.status(201).json({ listing });
  });

  app.post('/api/bazaar/:realmId/buy/:listingId', async (req, res) => {
    if (!isRealmId(req.params.realmId)) return res.status(400).json({ error: 'Invalid realm' });
    const principal = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!principal) return res.status(401).json({ error: 'Authentication required' });

    const listing = realmWorldStore.bazaar[req.params.realmId].get(req.params.listingId);
    if (!listing || listing.status !== 'open') {
      return res.status(404).json({ error: 'Listing unavailable' });
    }
    if (listing.sellerId === principal.uid) {
      return res.status(400).json({ error: 'Cannot buy your own listing' });
    }
    listing.status = 'sold';
    listing.buyerId = principal.uid;
    res.json({ listing });
  });

  // Realm-isolated Academy Houses
  app.get('/api/houses/:realmId', (req, res) => {
    if (!isRealmId(req.params.realmId)) return res.status(400).json({ error: 'Invalid realm' });
    res.json({ houses: Array.from(realmWorldStore.houses[req.params.realmId].values()) });
  });

  app.post('/api/houses/:realmId', async (req, res) => {
    if (!isRealmId(req.params.realmId)) return res.status(400).json({ error: 'Invalid realm' });
    const principal = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!principal) return res.status(401).json({ error: 'Authentication required' });
    const body = req.body as { name?: string; crestElement?: ElementId; motto?: string };
    const name = String(body.name ?? '').trim().slice(0, 32);
    if (name.length < 2) return res.status(400).json({ error: 'House name required' });

    const id = `house_${Date.now()}`;
    const club = {
      id,
      realmId: req.params.realmId,
      leaderId: principal.uid,
      name,
      crestElement: (body.crestElement ?? 'sol') as ElementId,
      motto: String(body.motto ?? 'United by Canopy & Pact').slice(0, 120),
      members: [principal.uid],
    };
    realmWorldStore.houses[req.params.realmId].set(id, club);
    res.status(201).json({ house: club });
  });

  // Realm-isolated Public Dorm Tours
  app.get('/api/tours/:realmId', (req, res) => {
    if (!isRealmId(req.params.realmId)) return res.status(400).json({ error: 'Invalid realm' });
    const list = Array.from(realmWorldStore.dormTours[req.params.realmId].values()).map((t) => ({
      wizardId: t.wizardId,
      wizardName: t.wizardName,
      themeId: t.themeId,
      ratingAvg: t.ratingCount > 0 ? Number((t.ratingSum / t.ratingCount).toFixed(1)) : 5.0,
      ratingCount: t.ratingCount,
    }));
    res.json({ tours: list });
  });

  app.post('/api/tours/:realmId/publish', async (req, res) => {
    if (!isRealmId(req.params.realmId)) return res.status(400).json({ error: 'Invalid realm' });
    const principal = await verifyFirebaseBearerToken(req.headers.authorization);
    if (!principal) return res.status(401).json({ error: 'Authentication required' });
    const body = req.body as { wizardId?: string; wizardName?: string; themeId?: string };
    if (!body.wizardId) return res.status(400).json({ error: 'wizardId required' });
    const existing = realmWorldStore.dormTours[req.params.realmId].get(body.wizardId);
    if (existing && existing.ownerId !== principal.uid) return res.status(404).json({ error: 'Not found' });
    realmWorldStore.dormTours[req.params.realmId].set(body.wizardId, {
      wizardId: body.wizardId,
      ownerId: principal.uid,
      realmId: req.params.realmId,
      wizardName: String(body.wizardName ?? 'Wizard Loft').slice(0, 32),
      themeId: String(body.themeId ?? 'sunlit_loft').slice(0, 32),
      ratingSum: existing?.ratingSum ?? 5,
      ratingCount: existing?.ratingCount ?? 1,
      raters: existing?.raters ?? new Set(),
    });
    res.json({ ok: true });
  });

  // Free-Tier Gemini 4 Hydrogen Archivist Lectern
  app.post('/api/academy/strategize', async (req, res) => {
    try {
      const body = req.body as StrategizeRequest;
      const result = await generateArchivistAdvice(body);
      res.json(result);
    } catch {
      res.status(500).json({ error: 'Archivist lectern temporarily busy' });
    }
  });

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
