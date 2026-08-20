import { createHmac, timingSafeEqual } from "node:crypto";

const SECRET = process.env.ADMIN_SECRET?.trim() || "mondial-admin-secret";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD?.trim() || "admin123";
}

export function createAdminToken(password: string): string {
  return createHmac("sha256", SECRET).update(password).digest("hex");
}

export function verifyAdminToken(token: string | undefined): boolean {
  if (!token?.trim()) return false;
  const expected = createAdminToken(getAdminPassword());
  try {
    const a = Buffer.from(token.trim());
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function assertAdmin(token: string | undefined): void {
  if (!verifyAdminToken(token)) {
    throw new Error("Nao autorizado.");
  }
}
