import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  CheckCircle,
  Clock,
  Copy,
  DollarSign,
  Eye,
  Loader2,
  LogOut,
  Package,
  Plus,
  RefreshCw,
  Save,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  adminGetAnalytics,
  adminGetDashboard,
  adminGetOrders,
  adminGetWebhooks,
  adminSaveWebhooks,
  adminVerify,
} from "@/lib/api/admin.functions";
import type { AdminOrder, WebhookEntry } from "@/lib/admin/types.server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import { clearAdminToken, getAdminToken } from "./login";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin — Fritadeira Mondial" }] }),
  component: AdminPage,
});

type Tab = "dashboard" | "live" | "pedidos" | "webhooks" | "analytics";

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "live", label: "Live View", icon: Activity },
  { id: "pedidos", label: "Pedidos", icon: Package },
  { id: "webhooks", label: "Webhooks", icon: Bell },
  { id: "analytics", label: "Analises", icon: TrendingUp },
];

const STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  cancelled: "Cancelado",
};

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-500/10 text-amber-600",
  pending: "bg-orange-500/10 text-orange-600",
  approved: "bg-emerald-500/10 text-emerald-600",
  rejected: "bg-rose-500/10 text-rose-600",
  cancelled: "bg-neutral-500/10 text-neutral-600",
};

const STEP_LABEL: Record<string, string> = {
  identification: "Identificacao",
  shipping: "Endereco",
  payment: "Pagamento",
  pix: "PIX",
};

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atras`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atras`;
  return `${Math.floor(hr / 24)}d atras`;
}

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof adminGetDashboard>> | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [analytics, setAnalytics] = useState<Awaited<ReturnType<typeof adminGetAnalytics>> | null>(null);
  const [savingWebhooks, setSavingWebhooks] = useState(false);

  const flash = (m: string) => {
    setMessage(m);
    window.setTimeout(() => setMessage(""), 3000);
  };

  useEffect(() => {
    const t = getAdminToken();
    if (!t) {
      void navigate({ to: "/admin/login" });
      return;
    }
    void adminVerify({ data: { token: t } }).then((r) => {
      if (!r.valid) {
        clearAdminToken();
        void navigate({ to: "/admin/login" });
        return;
      }
      setToken(t);
    });
  }, [navigate]);

  const loadData = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setRefreshing(true);
    try {
      const [dash, ords, wh, an] = await Promise.all([
        adminGetDashboard({ data: { token } }),
        adminGetOrders({ data: { token, status: "all" } }),
        adminGetWebhooks({ data: { token } }),
        adminGetAnalytics({ data: { token } }),
      ]);
      setDashboard(dash);
      setOrders(ords.orders);
      setWebhooks(wh.webhooks);
      setAnalytics(an);
    } catch {
      flash("Erro ao carregar dados.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadData();
    const id = window.setInterval(() => void loadData(true), 15000);
    return () => window.clearInterval(id);
  }, [token, loadData]);

  const handleLogout = () => {
    clearAdminToken();
    void navigate({ to: "/admin/login" });
  };

  const handleSaveWebhooks = async () => {
    if (!token) return;
    setSavingWebhooks(true);
    try {
      const res = await adminSaveWebhooks({ data: { token, webhooks } });
      setWebhooks(res.webhooks);
      flash("Webhooks salvos!");
    } catch {
      flash("Erro ao salvar webhooks.");
    } finally {
      setSavingWebhooks(false);
    }
  };

  const addWebhook = () => {
    setWebhooks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        url: "",
        events: ["venda_pendente", "venda_aprovada"],
        active: true,
        label: "Pushcut",
      },
    ]);
  };

  const updateWebhook = (id: string, patch: Partial<WebhookEntry>) => {
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  const removeWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleEvent = (id: string, event: "venda_pendente" | "venda_aprovada") => {
    setWebhooks((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const has = w.events.includes(event);
        return {
          ...w,
          events: has ? w.events.filter((e) => e !== event) : [...w.events, event],
        };
      }),
    );
  };

  if (!token || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  const stats = dashboard?.stats;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-10 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">Admin Mondial</h1>
            <p className="text-xs text-neutral-500">Painel de vendas e integracoes</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadData()}
              disabled={refreshing}
              className="border-neutral-700 bg-neutral-900"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="border-neutral-700 bg-neutral-900">
              <LogOut className="mr-1 h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                tab === id ? "bg-sky-500/15 text-sky-400" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {message ? (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="rounded-lg bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{message}</div>
        </div>
      ) : null}

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "dashboard" && stats ? (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={DollarSign} label="Receita total" value={formatBRL(stats.revenueTotal)} color="text-emerald-400" />
              <StatCard icon={CheckCircle} label="Vendas aprovadas" value={String(stats.approvedCount)} color="text-sky-400" />
              <StatCard icon={Clock} label="PIX pendentes" value={String(stats.pendingCount)} color="text-orange-400" />
              <StatCard icon={Eye} label="Ao vivo agora" value={String(stats.liveCount)} color="text-violet-400" pulse />
            </div>

            <Card className="border-neutral-800 bg-neutral-900 p-4">
              <h2 className="mb-4 text-sm font-semibold text-neutral-300">Vendas — ultimos 7 dias</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dashboard.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#666" fontSize={12} />
                  <YAxis stroke="#666" fontSize={12} />
                  <Tooltip
                    contentStyle={{ background: "#171717", border: "1px solid #333", borderRadius: 8 }}
                    formatter={(v: number, name: string) =>
                      name === "receita" ? [formatBRL(v * 100), "Receita"] : [v, "Vendas"]
                    }
                  />
                  <Bar dataKey="vendas" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900 p-4">
              <h2 className="mb-3 text-sm font-semibold text-neutral-300">Pedidos recentes</h2>
              <OrdersTable orders={dashboard.recentOrders} compact />
            </Card>
          </div>
        ) : null}

        {tab === "live" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </span>
              <h2 className="text-sm font-semibold">Checkout ao vivo (ultimos 5 min)</h2>
              <Badge variant="outline" className="border-neutral-700 text-neutral-400">
                Atualiza a cada 15s
              </Badge>
            </div>
            {dashboard?.liveOrders.length ? (
              <div className="grid gap-3">
                {dashboard.liveOrders.map((order) => (
                  <Card key={order.id} className="border-neutral-800 bg-neutral-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{order.buyerName || "Visitante"}</div>
                        <div className="mt-0.5 text-xs text-neutral-500">
                          {order.buyerEmail || order.buyerPhone || "Sem contato ainda"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sky-400">{formatBRL(order.amountCents)}</div>
                        <div className="text-xs text-neutral-500">{timeAgo(order.checkoutStepUpdatedAt || order.updatedAt)}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge className={STATUS_COLOR[order.status] ?? ""}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
                      {order.checkoutStep ? (
                        <Badge variant="outline" className="border-neutral-700">
                          {STEP_LABEL[order.checkoutStep] ?? order.checkoutStep}
                        </Badge>
                      ) : null}
                      {order.voltage ? (
                        <Badge variant="outline" className="border-neutral-700">
                          <Zap className="mr-1 h-3 w-3" /> {order.voltage}
                        </Badge>
                      ) : null}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-neutral-800 bg-neutral-900 p-8 text-center text-neutral-500">
                <ShoppingCart className="mx-auto mb-3 h-10 w-10 opacity-40" />
                Nenhum visitante ativo no checkout agora.
              </Card>
            )}
          </div>
        ) : null}

        {tab === "pedidos" ? (
          <Card className="border-neutral-800 bg-neutral-900 p-4">
            <h2 className="mb-4 text-sm font-semibold text-neutral-300">Todos os pedidos ({orders.length})</h2>
            <OrdersTable orders={orders} />
          </Card>
        ) : null}

        {tab === "webhooks" ? (
          <div className="space-y-4">
            <Card className="border-neutral-800 bg-neutral-900 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-neutral-300">Webhooks Pushcut</h2>
                  <p className="mt-1 text-xs text-neutral-500">
                    Cole a URL do webhook Pushcut. Eventos: venda_pendente e venda_aprovada.
                  </p>
                </div>
                <Button size="sm" onClick={addWebhook} className="bg-sky-500 hover:bg-sky-600">
                  <Plus className="mr-1 h-4 w-4" /> Adicionar
                </Button>
              </div>

              {webhooks.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">
                  Nenhum webhook configurado. Adicione a URL do Pushcut para receber notificacoes.
                </p>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((wh) => (
                    <div key={wh.id} className="rounded-xl border border-neutral-800 p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <Input
                          value={wh.label ?? ""}
                          onChange={(e) => updateWebhook(wh.id, { label: e.target.value })}
                          placeholder="Nome (ex: Pushcut iPhone)"
                          className="max-w-xs border-neutral-700 bg-neutral-800"
                        />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={wh.active}
                            onCheckedChange={(v) => updateWebhook(wh.id, { active: v })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeWebhook(wh.id)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        value={wh.url}
                        onChange={(e) => updateWebhook(wh.id, { url: e.target.value })}
                        placeholder="https://api.pushcut.io/..."
                        className="border-neutral-700 bg-neutral-800 font-mono text-sm"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(["venda_pendente", "venda_aprovada"] as const).map((ev) => (
                          <button
                            key={ev}
                            type="button"
                            onClick={() => toggleEvent(wh.id, ev)}
                            className={cn(
                              "rounded-full px-3 py-1 text-xs font-medium transition",
                              wh.events.includes(ev)
                                ? "bg-sky-500/20 text-sky-400"
                                : "bg-neutral-800 text-neutral-500",
                            )}
                          >
                            {ev}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={() => void handleSaveWebhooks()}
                disabled={savingWebhooks}
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
              >
                {savingWebhooks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar webhooks
              </Button>
            </Card>

            <Card className="border-neutral-800 bg-neutral-900 p-4">
              <h3 className="mb-2 text-sm font-semibold text-neutral-300">Payload enviado</h3>
              <pre className="overflow-x-auto rounded-lg bg-neutral-950 p-3 text-xs text-neutral-400">{`{
  "event": "venda_pendente" | "venda_aprovada",
  "timestamp": "2026-08-20T...",
  "orderId": "uuid",
  "paymentId": "legacy-id",
  "status": "pending" | "approved",
  "amountCents": 19990,
  "buyerName": "...",
  "buyerEmail": "...",
  "buyerPhone": "...",
  "product": "Fritadeira Air Fryer Mondial AFON-12L-BI",
  "gateway": "legacy"
}`}</pre>
            </Card>
          </div>
        ) : null}

        {tab === "analytics" && analytics ? (
          <div className="space-y-6">
            <Card className="border-neutral-800 bg-neutral-900 p-4">
              <h2 className="mb-4 text-sm font-semibold text-neutral-300">Funil de conversao</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#666" fontSize={12} />
                  <YAxis type="category" dataKey="step" stroke="#666" fontSize={12} width={90} />
                  <Tooltip contentStyle={{ background: "#171717", border: "1px solid #333", borderRadius: 8 }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {analytics.funnel.map((_, i) => (
                      <Cell key={i} fill={["#38bdf8", "#818cf8", "#f97316", "#34d399"][i] ?? "#666"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {analytics.purchasesByDay.length > 0 ? (
              <Card className="border-neutral-800 bg-neutral-900 p-4">
                <h2 className="mb-4 text-sm font-semibold text-neutral-300">Compras por dia</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analytics.purchasesByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#666" fontSize={11} />
                    <YAxis stroke="#666" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#171717", border: "1px solid #333", borderRadius: 8 }} />
                    <Bar dataKey="total" fill="#34d399" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ) : null}

            <p className="text-xs text-neutral-600">{analytics.totalEvents} eventos registrados</p>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-600">
        <Link to="/" className="hover:text-neutral-400">Voltar a loja</Link>
      </footer>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  pulse,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: string;
  pulse?: boolean;
}) {
  return (
    <Card className="border-neutral-800 bg-neutral-900 p-4">
      <div className="flex items-center justify-between">
        <Icon className={cn("h-5 w-5", color)} />
        {pulse ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-bold">{value}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </Card>
  );
}

function OrdersTable({ orders, compact }: { orders: AdminOrder[]; compact?: boolean }) {
  if (orders.length === 0) {
    return <p className="py-6 text-center text-sm text-neutral-500">Nenhum pedido ainda.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
            <th className="pb-2 pr-3">Cliente</th>
            <th className="pb-2 pr-3">Valor</th>
            <th className="pb-2 pr-3">Status</th>
            {!compact ? <th className="pb-2 pr-3">Etapa</th> : null}
            <th className="pb-2">Quando</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-b border-neutral-800/50">
              <td className="py-2.5 pr-3">
                <div className="font-medium">{o.buyerName || "—"}</div>
                <div className="text-xs text-neutral-500">{o.buyerEmail || o.buyerPhone || o.id.slice(0, 8)}</div>
              </td>
              <td className="py-2.5 pr-3 font-medium">{formatBRL(o.amountCents)}</td>
              <td className="py-2.5 pr-3">
                <Badge className={STATUS_COLOR[o.status] ?? ""}>{STATUS_LABEL[o.status] ?? o.status}</Badge>
              </td>
              {!compact ? (
                <td className="py-2.5 pr-3 text-xs text-neutral-400">
                  {o.checkoutStep ? STEP_LABEL[o.checkoutStep] : "—"}
                </td>
              ) : null}
              <td className="py-2.5 text-xs text-neutral-500">{timeAgo(o.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
