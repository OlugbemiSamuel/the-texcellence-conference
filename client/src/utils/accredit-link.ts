// Accreditation deep-link helpers. Ticket QR codes encode a URL like
// <origin>/#/accredit?token=<qr-token> so a normal phone camera opens the
// accreditation desk instead of searching the raw token text.
// The token itself stays opaque: it is only ever an identifier.

const PENDING_TOKEN_KEY = "texcellence.pendingAccreditToken";

const QR_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

// Browser's own origin + path, so one build works on localhost and in
// production with no hard-coded domain. Trailing slash normalised so the
// link never gains a double slash.
export const buildAccreditUrl = (qrToken: string): string => {
  const base = `${window.location.origin}${window.location.pathname.replace(/\/?$/, "/")}`;
  return `${base}#/accredit?token=${encodeURIComponent(qrToken)}`;
};

// Accepts either the new deep-link URL or a legacy raw token (older
// printed tickets still scan fine). Returns "" when nothing usable.
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

// Reads ?token= from the current "#/accredit?token=..." hash.
export const readAccreditTokenFromHash = (): string => {
  const hash = window.location.hash;
  const qIndex = hash.indexOf("?");
  if (qIndex < 0) return "";
  const params = new URLSearchParams(hash.slice(qIndex + 1));
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
