# Texcellence → Accreditation: Guest Ingest API

Purpose: your registration system pushes each attendee to our
accreditation backend, so our door staff can find and accredit them.
One endpoint. No dashboard login needed on your side.

## Connection details (filled by accreditation team)

- Base URL: `https://texcellence.accredit.vip`
- Endpoint: `POST /api/external/guests`
- Auth: request header `x-api-key: <KEY>`
  (We generate the key and send it to you privately. Keep it secret like
  a password. It can be revoked/replaced without affecting anything else.)

## Request

`Content-Type: application/json`

| Field              | Required | Notes                                            |
|--------------------|----------|--------------------------------------------------|
| `first_name`       | yes      | Trimmed; must not be empty.                      |
| `last_name`        | yes      | Trimmed; must not be empty.                      |
| `email`            | yes      | Trimmed + lowercased; must look like an email.   |
| `phone`            | no       | Empty string = stored as no phone.               |
| `job_title`        | no       | Empty string = stored as none.                   |
| `company`          | no       | Empty string = stored as none.                   |
| `external_pass_id` | no       | Your pass ID, e.g. `TXC26-966674`. Must be unique. |

Unknown fields are ignored. Protected fields (`ticket_number`, `qr_token`,
`accredited_at`) can never be set or changed through this endpoint.

## Matching rule (important)

- **Email is the identity.** Unknown email → new guest created (`201`).
- Known email → that guest is **updated** (`200`), never duplicated.
- Their attendance is set to attending (`yes`) in both cases.
- Their ticket, QR code and accreditation (if any) are never touched.
- Always send the **full** record: fields you omit (e.g. `phone`) are
  cleared to empty, not left as-is. Never send partial updates.

## Responses

- `201` new guest created / `200` existing guest updated — body is the
  guest record (`id`, names, `email`, `ticket_number`, `external_pass_id`,
  ...).
- `400` validation failed (`{ "error": "...", "message": "..." }`) — fix
  the row and resend.
- `401` missing/wrong API key.
- `409` the pass ID belongs to a different email — resolve on your side
  (merge or reissue) and resend.

## Example

```bash
curl -X POST https://texcellence.accredit.vip/api/external/guests \
  -H "Content-Type: application/json" \
  -H "x-api-key: <KEY>" \
  -d '{
    "first_name": "John",
    "last_name": "Olori",
    "email": "john.olori@firstbankgroup.com",
    "phone": "08012345678",
    "job_title": "Technical Delivery Manager",
    "company": "First Bank",
    "external_pass_id": "TXC26-553856"
  }'
```

## Operating agreement

1. Send each registration **once, at registration time** (plus retries on
   network failure — repeats are safe: same email just updates).
2. If a guest's details change on your side, resend the same payload —
   it updates in place.
3. If a pass ID must move to a different email, tell us first — the API
   will refuse it (409) rather than guess.
4. Accreditation happens on our side and is final for the event day.
   One guest = one accreditation; repeats are rejected, never duplicated.
