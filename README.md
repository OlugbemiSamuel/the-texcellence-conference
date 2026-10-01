so this is evrything

````
A web-based event registration, guest management, QR-code, email invitation, and accreditation system for **The Texcellence Conference**.

---

## 1. Event Information

- **Event:** The Texcellence Conference
- **Theme:** Accelerating Africa's Digital Future
- **Date:** 13 October 2026
- **Venue:** Landmark Event Centre

---

## 2. Project Overview

The Texcellence Conference Platform is an event website and management system with three main areas:

1. Public Event Website
2. Admin Dashboard
3. Accreditation Page

The system allows guests to learn about the event and register their attendance, allows administrators to manage guests and send registration invitations, and allows event staff to search for or scan guests and accredit them.

---

## 3. Main System Flow

```text
                    EVENT WEBSITE
                         |
             +-----------+-----------+
             |                       |
             v                       v
        PUBLIC AREA              ADMIN AREA
             |                       |
             v                       v
       Registration             Guest Management
             |                       |
             v                       v
       Guest Database          Email / QR Management
             |                       |
             +-----------+-----------+
                         |
                         v
                  ACCREDITATION
                         |
              +----------+----------+
              |                     |
          Search Guest           Scan QR
              |                     |
              +----------+----------+
                         |
                         v
                  Guest Details
                         |
                  Not Accredited?
                         |
                         v
                    [ ACCREDIT ]
                         |
                         v
                     ACCREDITED
````

---

# 4. Public Event Website

The public website provides information about the conference and gives guests access to the registration process.

The public website should contain:

- Event information
- Event date
- Venue
- Conference theme
- Registration / RSVP entry point
- Registration form

The public website does not require a guest to already exist in the admin dashboard in order to access the general registration page.

---

# 5. Guest Registration

The registration process begins with an attendance question.

```

```

```
Guest visits registration page
        |
        v
"Will you be attending?"
        |
       / \
      /   \
    YES    NO
     |      |
     v      v
Registration  Appropriate
   form       response
     |
     v
 Submit
     |
     v
Guest saved/updated
```

The exact fields of the registration form should be based on the approved event requirements and the previous event system.

Potential guest information includes:

- First name
- Last name
- Email
- Phone number
- Attendance status

Additional fields should only be added when required by the event.

---

# 6. Admin Guest Management

Administrators can manage guests from the dashboard.

The dashboard should allow administrators to:

- View guests
- Search guests
- Add a guest
- View guest details
- Send RSVP/registration email
- View QR information
- Manage guest registration information

A guest added manually by an administrator can later receive an email containing the normal event registration link.

The registration link is the same general registration flow used by other guests unless a future requirement changes this behavior.

---

# 7. Email Invitations

The application will use SMTP for email delivery.

The basic flow is:

```

```

```
Admin creates guest
        |
        v
Guest appears in dashboard
        |
        v
Admin sends RSVP email
        |
        v
Email contains event registration link
        |
        v
Guest opens registration page
        |
        v
Guest completes registration
```

The exact email template will be finalized during implementation.

The application should support configuration through environment variables rather than hardcoding SMTP credentials.

---

# 8. QR Code

A QR code is associated with a registered guest.

The QR code is used during the accreditation process.

The QR should identify the guest through a safe internal identifier/token.

The QR must not expose sensitive guest information directly.

The admin dashboard should provide access to the guest's QR code.

The exact QR display, download, and email behavior will be implemented according to the final event requirements.

---

# 9. Accreditation

The accreditation system is used by event staff at the event.

The accreditation page should provide two methods of finding a guest:

1.  Search
2.  QR scanning

---

## 9.1 Guest Search

Staff can search for a guest using available guest information such as:

- Name
- Email
- Phone

The system displays the matching guest's information.

Example:

```

```

```
John Doe
john@example.com
08012345678

Status: NOT ACCREDITED

[ ACCREDIT ]
```

---

## 9.2 QR Scanning

Staff can scan the guest's QR code.

The system finds the associated guest and displays the guest information.

```

```

```
QR Scan
   |
   v
Find Guest
   |
   v
Display Guest
   |
   v
Check Accreditation Status
```

---

# 10. Accreditation Rules

Accreditation requires explicit confirmation.

Scanning or searching for a guest does NOT automatically accredit the guest.

The staff member must press the:

```

```

```
[ ACCREDIT ]
```

button.

After accreditation:

```

```

```
Status: ACCREDITED
Accredited at: <timestamp>

[ ACCREDIT ]  <-- disabled
```

If the same guest is searched or scanned again:

- The guest remains accredited.
- The accreditation timestamp is displayed.
- The Accredit button is disabled.
- A second accreditation should not be created.

The backend must enforce this rule. The frontend button being disabled is not sufficient protection.

---

# 11. Authentication

Administrative functions must be protected by authentication.

The application will have an admin login.

Accreditation access will also be protected according to the final authentication/role requirements.

The exact role structure is currently:

```

```

```
TBD
```

A decision will be made regarding whether the project requires:

- One administrator role
- Multiple event-specific roles
- A Super Admin
- A central multi-event administration system

This decision must not unnecessarily complicate the first version.

---

# 12. Database

The initial project is intended to use SQLite unless the deployment requirements require a different database.

The database will contain the minimum entities required by the application.

Initial conceptual model:

```

```

```
User
 |
 | manages
 v
Guest
 |
 | has
 v
Accreditation
```

---

## Guest

Conceptually:

```

```

```
Guest
-----
id
first_name
last_name
email
phone
attendance_status
ticket_number
qr_token
is_sent
created_at
updated_at
```

The exact final fields will be determined before implementation of the database schema.

---

## Accreditation

Conceptually:

```

```

```
Accreditation
-------------
id
guest_id
accredited_at
created_at
```

A guest should not be accredited more than once for the same event.

---

## User

Conceptually:

```

```

```
User
----
id
name
email
password_hash
role
created_at
updated_at
```

The role structure remains subject to final confirmation.

---

# 13. Backend Architecture

The backend should use a simple layered structure.

```

```

```
Route
  |
  v
Controller
  |
  v
Service
  |
  v
Repository / Database
```

Responsibilities:

### Route

Defines the HTTP endpoint.

### Controller

Receives the request and returns the response.

### Service

Contains application/business logic.

### Repository

Handles database operations.

This separation should be used where it provides clear value without creating unnecessary complexity.

---

# 14. Frontend Architecture

The frontend will be built using React.

The application should be separated into clear areas:

```

```

```
Public
Admin
Accreditation
```

Components should be created when they provide useful reuse or improve readability.

The project should avoid unnecessary abstraction.

---

# 15. API

The API will provide communication between the React frontend and the Express backend.

Initial endpoint categories:

```

```

```
Authentication
    |
    +-- Login
    +-- Logout

Guests
    |
    +-- Create
    +-- List
    +-- Get
    +-- Update

Registration
    |
    +-- Submit RSVP

Email
    |
    +-- Send RSVP email

QR
    |
    +-- Get guest QR

Accreditation
    |
    +-- Search guest
    +-- Find guest from QR
    +-- Accredit guest
```

Exact endpoint names should be decided during API implementation.

---

# 16. Security Requirements

The application must:

- Hash passwords.
- Never store plain-text admin passwords.
- Keep SMTP credentials in environment variables.
- Keep database credentials/configuration outside source code where applicable.
- Validate user input.
- Validate email addresses.
- Validate required fields.
- Protect admin endpoints.
- Protect accreditation endpoints.
- Avoid exposing sensitive guest information in QR codes.
- Prevent duplicate accreditation.
- Handle unauthorized requests safely.

---

# 17. Environment Variables

Secrets must not be committed to Git.

Expected configuration may include:

```

```

```
DATABASE_URL
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASSWORD
SMTP_FROM
SESSION_SECRET / JWT_SECRET
```

The exact variables depend on the implementation.

A `.env.example` file should document the required variables without containing real credentials.

---

# 18. Testing

Each major feature should be tested before moving to the next feature.

Important test cases include:

### Registration

- Guest can register.
- Required fields are validated.
- Attendance response is stored correctly.
- Invalid data is rejected.

### Guest Management

- Admin can create a guest.
- Admin can view guests.
- Admin can search guests.
- Guest information can be updated where required.

### Email

- RSVP email can be sent.
- SMTP errors are handled.
- Failed email attempts are not incorrectly marked as successful.

### QR

- QR is generated correctly.
- QR identifies the correct guest.
- Invalid QR values are rejected.

### Accreditation

- Guest can be found by search.
- Guest can be found through QR.
- Unaccredited guest can be accredited.
- Accreditation timestamp is stored.
- Already accredited guest cannot be accredited again.
- Accredit button becomes disabled for already accredited guests.

---

# 19. Deployment

The application is expected to be deployed using Namecheap/cPanel.

Deployment requirements will be confirmed during implementation.

Before deployment, the following must be verified:

- Environment variables
- Database
- SMTP
- Frontend
- Backend
- Authentication
- Registration
- QR generation
- Accreditation
- HTTPS
- Production error handling

---

# 20. Event-Day Requirements

The accreditation experience must be simple and fast.

Event staff should be able to:

```

```

```
Open accreditation page
        |
        v
Search or scan
        |
        v
Immediately see guest status
        |
        v
Accredit
```

The accreditation interface should avoid unnecessary navigation.

The system should clearly communicate:

```

```

```
NOT ACCREDITED
```

or:

```

```

```
ALREADY ACCREDITED
Accredited at: <time>
```

---

# 21. Development Principles

The project should prioritize:

1.  Simplicity
2.  Correctness
3.  Security
4.  Maintainability
5.  Clear separation of responsibilities
6.  Understandable code
7.  Testability

Avoid unnecessary complexity.

Do not introduce technologies or architectural patterns simply because they are popular.

Every major architectural decision should have a clear reason.

---

# 22. AI Development Rule

AI coding tools may be used to assist development.

However, generated code must be reviewed and understood before being accepted into the project.

For each implementation chunk, the developer should be able to explain:

- What was built?
- Why was it built?
- What files were changed?
- How does data move through the system?
- What assumptions were made?
- What could fail?
- How was it tested?

No major feature should be accepted as a black box.

---

# 23. Open Questions / TBD

These items should not block the initial architecture.

### Super Admin

Determine whether Super Admin is:

- Per event
- Central across multiple events

### Admin-created guest registration

Determine how an admin-created guest should be associated with the subsequent public registration submission.

### Final registration fields

Confirm the exact fields required by the event.

### Access card

Confirm whether the access-card functionality from the previous event system is required for this event.

### Messaging

SMTP email is confirmed for email communication.

Any additional messaging channel must be confirmed before implementation.

---

# 24. Development Workflow

The project will be built incrementally.

Do not build the entire system at once.

Each chunk must be understood, implemented, tested, and reviewed before the next chunk begins.

## Chunk 0 — System Understanding

Understand:

- What the application does
- Who uses it
- The three application areas
- Major data flows
- What the frontend does
- What the backend does
- What the database does
- How an HTTP request travels through the system

Checkpoint:

The developer must be able to explain:

```

```

```
Browser
   ↓
React
   ↓
HTTP request
   ↓
Express route
   ↓
Controller
   ↓
Service
   ↓
Database
```

---

## Chunk 1 — Project Foundation

Build:

- React frontend
- Express backend
- Database connection
- Environment configuration
- Git repository
- Basic folder structure

Learn:

- Frontend/backend communication
- package.json
- Environment variables
- Server startup
- HTTP request/response
- CORS
- Project structure

Checkpoint:

Explain what happens from the browser making a request to the backend returning a response.

---

## Chunk 2 — Database + Guest Model

Build:

- Database schema
- Guest model/table
- Database connection
- Repository/data-access layer
- Basic Guest CRUD

Learn:

- Tables
- Primary keys
- Constraints
- Migrations
- CRUD
- Repository responsibility

Checkpoint:

Explain exactly what happens when a guest is created.

```

```

```
HTTP request
 ↓
Route
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database
 ↓
Response
```

---

## Chunk 3 — Public Registration

Build:

- Registration page
- Registration form
- Form validation
- Registration API
- Guest creation/update flow

Learn:

- React forms
- Controlled inputs
- POST requests
- Request bodies
- Server validation
- Success/error states
- Database persistence

Checkpoint:

Trace one registration from the browser to the database and back.

---

## Chunk 4 — Attendance Logic

Build:

```

```

```
Will you be attending?

YES
 ↓
Continue registration

NO
 ↓
Appropriate response
```

Learn:

- Business rules
- Conditional UI
- Server-side business validation
- Keeping important business rules out of the frontend only

Checkpoint:

Explain why the backend must also enforce important business rules.

---

## Chunk 5 — Admin Authentication

Build:

- Admin login
- Password hashing
- Authentication
- Protected admin routes
- Logout

Learn:

- Authentication
- Authorization
- Password hashing
- Sessions or tokens
- Protected routes

Checkpoint:

Explain:

> Authentication = Who are you?

> Authorization = What are you allowed to do?

---

## Chunk 6 — Admin Guest Dashboard

Build:

- Admin dashboard
- Guest table
- Guest search
- Guest details
- Add guest

Learn:

- GET requests
- Query parameters
- Table rendering
- Loading states
- Empty states
- Error states

Checkpoint:

Explain how the dashboard retrieves and displays guests.

---

## Chunk 7 — Admin Guest + Public Registration Relationship

Implement the final relationship between:

```

```

```
Admin-created guest
        ↓
RSVP email
        ↓
General registration link
        ↓
Guest completes registration
        ↓
Existing/new guest record
```

The exact matching/update rule will be confirmed before implementation.

Learn:

- Record matching
- Data consistency
- Duplicate prevention
- Business rules

Checkpoint:

Explain how the system knows which guest record should be updated.

---

## Chunk 8 — SMTP Email

Build:

- SMTP configuration
- Email service
- RSVP email
- Admin send-email action
- Email error handling

Learn:

- SMTP
- Email transport
- Email templates
- Environment variables
- Async operations
- External-service failures

Checkpoint:

Explain what happens from clicking "Send RSVP" until the SMTP server receives the message.

---

## Chunk 9 — QR Generation

Build:

- QR token generation
- QR generation
- Guest QR display
- QR retrieval

Learn:

- QR codes
- Identifiers
- Random/opaque tokens
- Security considerations
- Why personal information should not be placed directly in a QR code

Checkpoint:

Explain exactly what the QR contains and how it identifies a guest.

---

## Chunk 10 — Accreditation Search

Build:

- Accreditation page
- Guest search
- Guest details
- Accreditation status
- Accredit button

Learn:

- Operational workflows
- Database updates
- State transitions
- Timestamps

Checkpoint:

Explain the difference between finding a guest and accrediting a guest.

---

## Chunk 11 — Accreditation Rules

Implement:

```

```

```
NOT ACCREDITED
     ↓
[ ACCREDIT ]
     ↓
ACCREDITED
```

Then:

```

```

```
ACCREDITED
     ↓
[ ACCREDIT ] disabled
```

Learn:

- Business-rule enforcement
- Idempotency
- Database constraints
- Why frontend restrictions are not security

The backend must reject duplicate accreditation even if someone bypasses the frontend.

Checkpoint:

Explain how the backend prevents a second accreditation.

---

## Chunk 12 — QR Scanning

Build:

```

```

```
Camera
 ↓
QR value
 ↓
API
 ↓
Guest lookup
 ↓
Guest details
 ↓
Accreditation state
```

Learn:

- Browser camera access
- QR scanning
- QR-to-database lookup
- Error handling

Checkpoint:

Explain the entire QR accreditation flow.

---

## Chunk 13 — Production Hardening

Test:

- Invalid login
- Invalid registration
- Missing fields
- Duplicate data
- Invalid QR
- Unknown guest
- Duplicate accreditation
- Unauthorized API request
- SMTP failure
- Database failure
- Malformed requests

Learn:

- Negative testing
- Security testing
- Failure handling
- Defensive programming

Checkpoint:

Identify how the system behaves when each critical dependency fails.

---

## Chunk 14 — UI Polish

Only after core functionality works.

Improve:

- Event branding
- Responsive design
- Loading states
- Error messages
- Empty states
- Accessibility
- Accreditation screen usability

Do not spend significant time polishing a feature before its underlying functionality is proven.

---

## Chunk 15 — Deployment

Deploy to the target Namecheap/cPanel environment.

Verify:

- Environment variables
- Database
- SMTP
- Frontend
- Backend
- Authentication
- Registration
- QR generation
- Accreditation
- HTTPS
- Production error handling

Perform production smoke tests before the event.

---

# 25. Learning Rule for Every Chunk

Every chunk follows this cycle:

```

```

```
1. UNDERSTAND
       ↓
2. PLAN
       ↓
3. IMPLEMENT
       ↓
4. INSPECT
       ↓
5. TEST
       ↓
6. EXPLAIN
       ↓
7. DEBUG
       ↓
8. REVIEW
       ↓
9. MOVE ON
```

Do not move to the next chunk simply because the code works.

Move forward only when the developer can explain the current chunk.

---

# 26. Six-Question Checkpoint

Before moving to the next chunk, answer:

1.  What did we build?
2.  Why did we build it?
3.  What happens when a user interacts with it?
4.  Where does the data go?
5.  What happens when something fails?
6.  If a senior engineer asked me to change this tomorrow, where would I look?

If these questions cannot be answered clearly, stop and investigate before continuing.

---

# 27. AI Coding Rules

OpenCode and other AI tools should be used for bounded implementation tasks.

Do not ask an AI coding tool to build the entire project at once.

Each task should:

- Have one clear objective.
- Identify the files it may change.
- Avoid unrelated modifications.
- Follow the existing architecture.
- Explain important decisions.
- Include tests where appropriate.

After each AI-generated change:

1.  Review the diff.
2.  Read the changed files.
3.  Run the application.
4.  Test the feature.
5.  Trace the data flow.
6.  Ask questions about anything not understood.
7.  Commit only after the change is understood and working.

The AI is an implementation assistant, not the owner of the architecture.

---

# 28. Definition of Done

The project is considered ready when:

- Public event website works.
- Guests can register.
- Attendance status is recorded.
- Admin can authenticate.
- Admin can manage guests.
- Admin can send RSVP emails.
- QR codes work.
- Accreditation staff can search guests.
- Accreditation staff can scan QR codes.
- Staff must explicitly confirm accreditation.
- Already accredited guests cannot be accredited again.
- Accreditation timestamps are stored.
- Validation and error handling work.
- Critical flows are tested.
- Application is deployed.
- Production environment is verified.
- The developer can explain and defend the system architecture and major implementation decisions.i need to put in the readme right?
