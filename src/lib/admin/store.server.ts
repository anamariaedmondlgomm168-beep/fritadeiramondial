import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import type {
  AdminOrder,
  AdminStore,
  AnalyticsEvent,
  FacebookPixelEntry,
  PixelConfig,
  WebhookEntry,
} from "./types.server";
import { getStoredWebhooksSync, saveWebhooksConfig } from "./config.server";

const STORE_PATH = join(process.cwd(), ".data", "admin-store.json");

const EMPTY_PIXEL_CONFIG: PixelConfig = { facebookPixels: [] };

const EMPTY_STORE: AdminStore = {
  orders: [],
  webhooks: [],
  analytics: [],
  pixelConfig: EMPTY_PIXEL_CONFIG,
};

let memoryStore: AdminStore | null = null;
let useMemoryStore = false;

function cloneStore(store: AdminStore): AdminStore {
  return structuredClone(store);
}

function ensureStoreFile(): void {
  if (useMemoryStore) return;
  try {
    const dir = dirname(STORE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(STORE_PATH)) {
      writeFileSync(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf-8");
    }
  } catch {
    useMemoryStore = true;
    if (!memoryStore) memoryStore = cloneStore(EMPTY_STORE);
  }
}

export function readStore(): AdminStore {
  ensureStoreFile();
  if (useMemoryStore) {
    return cloneStore(memoryStore ?? EMPTY_STORE);
  }
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AdminStore>;
    return {
      orders: parsed.orders ?? [],
      webhooks: parsed.webhooks ?? [],
      analytics: parsed.analytics ?? [],
      pixelConfig: parsed.pixelConfig ?? EMPTY_PIXEL_CONFIG,
    };
  } catch {
    useMemoryStore = true;
    if (!memoryStore) memoryStore = cloneStore(EMPTY_STORE);
    return cloneStore(memoryStore);
  }
}

export function writeStore(store: AdminStore): void {
  ensureStoreFile();
  if (useMemoryStore) {
    memoryStore = cloneStore(store);
    return;
  }
  try {
    writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    useMemoryStore = true;
    memoryStore = cloneStore(store);
  }
}

export function mutateStore(mutator: (store: AdminStore) => void): AdminStore {
  const store = readStore();
  mutator(store);
  writeStore(store);
  return store;
}

export function upsertOrder(order: AdminOrder): AdminOrder {
  mutateStore((store) => {
    const idx = store.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) store.orders[idx] = order;
    else store.orders.unshift(order);
  });
  return order;
}

export function findOrderByPaymentId(paymentId: string): AdminOrder | undefined {
  return readStore().orders.find((o) => o.paymentId === paymentId);
}

export function findOrderById(id: string): AdminOrder | undefined {
  return readStore().orders.find((o) => o.id === id);
}

export function updateOrderByPaymentId(
  paymentId: string,
  patch: Partial<AdminOrder>,
): AdminOrder | undefined {
  let updated: AdminOrder | undefined;
  mutateStore((store) => {
    const idx = store.orders.findIndex((o) => o.paymentId === paymentId);
    if (idx < 0) return;
    updated = {
      ...store.orders[idx],
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    store.orders[idx] = updated;
  });
  return updated;
}

export function trackAnalyticsEvent(
  event: Omit<AnalyticsEvent, "id" | "createdAt">,
): AnalyticsEvent {
  const row: AnalyticsEvent = {
    ...event,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  mutateStore((store) => {
    store.analytics.unshift(row);
    if (store.analytics.length > 5000) {
      store.analytics = store.analytics.slice(0, 5000);
    }
  });
  return row;
}

export function saveWebhooks(webhooks: WebhookEntry[]): WebhookEntry[] {
  mutateStore((store) => {
    store.webhooks = webhooks;
  });
  void saveWebhooksConfig(webhooks);
  return webhooks;
}

export function getWebhooks(): WebhookEntry[] {
  const stored = getStoredWebhooksSync();
  if (stored.length > 0) return stored;
  return readStore().webhooks;
}

export function getPixelConfig(): PixelConfig {
  return readStore().pixelConfig;
}

export function savePixelConfig(pixelConfig: PixelConfig): PixelConfig {
  mutateStore((store) => {
    store.pixelConfig = pixelConfig;
  });
  return pixelConfig;
}

export function getActiveFacebookPixels(): FacebookPixelEntry[] {
  return getPixelConfig().facebookPixels.filter(
    (p) => p.active && p.pixelId.trim(),
  );
}
