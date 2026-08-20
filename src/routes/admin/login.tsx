import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Shield } from "lucide-react";
import { useEffect, useState } from "react";

import { adminLogin } from "@/lib/api/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TOKEN_KEY = "mondial_admin_token";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin — Login" }] }),
  component: AdminLoginPage,
});

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getAdminToken()) {
      void navigate({ to: "/admin" });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { token } = await adminLogin({ data: { password } });
      setAdminToken(token);
      await navigate({ to: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10">
            <Shield className="h-7 w-7 text-sky-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Painel Admin</h1>
          <p className="mt-1 text-sm text-neutral-400">Fritadeira Mondial</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-xl"
        >
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Senha de acesso
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a senha admin"
              className="border-neutral-700 bg-neutral-800 pl-10 text-white placeholder:text-neutral-500"
              autoFocus
            />
          </div>

          {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

          <Button
            type="submit"
            disabled={loading || !password}
            className="mt-4 w-full bg-sky-500 hover:bg-sky-600"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-neutral-600">
          <Link to="/" className="hover:text-neutral-400">
            Voltar a loja
          </Link>
        </p>
      </div>
    </div>
  );
}
