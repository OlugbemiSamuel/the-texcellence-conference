import type { Guest, UpdateGuestPayload } from "../types/guest.types.js";
import { apiFetch } from "./client.js";

// Learn: guests.api owns the guest endpoints used by the dashboard.
// All calls go through apiFetch, so the Bearer token rides along.

export const listGuests = async (): Promise<Guest[]> => {
  return apiFetch<Guest[]>("/api/guests");
};

export const getGuestById = async (id: number): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}`);
};

export const accreditGuest = async (id: number): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}/accredit`, { method: "POST" });
};

export const generateGuestTicket = async (id: number): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}/ticket`, { method: "POST" });
};

export const updateGuest = async (id: number, patch: UpdateGuestPayload): Promise<Guest> => {
  return apiFetch<Guest>(`/api/guests/${id}`, {
    method: "PATCH",
    body: patch,
  });
};
