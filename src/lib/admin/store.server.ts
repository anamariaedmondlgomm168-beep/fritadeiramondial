import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

import type { AdminOrder, AdminStore, AnalyticsEvent, WebhookEntry } from "./types.server";

const STORE_PATH = join(process.cwd(), ".data", "admin-store.json");

const EMPTY_STORE: AdminStore = { orders: [], webhooks: [], analytics: [] };

function ensureStoreFile(): void {
  const dir = dirname(STORE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(STORE_PATH)) {
    writeFileSync(STORE_PATH, JSON.stringify(EMPTY_STORE, null, 2), "utf-8");
  }
}

export function readStore(): AdminStore {
  ensureStoreFile();
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AdminStore>;
    return {
      orders: parsed.orders ?? [],
      webhooks: parsed.webhooks ?? [],
      analytics: parsed.analytics ?? [],
    };
  } catch {
    return { ...EMPTY_STORE };
  }
}

export function writeStore(store: AdminStore): void {
  ensureStoreFile();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
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
  return webhooks;
}
