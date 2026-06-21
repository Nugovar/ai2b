// Shared chat-attachment limits + helpers. Used by the client (ChatBody),
// the signed-upload route, and the base64 fallback route so all three agree.
export const MAX_BYTES = 20 * 1024 * 1024; // 20MB per file
export const MAX_FILES = 4; // per message

export const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
] as const;

// `accept` attribute string for the <input type="file">.
export const ACCEPT_ATTR = ALLOWED_TYPES.join(",");

export function isAllowedType(type: string): boolean {
  return (ALLOWED_TYPES as readonly string[]).includes(type);
}

export function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

// Human-readable size, e.g. "20MB".
export const MAX_MB = Math.round(MAX_BYTES / (1024 * 1024));
