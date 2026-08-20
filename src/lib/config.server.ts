import process from "node:process";

export function getServerConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    legacyConfigured: Boolean(
      process.env.LEGACY_PUBLIC_KEY?.trim() && process.env.LEGACY_SECRET_KEY?.trim(),
    ),
    mercadoPagoConfigured: Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()),
    publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:8080",
  };
}
