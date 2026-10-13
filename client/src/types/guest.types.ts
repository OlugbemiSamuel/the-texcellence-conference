// Guest shapes for the admin frontend.
// Learn: the Guest mirrors one database row as the API returns it.
// UpdateGuestPayload only allows the 5 editable fields - the backend
// rejects id/ticket_number/qr_token/is_sent/timestamps with a 400.

export type AttendanceStatus = "pending" | "yes" | "no";

export interface Guest {
  id: number;
  first_name: string;
  last_name: string;
  // NULL for printed-list guests admitted by name (no email to match on).
  email: string | null;
  phone: string | null;
  attendance_status: AttendanceStatus;
  ticket_number: string | null;
  // Opaque random token (backend-generated). The QR encodes ONLY this.
  qr_token: string | null;
  // 1 once an RSVP email was accepted by SMTP; drives the Sent badge.
  is_sent: number;
  // NULL until accredited at the door; source of truth for the UI badge.
  accredited_at: string | null;
  // Texcellence-registry fields (nullable; our own guests may lack them).
  job_title: string | null;
  company: string | null;
  industry: string | null;
  external_pass_id: string | null;
  // QR ticket emails accepted by SMTP; drives the per-row send counter.
  ticket_sent_count: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateGuestPayload {
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  attendance_status?: AttendanceStatus;
  job_title?: string | null;
  company?: string | null;
  industry?: string | null;
  external_pass_id?: string | null;
}

export interface CsvImportRowError {
  row: number;
  email: string;
  message: string;
}

export interface CsvImportResult {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: CsvImportRowError[];
}
