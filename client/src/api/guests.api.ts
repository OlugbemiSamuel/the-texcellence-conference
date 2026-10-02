import type { Guest, UpdateGuestPayload } from "../types/guest.types.js";
import { apiFetch } from "./client.js";

// Learn: guests.api owns the guest endpoints used by the dashboard.
// All calls go through apiFetch, so the Bearer token rides along.

export const createGuest = async (payload: {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}): Promise<Guest> => {
  return apiFetch<Guest>("/api/guests", { method: "POST", body: payload });
};

export const listGuests = async (): Promise<Guest[]> => {
  return apiFetch<Guest[]>("/api/guests");
};

export const getGuestById = async (id: number): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}`);
};

export const accreditGuest = async (id: number): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}/accredit`, { method: "POST" });
};

export const searchGuests = async (query: string): Promise<Guest[]> => {
  return apiFetch<Guest[]>(`/api/guests/search?q=${encodeURIComponent(query)}`);
};

export const getGuestByQrToken = async (token: string): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/qr/${encodeURIComponent(token)}`);
};

export const generateGuestTicket = async (id: number): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}/ticket`, { method: "POST" });
};

export const sendRsvp = async (id: number): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}/rsvp`, { method: "POST" });
};

export const updateGuest = async (id: number, patch: UpdateGuestPayload): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}`, {
    method: "PATCH",
    body: patch,
  });
};
