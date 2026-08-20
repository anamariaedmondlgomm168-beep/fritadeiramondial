import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import type { FacebookPixelEntry, PixelConfig, WebhookEntry } from "./types.server";

const CONFIG_PATH = join(process.cwd(), ".data", "admin-config.json");
const UPSTASH_KEY = "mondial:admin-config";

interface AdminConfigFile {
  webhooks: WebhookEntry[];
  pixelConfig: PixelConfig;
  updatedAt?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __mondialAdminConfig: AdminConfigFile | undefined;
}

const EMPTY_PIXEL_CONFIG: PixelConfig = { facebookPixels: [] };

const EMPTY_CONFIG: AdminConfigFile = {
  webhooks: [],
  pixelConfig: EMPTY_PIXEL_CONFIG,
};

function cloneConfig(config: AdminConfigFile): AdminConfigFile {
  return structuredClone(config);
}

function normalizeConfig(raw?: Partial<AdminConfigFile>): AdminConfigFile {
  return {
    webhooks: Array.isArray(raw?.webhooks) ? raw.webhooks : [],
    pixelConfig: raw?.pixelConfig ?? EMPTY_PIXEL_CONFIG,
    updatedAt: raw?.updatedAt,
  };
}

function readConfigFile(): AdminConfigFile | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const parsed = JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Partial<AdminConfigFile>;
    return normalizeConfig(parsed);
  } catch {
    return null;
  }
}

function writeConfigFile(config: AdminConfigFile): void {
  try {
    const dir = dirname(CONFIG_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeConfigMemory(config);
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          ...config,
          updatedAt: new Date().toISOString(),
        } satisfies AdminConfigFile,
        null,
        2,
      ),
      "utf-8",
    );
  } catch {
    writeConfigMemory(config);
  }
}

function readConfigMemory(): AdminConfigFile {
  if (!globalThis.__mondialAdminConfig) {
    globalThis.__mondialAdminConfig = cloneConfig(readConfigFile() ?? EMPTY_CONFIG);
  }
  return cloneConfig(globalThis.__mondialAdminConfig);
}

function writeConfigMemory(config: AdminConfigFile): void {
  globalThis.__mondialAdminConfig = cloneConfig({
    ...config,
    updatedAt: new Date().toISOString(),
  });
}

function getStoredConfigSync(): AdminConfigFile {
  const file = readConfigFile();
  if (file) {
    writeConfigMemory(file);
    return cloneConfig(file);
  }
  return readConfigMemory();
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

function parseEnvPixels(): FacebookPixelEntry[] {
  const entries: FacebookPixelEntry[] = [];

  const pixelId = process.env.FACEBOOK_PIXEL_ID?.trim();
  const accessToken = process.env.FACEBOOK_CAPI_TOKEN?.trim();
  if (pixelId && accessToken) {
    entries.push({
      id: "env-facebook",
      pixelId,
      accessToken,
      active: true,
      label: "Facebook (env)",
    });
  }

  const raw = process.env.ADMIN_FACEBOOK_PIXELS_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (!item || typeof item !== "object") continue;
          const row = item as Partial<FacebookPixelEntry>;
          const id = typeof row.pixelId === "string" ? row.pixelId.trim() : "";
          const token = typeof row.accessToken === "string" ? row.accessToken.trim() : "";
          if (!id || !token) continue;
          entries.push({
            id: typeof row.id === "string" ? row.id : randomUUID(),
            pixelId: id,
            accessToken: token,
            active: row.active !== false,
            label: typeof row.label === "string" ? row.label : "Facebook (env)",
          });
        }
      }
    } catch (err) {
      console.error("Invalid ADMIN_FACEBOOK_PIXELS_JSON:", err);
    }
  }

  return entries;
}

async function upstashGetConfig(): Promise<AdminConfigFile | null> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return null;

  try {
    const response = await fetch(`${baseUrl}/get/${UPSTASH_KEY}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { result?: string | null };
    if (!body.result) return null;
    return normalizeConfig(JSON.parse(body.result) as Partial<AdminConfigFile>);
  } catch (err) {
    console.error("Upstash read config failed:", err);
    return null;
  }
}

async function upstashSaveConfig(config: AdminConfigFile): Promise<boolean> {
  const baseUrl = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!baseUrl || !token) return false;

  try {
    const payload = JSON.stringify({
      ...config,
      updatedAt: new Date().toISOString(),
    } satisfies AdminConfigFile);

    const response = await fetch(
      `${baseUrl}/set/${UPSTASH_KEY}/${encodeURIComponent(payload)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.ok;
  } catch (err) {
    console.error("Upstash save config failed:", err);
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

function mergePixels(...groups: FacebookPixelEntry[][]): FacebookPixelEntry[] {
  const byPixelId = new Map<string, FacebookPixelEntry>();
  for (const group of groups) {
    for (const pixel of group) {
      const pixelId = pixel.pixelId.trim();
      if (!pixelId) continue;
      byPixelId.set(pixelId, { ...pixel, pixelId });
    }
  }
  return Array.from(byPixelId.values());
}

export function getStoredWebhooksSync(): WebhookEntry[] {
  return getStoredConfigSync().webhooks;
}

export function getStoredPixelConfigSync(): PixelConfig {
  return getStoredConfigSync().pixelConfig;
}

export async function getEffectiveWebhooks(): Promise<WebhookEntry[]> {
  const upstash = await upstashGetConfig();
  return mergeWebhooks(
    parseEnvWebhooks(),
    upstash?.webhooks ?? [],
    getStoredWebhooksSync(),
  ).filter((webhook) => webhook.active && webhook.url.trim());
}

export async function getEffectivePixelConfig(): Promise<PixelConfig> {
  const upstash = await upstashGetConfig();
  return {
    facebookPixels: mergePixels(
      parseEnvPixels(),
      upstash?.pixelConfig.facebookPixels ?? [],
      getStoredPixelConfigSync().facebookPixels,
    ),
  };
}

export async function getActiveFacebookPixels(): Promise<FacebookPixelEntry[]> {
  const config = await getEffectivePixelConfig();
  return config.facebookPixels.filter((pixel) => pixel.active && pixel.pixelId.trim());
}

export function getWebhooksForAdmin(): WebhookEntry[] {
  const stored = getStoredWebhooksSync();
  if (stored.length > 0) return stored;
  return parseEnvWebhooks();
}

export function getPixelConfigForAdmin(): PixelConfig {
  const stored = getStoredPixelConfigSync();
  if (stored.facebookPixels.length > 0) return stored;
  return { facebookPixels: parseEnvPixels() };
}

async function persistConfig(config: AdminConfigFile): Promise<("file" | "memory" | "upstash")[]> {
  const persistedTo: ("file" | "memory" | "upstash")[] = [];
  writeConfigFile(config);
  persistedTo.push("memory");
  if (existsSync(CONFIG_PATH)) persistedTo.push("file");
  if (await upstashSaveConfig(config)) persistedTo.push("upstash");
  return persistedTo;
}

export async function saveWebhooksConfig(webhooks: WebhookEntry[]): Promise<{
  webhooks: WebhookEntry[];
  persistedTo: ("file" | "memory" | "upstash")[];
}> {
  const config = getStoredConfigSync();
  config.webhooks = cloneConfig({ ...config, webhooks }).webhooks;
  const persistedTo = await persistConfig(config);
  return { webhooks: config.webhooks, persistedTo };
}

export async function savePixelConfigPersistent(pixelConfig: PixelConfig): Promise<{
  pixelConfig: PixelConfig;
  persistedTo: ("file" | "memory" | "upstash")[];
}> {
  const config = getStoredConfigSync();
  config.pixelConfig = cloneConfig({ ...config, pixelConfig }).pixelConfig;
  const persistedTo = await persistConfig(config);
  return { pixelConfig: config.pixelConfig, persistedTo };
}

export function getAdminPersistenceHint(): string {
  if (process.env.UPSTASH_REDIS_REST_URL?.trim()) {
    return "Persistencia via Upstash Redis.";
  }
  if (
    process.env.PUSHCUT_WEBHOOK_URL?.trim() ||
    process.env.ADMIN_WEBHOOKS_JSON?.trim() ||
    process.env.FACEBOOK_PIXEL_ID?.trim() ||
    process.env.ADMIN_FACEBOOK_PIXELS_JSON?.trim()
  ) {
    return "Persistencia parcial via variaveis de ambiente.";
  }
  return "Em producao, configure UPSTASH_REDIS_REST_URL + TOKEN nos secrets do Lovable.";
}

export function getWebhookPersistenceHint(): string {
  return getAdminPersistenceHint();
}
