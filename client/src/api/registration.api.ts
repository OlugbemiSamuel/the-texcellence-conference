import type { Guest } from "../types/guest.types.js";
import { apiFetch } from "./client.js";

// Learn: public endpoint, so auth:false sends NO Bearer token.
// Same apiFetch, same {error,message} handling as every other call.

export interface RegistrationPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  attendance_status: "pending";
}

export const submitRegistration = async (payload: RegistrationPayload): Promise<Guest> => {
  return apiFetch<Guest>("/api/registration", {
    method: "POST",
    body: payload,
    auth: false,
  });
};
