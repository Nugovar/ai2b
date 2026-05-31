// Demo-grade admin gate. NOT full auth - a single shared password in the
// ADMIN_PASSWORD env var.
//
// Security posture:
// - PRODUCTION: always fail-closed. The panel is treated as protected, and if
//   ADMIN_PASSWORD is somehow unset, access is DENIED (never open). There is no
//   bypass path in a deployed build.
// - DEVELOPMENT: convenience - if ADMIN_PASSWORD is unset locally, the panel is
//   open (with a visible "unprotected" banner). Setting it enables the gate.

const isProd = process.env.NODE_ENV === "production";

export function isAdminProtected(): boolean {
  // In production the panel is always considered protected (banner never shows).
  if (isProd) return true;
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function isAdminAuthorized(key: string | undefined | null): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) {
    // No password configured: open in dev only; LOCKED in production.
    return !isProd;
  }
  return typeof key === "string" && key === pw;
}
