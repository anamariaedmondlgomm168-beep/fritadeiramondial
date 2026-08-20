import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import type { WebhookEntry } from "./types.server";

const CONFIG_PATH = join(process.cwd(), ".data", "admin-config.json");
const UPSTASH_KEY = "mondial:webhooks";

interface AdminConfigFile {
  webhooks: WebhookEntry[];
  updatedAt?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __mondialAdminConfig: AdminConfigFile | undefined;
}

const EMPTY_CONFIG: AdminConfigFile = { webhooks: [] };

function cloneWebhooks(webhooks: WebhookEntry[]): WebhookEntry[] {
  return structuredClone(webhooks);
}

function readConfigFile(): AdminConfigFile | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Partial<AdminConfigFile>;
    return {
      webhooks: Array.isArray(parsed.webhooks) ? parsed.webhooks : [],
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function writeConfigFile(webhooks: WebhookEntry[]): void {
  try {
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeConfigMemory(webhooks);
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          webhooks,
          updatedAt: new Date().toISOString(),
        } satisfies AdminConfigFile,
        null,
        2,
      ),
      "utf-8",
    );
  } catch {
    writeConfigMemory(webhooks);
  }
}

function readConfigMemory(): AdminConfigFile {
  if (!globalThis.__mondialAdminConfig) {
    const fromFile = readConfigFile();
    globalThis.__mondialAdminConfig = {
      webhooks: cloneWebhooks(fromFile?.webhooks ?? EMPTY_CONFIG.webhooks),
      updatedAt: fromFile?.updatedAt,
    };
  }
  return {
    webhooks: cloneWebhooks(globalThis.__mondialAdminConfig.webhooks),
    updatedAt: globalThis.__mondialAdminConfig.updatedAt,
  };
}

function writeConfigMemory(webhooks: WebhookEntry[]): void {
  globalThis.__mondialAdminConfig = {
    webhooks: cloneWebhooks(webhooks),
    updatedAt: new Date().toISOString(),
  };
}

function parseEnvWebhooks(): WebhookEntry[] {
  const entries: WebhookEntry[] = [];

  const pushcutUrl = process.env.PUSHCUT_WEBHOOK_URL?.trim();
  if (pushcutUrl) {
    entries.push({
      id: "env-pushcut",
      url: pushcutUrl,
      events: ["venda_pendente", "venda_aprovada"],
      active: true,
      label: "Pushcut (env)",
    });
  }

  const raw = process.env.ADMIN_WEBHOOKS_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const row = item as Partial<WebhookEntry>;
          const url = typeof row.url === "string" ? row.url.trim() : "";
          if (!url) continue;
          const events = Array.isArray(row.events)
            ? row.events.filter(
                (event): event is WebhookEntry["events"][number] =>
                  event === "venda_pendente" || event === "venda_aprovada",
              )
            : ["venda_pendente", "venda_aprovada"];
          entries.push({
            id: typeof row.id === "string" ? row.id : randomUUID(),
            url,
            events: events.length > 0 ? events : ["venda_pendente", "venda_aprovada"],
            active: row.active !== false,
            label: typeof row.label === "string" ? row.label : "Webhook (env)",
          });
        }
      }
    } catch (err) {
      console.error("Invalid ADMIN_WEBHOOKS_JSON:", err);
    }
  }

  return entries;
}

async function upstashGetWebhooks(): Promise<WebhookEntry[] | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return false;

  try {
    const response = await fetch(`${baseUrl}/get/${UPSTASH_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { result?: string | null };
    if (!body.result) return null;
    const parsed = JSON.parse(body.result) as Partial<AdminConfigFile>;
    return Array.isArray(parsed.webhooks) ? parsed.webhooks : [];
  } catch (err) {
    console.error("Upstash read webhooks failed:", err);
    return null;
  }
}

async function upstashSaveWebhooks(webhooks: WebhookEntry[]): Promise<boolean> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  try {
    const payload = JSON.stringify({
      webhooks,
      updatedAt: new Date().toISOString(),
    } satisfies AdminConfigFile);

    const response = await fetch(
      `${baseUrl}/set/${UPSTASH_KEY}/${encodeURIComponent(payload)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.ok;
  } catch (err) {
    console.error("Upstash save webhooks failed:", err);
    return false;
  }
}

function mergeWebhooks(...groups: WebhookEntry[][]): WebhookEntry[] {
  const byUrl = new Map<string, WebhookEntry>();
  for (const group of groups) {
    for (const webhook of group) {
      const url = webhook.url.trim();
      if (!url) continue;
      byUrl.set(url, { ...webhook, url });
    }
  }
  return Array.from(byUrl.values());
}

export function getStoredWebhooksSync(): WebhookEntry[] {
  const file = readConfigFile();
  if (file) {
    writeConfigMemory(file.webhooks);
    return cloneWebhooks(file.webhooks);
  }
  return readConfigMemory().webhooks;
}

export async function getEffectiveWebhooks(): Promise<WebhookEntry[]> {
  const envWebhooks = parseEnvWebhooks();
  const upstashWebhooks = await upstashGetWebhooks();
  const storedWebhooks = getStoredWebhooksSync();

  return mergeWebhooks(envWebhooks, upstashWebhooks ?? [], storedWebhooks).filter(
    (webhook) => webhook.active && webhook.url.trim(),
  );
}

export async function saveWebhooksConfig(webhooks: WebhookEntry[]): Promise<{
  webhooks: WebhookEntry[];
  persistedTo: ("file" | "memory" | "upstash")[];
}> {
  const normalized = cloneWebhooks(webhooks);
  const persistedTo: ("file" | "memory" | "upstash")[] = [];

  writeConfigFile(normalized);
  persistedTo.push("memory");
  if (existsSync(CONFIG_PATH)) persistedTo.push("file");

  if (await upstashSaveWebhooks(normalized)) {
    persistedTo.push("upstash");
  }

  return { webhooks: normalized, persistedTo };
}

export function getWebhookPersistenceHint(): string {
  if (process.env.UPSTASH_REDIS_REST_URL?.trim()) {
    return "Persistencia via Upstash Redis.";
  }
  if (process.env.ADMIN_WEBHOOKS_JSON?.trim() || process.env.PUSHCUT_WEBHOOK_URL?.trim()) {
    return "Persistencia via variaveis de ambiente.";
  }
  return "Em producao, configure UPSTASH_REDIS_REST_URL + TOKEN ou PUSHCUT_WEBHOOK_URL nos secrets.";
}
