export const startupFiles = [
  "AGENTS.md",
  "PROJECT_RULES.md",
  "docs/AGENT_OPERATIONS.md",
  "docs/CHATGPT_PROJECT_INSTRUCTIONS.md",
] as const;

export const workerReceipt = [
  "Worker",
  "Host and model",
  "Run",
  "GitHub identity",
  "Baseline and work",
  "Evidence",
];

export type RoleMismatch = {
  leadsSentence: boolean | null;
  aiStudioOperatingLink: boolean | null;
  privateSourcesChecked: boolean | null;
  note: string;
};

export type StartupReport = {
  mainSha: string | null;
  github: "read" | "unavailable";
  files: { path: string; found: boolean }[];
  workflowsOnMain: string[];
  excerpts: { path: string; heading: string; text: string }[];
  mismatch: RoleMismatch;
  workerReceipt: string[];
  notion: {
    connected: false;
    milestoneFit: "unverified";
    publicReply: string;
  };
  chooseWork: string;
};

const excerptPlan: { path: (typeof startupFiles)[number]; heading: string }[] = [
  { path: "AGENTS.md", heading: "## Authority and roles" },
  { path: "PROJECT_RULES.md", heading: "## 4. Tool roles and project records" },
  { path: "PROJECT_RULES.md", heading: "## 6. November 2026 milestone" },
  { path: "PROJECT_RULES.md", heading: "## Operating references" },
  { path: "docs/AGENT_OPERATIONS.md", heading: "## Worker identity and startup receipt" },
  { path: "docs/CHATGPT_PROJECT_INSTRUCTIONS.md", heading: "## Start from current evidence" },
];

const notion = {
  connected: false as const,
  milestoneFit: "unverified" as const,
  publicReply: "Name the source class only. Do not write a page title or URL.",
};

export function extractSection(markdown: string, heading: string): string | null {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === heading);
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith("## ")) {
      end = i;
      break;
    }
  }
  const text = lines.slice(start, end).join("\n").trim();
  return text.length > 4000 ? `${text.slice(0, 4000)}\n…` : text;
}

export function scanRoleText(parts: { path: string; text: string }[]): RoleMismatch {
  const leadsIn: string[] = [];
  const linkIn: string[] = [];
  const privateIn: string[] = [];
  for (const part of parts) {
    const withoutNegation = part.text.replace(/not the assumed lead/gi, "");
    if (/Google AI Studio leads/i.test(part.text) || /AI Studio leads/i.test(withoutNegation)) {
      leadsIn.push(part.path);
    }
    if (part.text.includes("aistudio.google.com")) linkIn.push(part.path);
    if (/private sources checked/i.test(part.text)) privateIn.push(part.path);
  }
  const leadsSentence = leadsIn.length > 0;
  const aiStudioOperatingLink = linkIn.length > 0;
  const privateSourcesChecked = privateIn.length > 0;
  let note: string;
  if (leadsSentence && aiStudioOperatingLink) {
    note =
      "A startup file still says AI Studio leads, and an operating reference links aistudio.google.com. Flag both. The confirmed role is: AI Studio is optional and is not the assumed lead.";
  } else if (leadsSentence) {
    note =
      "A startup file still says AI Studio leads. Flag that mismatch. The confirmed role is: AI Studio is optional and is not the assumed lead.";
  } else if (aiStudioOperatingLink) {
    note =
      "Operating references still link aistudio.google.com. The role text does not say AI Studio leads. Flag the link. The confirmed role is: AI Studio is optional and is not the assumed lead.";
  } else {
    note = "The files read do not say AI Studio leads and do not link aistudio.google.com.";
  }
  if (privateSourcesChecked) {
    note +=
      " docs/CHATGPT_PROJECT_INSTRUCTIONS.md still says private sources checked. In a public reply, name the source class only.";
  }
  return { leadsSentence, aiStudioOperatingLink, privateSourcesChecked, note };
}

function unavailable(): StartupReport {
  return {
    mainSha: null,
    github: "unavailable",
    files: startupFiles.map((path) => ({ path, found: false })),
    workflowsOnMain: [],
    excerpts: [],
    mismatch: {
      leadsSentence: null,
      aiStudioOperatingLink: null,
      privateSourcesChecked: null,
      note: "GitHub was unavailable, so the role text was not read. Do not claim there is no mismatch.",
    },
    workerReceipt: [...workerReceipt],
    notion,
    chooseWork:
      "Milestone fit is unverified. This agent has no Notion connection. Continue only a task the owner already scoped. If the owner asked you to choose work, ask for the milestone.",
  };
}

type Fetcher = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export async function readMainStartup(fetchImpl: Fetcher = fetch): Promise<StartupReport> {
  let sha: string;
  try {
    const commit = await fetchImpl("https://api.github.com/repos/vixttha/AlderVale-Pact-of-Ten/commits/main", {
      headers: {
        accept: "application/vnd.github.sha",
        "user-agent": "aldervale-v002",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!commit.ok) return unavailable();
    sha = (await commit.text()).trim();
    if (!/^[0-9a-f]{40}$/.test(sha)) return unavailable();
  } catch {
    return unavailable();
  }

  const loaded: { path: string; found: boolean; text: string }[] = [];
  for (const path of startupFiles) {
    try {
      const response = await fetchImpl(
        `https://raw.githubusercontent.com/vixttha/AlderVale-Pact-of-Ten/${sha}/${path}`,
        {
          headers: { "user-agent": "aldervale-v002" },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!response.ok) {
        loaded.push({ path, found: false, text: "" });
        continue;
      }
      loaded.push({ path, found: true, text: await response.text() });
    } catch {
      loaded.push({ path, found: false, text: "" });
    }
  }

  const byPath = new Map(loaded.map((file) => [file.path, file.text]));
  const excerpts: StartupReport["excerpts"] = [];
  for (const item of excerptPlan) {
    const text = byPath.get(item.path) ?? "";
    if (text.length === 0) continue;
    const section = extractSection(text, item.heading);
    excerpts.push({
      path: item.path,
      heading: item.heading,
      text: section ?? "Heading not found.",
    });
  }

  const readable = loaded.filter((file) => file.found);
  const mismatch =
    readable.length === 0
      ? {
          leadsSentence: null,
          aiStudioOperatingLink: null,
          privateSourcesChecked: null,
          note: "The main SHA was read, but none of the startup files were. Do not claim there is no mismatch.",
        }
      : scanRoleText(readable);

  let workflowsOnMain: string[] = [];
  try {
    const listing = await fetchImpl(
      `https://api.github.com/repos/vixttha/AlderVale-Pact-of-Ten/contents/.github/workflows?ref=${sha}`,
      {
        headers: {
          accept: "application/vnd.github+json",
          "user-agent": "aldervale-v002",
        },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (listing.ok) {
      const body: unknown = JSON.parse(await listing.text());
      if (Array.isArray(body)) {
        workflowsOnMain = body
          .filter((item): item is { name: string; type: string } => {
            if (typeof item !== "object" || item === null) return false;
            const record = item as { name?: unknown; type?: unknown };
            return record.type === "file" && typeof record.name === "string";
          })
          .map((item) => item.name)
          .sort();
      }
    }
  } catch {
    workflowsOnMain = [];
  }

  return {
    mainSha: sha,
    github: "read",
    files: loaded.map((file) => ({ path: file.path, found: file.found })),
    workflowsOnMain,
    excerpts,
    mismatch,
    workerReceipt: [...workerReceipt],
    notion,
    chooseWork:
      "Milestone fit is unverified until the owner supplies the private milestone in this chat. Do not invent one. In public text, name the source class only.",
  };
}
