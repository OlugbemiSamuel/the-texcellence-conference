// Guest shapes for the admin frontend.
// Learn: the Guest mirrors one database row as the API returns it.
// UpdateGuestPayload only allows the 5 editable fields - the backend
// rejects id/ticket_number/qr_token/is_sent/timestamps with a 400.

export type AttendanceStatus = "pending" | "yes" | "no";

export interface Guest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  attendance_status: AttendanceStatus;
  ticket_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateGuestPayload {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  attendance_status?: AttendanceStatus;
}
