# Full Feature Implementation Plan

This document tracks the remaining work to convert the prototype UI into a data-driven experience. It is grouped by surface (shared services, admin, student, backend) so we can tackle items incrementally while keeping Supabase and the Flask automation layer aligned.

## Shared Services & Data Contracts

- [ ] Extend `src/services` to cover each backend capability (sessions, assignments, CRM threads, payments, certificates, notifications) instead of letting components call Supabase directly.
- [ ] Normalize TypeScript models (`types.ts`) with the actual Supabase tables and Flask responses; add helpers for status/enum translations.
- [ ] Create reusable hooks for synchronous + realtime flows (e.g., `useAssignments`, `useRecordings`, `usePayments`).
- [ ] Ensure all file uploads use the shared `FileUpload` component and store metadata (title, duration, session_id) in Supabase after storage succeeds.
- [ ] Add optimistic update + toast feedback patterns via context for all mutations.

## Admin Experience

1. **Dashboard (`components/admin/Dashboard.tsx`)**

   - Replace placeholder KPI deltas with calculations derived from Supabase stats RPC.
   - Pull "recent activity" from `cta_submissions`, `payments`, and `imported_leads` tables via a consolidated hook and include timestamps/status.
   - Wire upcoming sessions to `sessions` table and allow quick status updates (mark completed / cancel) inline.

2. **CRM (`components/admin/CRM.tsx`)**

   - Ensure contacts list uses `profiles` filtered by role student and last-activity metadata.
   - Persist all outbound messages to `crm_messages` via `useCRM` and surface delivery states using realtime updates + backend automations.
   - Add payment link + CTA actions that connect to payment service endpoints.

3. **Assignments & Recordings (`AssignmentCreation.tsx`, `RecordingManagement.tsx`)**

   - Build forms that insert records into `assignments` + `recordings` tables, including Supabase storage uploads.
   - Surface list views that read data dynamically with sort/filter + pagination; allow toggling visibility.

4. **Sessions (`SessionScheduling.tsx`)**

   - Replace static schedule cards with Supabase `sessions` data; add create/edit form writing to table and optional `Meeting Link` generation.

5. **Automations (`EmailSender.tsx`, `WhatsAppPanel.tsx`, `AutoCalling.tsx`, `NotificationsManager.tsx`)**

   - Connect to Flask automation endpoints (`/automation/...`) for templates, stats, campaign actions, and call queue state.
   - Persist automation runs to Supabase audit tables for later analytics.

6. **Payments (`PaymentLinks.tsx`, `PaidUsers.tsx`, `Payments.tsx`)**

   - [x] Use backend proxy endpoints for Instamojo (or mock service) to create/resend links and fetch transaction history.
   - [ ] Mark `profiles` and `payments` rows when invoices are paid; show aggregated metrics.

7. **CTA Review & Import Data (`CTAReview.tsx`, `ImportData.tsx`)**

   - Hook up to `cta_submissions`, `imported_leads`, and CSV upload endpoints; provide approve/reject + cleanup actions.

8. **Certificates/Settings/Support**
   - Implement certificate template selection, notification toggles, and support ticket management backed by Supabase tables/mocks.

## Student Experience

1. **Dashboard (`StudentDashboard.tsx`)**

   - Use `useStudentData` for profile + assignments + recordings; replace hardcoded progress metrics with real calculations (modules completed / assignments submitted / payments done).

2. **Schedule, Assignments, Recordings**

   - Ensure schedule and recordings consume shared hooks; allow assignment submission upload + status display per Supabase data.

3. **Payments (`StudentPayments.tsx`)**

   - [x] Fetch invoices from `payments` table scoped to the logged-in student; allow receipt downloads (PDF/HTML) and display outstanding balance based on `payment_links`.

4. **Support & Profile (`StudentSupport.tsx`, `StudentProfile.tsx`, `StudentRecordings.tsx`)**
   - Persist profile edits through `useStudentData.updateProfile`.
   - Display support ticket history and allow submitting new tickets via Supabase.

## Backend (Flask)

- [ ] Flesh out `backend/routes/admin.py` and `backend/routes/automation.py` to read/write Supabase tables instead of returning static mocks when `MOCK_MODE` is disabled.
- [x] Implement `/admin/payment-links` endpoint end-to-end (create/resend synced with Supabase).
- [ ] Implement `/admin/payment-stats`, `/automation/email/*`, `/automation/whatsapp/*`, and call endpoints with clear schemas consumed by the frontend services.
- [ ] Add webhooks (`routes/webhooks.py`) to update Supabase (`payments`, `crm_messages`) upon provider callbacks.

## Testing & Tooling

- [ ] Add Playwright smoke covering student login, dashboard load, assignment submission, and admin payment link creation.
- [ ] Add backend unit tests for automation mocks (`backend/test_mock_services.py`) and API contract tests for admin routes.
- [ ] Update README with run instructions for Supabase + Flask + Vite stack, including `.env` samples and how to enable mock services.

This plan will evolve; whenever a section is completed, mark the checkbox so the remaining scope stays visible.
