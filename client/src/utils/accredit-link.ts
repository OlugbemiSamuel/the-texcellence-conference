// Accreditation deep-link helpers. Ticket QR codes encode a URL like
// <origin>/accredit?token=<qr-token> so a normal phone camera opens the
// accreditation desk instead of searching the raw token text.
// The token itself stays opaque: it is only ever an identifier.

// import type { Guest } from "../types/guest.types.js";

const PENDING_TOKEN_KEY = "texcellence.pendingAccreditToken";

const QR_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

// Browser's own origin, so one build works on localhost and in
// production with no hard-coded domain.
export const buildAccreditUrl = (qrToken: string): string => {
  const base = window.location.origin;
  return `${base}/accredit?token=${encodeURIComponent(qrToken)}`;
};

// Accepts either the new deep-link URL, a legacy "#/accredit?token=" URL
// from older printed tickets, or a raw token. Returns "" when unusable.
export const extractQrToken = (value: string): string => {
  const text = value.trim();
  if (text === "") return "";
  const marker = "token=";
  const at = text.indexOf(marker);
  if (at >= 0) {
    const raw = text.slice(at + marker.length).split(/[&#\s]/, 1)[0];
    try {
      return decodeURIComponent(raw).trim();
    } catch {
      return raw.trim();
    }
  }
  return text;
};

export const isPlausibleQrToken = (token: string): boolean => {
  return QR_TOKEN_PATTERN.test(token);
};

// Reads ?token= from the current "/accredit?token=..." location.
export const readAccreditTokenFromLocation = (): string => {
  const params = new URLSearchParams(window.location.search);
  return (params.get("token") ?? "").trim();
};

// Remembers a deep-link token across the accreditation login screen so
// an unauthenticated phone still lands on its guest after signing in.
// sessionStorage (per-tab) is used deliberately: the token is sensitive
// enough not to linger in localStorage, and staff share devices.
export const stashPendingAccreditToken = (token: string): void => {
  if (token) sessionStorage.setItem(PENDING_TOKEN_KEY, token);
};

export const takePendingAccreditToken = (): string => {
  const token = sessionStorage.getItem(PENDING_TOKEN_KEY) ?? "";
  sessionStorage.removeItem(PENDING_TOKEN_KEY);
  return token;
};
