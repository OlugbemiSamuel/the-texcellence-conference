// Shared auth shapes for the admin frontend.
// Learn: these mirror what the backend sends, not backend internals.
// The frontend never sees passwords or secrets - only token + safe identity.

export interface AuthAdmin {
  email: string;
  role: string;
}

export interface LoginResponse {
  token: string;
}
