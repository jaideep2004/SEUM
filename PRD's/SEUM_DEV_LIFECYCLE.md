# SEUM ERP — Full Software Development Lifecycle

> This document covers ONLY the software platform. Hardware (MDVR, ADAS, DMS, BSD, GPS devices, CCTV cameras, LED/LCD displays, etc.) is excluded.

---

## PHASE 0: Foundation & Infrastructure

### 0.1 Project Scaffolding
- ✅ Next.js 14/15 app with TypeScript and `app/` directory
- ✅ Express.js backend in a `backend/` directory (or as a monorepo with turborepo)
- ✅ PostgreSQL database setup with connection pooling
- ✅ Docker Compose for local dev (PostgreSQL, Redis)
- ✅ Environment config (.env.local, .env.production)
- ✅ ESLint + Prettier configuration
- ✅ Shared TypeScript types package (`packages/shared`)

### 0.2 Database Foundation
- ✅ Migration tool setup (node-pg-migrate, Prisma Migrate, or Knex)
- ✅ Seed script foundation
- ✅ Base schema:
  - `tenants` (companies / organizations)
  - `users` (all roles, linked to tenant)
  - `roles` (enum or table: super_admin, company_admin, ops_manager, fleet_manager, driver, hr, finance, monitoring, customer_service, executive, maintenance)
  - `user_roles` (junction for users with multiple roles)
  - `permissions` (resource + action)
  - `role_permissions`
  - `audit_logs` (who did what, when, to which resource)
  - `sessions` (JWT refresh tokens)

### 0.3 Authentication & Authorization
- ✅ POST `/api/auth/login` — email/password, returns access + refresh tokens
- ✅ POST `/api/auth/register` — super admin creates company admin (not self-registration)
- ✅ POST `/api/auth/refresh` — refresh access token
- ✅ POST `/api/auth/logout` — invalidate token
- ✅ JWT middleware — verify token, decode tenant + role
- ✅ RBAC middleware — `requirePermission(resource, action)` factory
- ✅ Password hashing (bcrypt, 12+ rounds)
- ✅ Rate limiting on auth endpoints
- ✅ Login attempt lockout (5 failed attempts → 15 min block)
- ✅ Forgot password flow (email with reset link)
- ✅ Reset password endpoint

### 0.4 Multi-Tenant Architecture
- ✅ Row-level tenant isolation (all tables have `tenant_id`)
- ✅ Tenant-scoped query helpers (`backend/src/utils/tenantScope.ts`)
- ✅ Tenant creation flow (super admin only):
  - ✅ `POST /api/tenants` — name, domain, contact info, subscription tier
  - ✅ `GET /api/tenants` — list all (super admin)
  - ✅ `GET /api/tenants/:id` — tenant details
  - ✅ `PATCH /api/tenants/:id` — update tenant
  - ✅ `DELETE /api/tenants/:id` — soft delete tenant
- ✅ Subscription / plan model (tier, features, limits, billing cycle) — API + frontend
- ✅ Feature flags per tenant — `requireFeature()` middleware at `backend/src/middleware/featureFlag.ts`
- **Frontend pages:**
  - ✅ Tenants list page (super admin, with search/filter/pagination)
  - ✅ Tenant create/edit form page
  - ✅ Tenant detail/dashboard page (subscription info, usage stats)
  - ✅ Subscription plan management page (super admin)

### 0.5 Audit Logging System
- ✅ Automatic audit log on every CUD operation
- ✅ Audit log schema: `actor_id`, `action`, `resource`, `resource_id`, `old_value`, `new_value`, `ip_address`, `user_agent`, `timestamp`
- ✅ `GET /api/audit-logs` — filterable by tenant, user, resource, date range
- ✅ Audit log retention policy (configurable, auto-archive)
- **Frontend pages:**
  - ✅ Audit log viewer page (filterable table with date range, user, resource type pickers)
  - ✅ Audit log detail expandable row or modal

### 0.6 UI Shell
- ✅ Login page
- ✅ Forgot password / reset password pages
- ✅ Main layout with sidebar navigation (role-dependent)
- ✅ User avatar / dropdown (profile, logout)
- ✅ Responsive sidebar (collapsible on mobile)
- ✅ Notification bell (real-time notification count)
- ✅ Theme toggle (light/dark mode)

### 0.7 Error Handling & Logging
- ✅ Global Express error handler middleware
- ✅ Structured logging (pino or winston)
- ✅ API response envelope: `{ success: boolean, data?: T, error?: { code, message, details } }`
- ✅ Client-side error boundary
- ✅ Toast / notification component for API errors — auto-wired via `apiEvents`

---

## PHASE 1: Fleet Management

### 1.1 Bus / Vehicle Master
- ✅ `buses` table: tenant_id, plate_number, chassis_number, make, model, year, capacity (seated + standing), color, VIN, engine_number, fuel_type, status (active, maintenance, retired, sold), purchase_date, purchase_price, assigned_depot
- ✅ `POST /api/fleet/buses` — create bus
- ✅ `GET /api/fleet/buses` — list buses (filterable by status, depot)
- ✅ `GET /api/fleet/buses/:id` — single bus detail
- ✅ `PATCH /api/fleet/buses/:id` — update bus info
- ✅ `DELETE /api/fleet/buses/:id` — soft delete
- ✅ `GET /api/fleet/buses/:id/history` — full bus lifecycle history
- **Frontend pages:**
  - ✅ Buses list page (table with search/filter by status, depot, plate; pagination)
  - ✅ Bus detail page (full info, status badge, lifecycle history timeline)
  - ✅ Bus create/edit form (all fields with validation) — create modal + dedicated edit page
  - ✅ Bus history timeline component (lifecycle events chronologically)

### 1.2 Vehicle Documents
- ✅ `bus_documents` table: bus_id, document_type (registration, insurance, permit, inspection, fitness, road_tax), document_number, issue_date, expiry_date, file_url, status
- ✅ `POST /api/fleet/buses/:id/documents` — upload document (JSON + multipart file upload)
- ✅ `GET /api/fleet/buses/:id/documents` — list documents
- ✅ `PATCH /api/fleet/buses/:id/documents/:docId` — update
- ✅ `DELETE /api/fleet/buses/:id/documents/:docId` — remove
- ✅ Auto-detect expiring documents (30/14/7 days before) → create notification
- ✅ Document expiry dashboard widget
- **Frontend pages:**
  - ✅ Documents list page per bus (table with document type, expiry, status)
  - ✅ Document upload form (file picker, type selector, date fields)
  - ✅ Expiry badge/banner component (green=ok, yellow=30d, orange=14d, red=7d)
  - ✅ Document expiry dashboard widget (summary card for fleet dashboard)

### 1.3 Bus Readiness & Status
- ✅ `bus_readiness` table: bus_id, status (ready, in_maintenance, out_of_service, reserved), checked_by, checked_at, notes, next_scheduled_maintenance_km, next_scheduled_maintenance_date
- ✅ `POST /api/fleet/readiness` — update readiness status
- ✅ `GET /api/fleet/readiness` — current readiness for all buses (color-coded)
- ✅ Fleet dashboard: grid of all buses with readiness indicator (green/yellow/red)
- [ ] Prevent trip assignment to non-ready buses (trip creation does not check bus readiness)
- **Frontend pages:**
  - ✅ Fleet readiness dashboard (card grid, each bus = card with color-coded status indicator)
  - ✅ Readiness status update modal (dropdown + notes field)
  - ✅ Quick-filters: show ready / maintenance / out-of-service only

### 1.4 Fuel Tracking
- ✅ `fuel_logs` table: bus_id, date, liters, cost_per_liter, total_cost, odometer_reading, station_name, fuel_type, receipt_url, filled_by
- ✅ `POST /api/fleet/fuel` — log fuel fill
- ✅ `GET /api/fleet/fuel` — fuel logs (filterable by bus, date range)
- ✅ `GET /api/fleet/fuel/analytics` — avg km/liter, cost per km, trend chart
- ✅ Fuel efficiency alerts (sudden drop indicates theft or maintenance issue)
- **Frontend pages:**
  - ✅ Fuel logs page (table filterable by bus, date range; receipt image preview)
  - ✅ Fuel log entry form (inline or modal)
  - ✅ Fuel analytics page (trend chart: km/liter over time; avg cost per km card)
  - ✅ Efficiency alert banner (shown on fleet dashboard when drop detected)

### 1.5 Bus Assignment & Scheduling
- ✅ `POST /api/fleet/assign` — assign bus to a depot / route / driver
- ✅ `GET /api/fleet/assignments` — current and upcoming assignments
- ✅ `PATCH /api/fleet/assignments/:id` — update / reassign
- ✅ `DELETE /api/fleet/assignments/:id` — remove assignment
- ✅ Bus calendar view (which bus is where, when)
- **Frontend pages:**
  - ✅ Assignments list page (table with bus, route, driver, dates)
  - ✅ Assignment create/edit modal (bus selector, route, driver, date range)
  - ✅ Bus calendar view (monthly calendar, each bus row, trip blocks as colored bars)

### 1.6 Fleet Analytics Dashboard
- ✅ Total buses count (active, maintenance, retired)
- ✅ Fleet utilization rate (% of buses in use vs available)
- ✅ Average bus age
- ✅ Upcoming document renewals
- ✅ Fuel efficiency trends (km/liter over time)
- [ ] Maintenance cost per bus — depends on Phase 6 (Maintenance Module)
- ✅ Export fleet report (PDF / CSV)
- **Frontend pages:**
  - ✅ Fleet analytics dashboard page (summary cards + charts: utilization gauge, bus age bar, fuel trend line)
  - ✅ Upcoming renewals widget (sorted list with countdown days)
  - ✅ Export report button (PDF / CSV dropdown)
  - [ ] Maintenance cost per bus chart — placeholder until Phase 6

---

## PHASE 2: Trip & Operations Management

### 2.1 Route Master
- ✅ `routes` table: tenant_id, name, code, origin, destination, distance_km, estimated_duration_minutes, description, route_type (regular, hajj, umrah, charter, shuttle), status
- ✅ `route_stops` table: route_id, stop_name, stop_order, latitude, longitude, estimated_arrival_minutes
- ✅ `POST /api/operations/routes` — create route
- ✅ `GET /api/operations/routes` — list routes
- ✅ `GET /api/operations/routes/:id` — route with stops
- ✅ `PATCH /api/operations/routes/:id` — update
- ✅ `DELETE /api/operations/routes/:id` — soft delete
- ✅ `POST /api/operations/routes/:id/stops` — add stop
- ✅ `DELETE /api/operations/routes/:id/stops/:stopId` — remove stop
- ✅ Route visualization on map — `RouteMap` component (polyline + stop markers + popups)
- **Frontend pages:**
  - ✅ Routes list page (table with origin/destination, type tags, status)
  - ✅ Route detail page (map with route polyline + stops as markers)
  - ✅ Route create/edit form (origin/destination, stop order management)
  - ✅ Route map visualization component (`RouteMap.tsx` — polyline + stop markers + info popups)

### 2.2 Trip Scheduling
- ✅ `trips` table: tenant_id, route_id, bus_id, driver_id, trip_type, scheduled_date, scheduled_start_time, scheduled_end_time, actual_start_time, actual_end_time, status (scheduled, en_route, completed, cancelled, delayed), delay_minutes, delay_reason, notes, rejection_reason, created_by, approved_by
- ✅ `trip_passengers` table: trip_id, passenger_name, passenger_id_number, contact_number, seat_number, booking_reference
- ✅ `POST /api/operations/trips` — create trip (operations manager)
- ✅ `GET /api/operations/trips` — list trips (filterable by date, status, bus, route, driver)
- ✅ `GET /api/operations/trips/:id` — trip detail with full timeline
- ✅ `PATCH /api/operations/trips/:id` — update trip
- ✅ `DELETE /api/operations/trips/:id` — cancel trip
- ✅ `POST /api/operations/trips/:id/start` — mark trip as en_route
- ✅ `POST /api/operations/trips/:id/complete` — mark trip as completed
- ✅ `POST /api/operations/trips/:id/delay` — report delay (reason, estimated new time)
- ✅ `POST /api/operations/trips/:id/cancel` — cancel with reason
- ✅ Trip calendar view (daily / weekly / monthly)
- ✅ Trip timeline card (visual: scheduled → en_route → completed) — `TripTimeline` component
- **Frontend pages:**
  - ✅ Trips list page (table filterable by date range, status, bus, route, driver)
  - ✅ Trip create form (route selector, bus/driver suggestions, date/time pickers)
  - ✅ Trip detail page (full info + status timeline + passenger list)
  - ✅ Trip status action buttons (Start / Complete / Delay / Cancel with reason modal)
  - ✅ Trip calendar view (daily/weekly/monthly toggle, trip blocks on calendar)
  - ✅ Trip timeline card component (`TripTimeline.tsx` — stepper: scheduled → en_route → completed)

### 2.3 Recurring Trips
- ✅ `recurring_trip_patterns` table: route_id, bus_id, driver_id, frequency (daily, weekdays, weekends, custom_days), days_of_week, start_date, end_date, specific_dates[]
- ✅ `POST /api/operations/recurring-trips` — create pattern
- ✅ `GET /api/operations/recurring-trips` — list patterns
- ✅ `GET /api/operations/recurring-trips/:id` — pattern detail
- ✅ `PATCH /api/operations/recurring-trips/:id` — update pattern
- ✅ `DELETE /api/operations/recurring-trips/:id` — delete pattern
- ✅ `POST /api/operations/recurring-trips/:id/generate` — generate actual trips for date range
- ✅ `GET /api/operations/recurring-trips/:id/calendar` — pattern calendar view
- [ ] Auto-generation cron job (weekly trips for next 2 weeks)
- **Frontend pages:**
  - ✅ Recurring patterns list page (frequency badge, route, bus, driver)
  - ✅ Recurring pattern create/edit form (day-of-week checkboxes, date range picker)
  - ✅ Generate trips button + date range picker modal

### 2.4 Driver Assignment to Trips
- ✅ `POST /api/operations/trips/:id/assign-driver` — assign driver to trip
- ✅ `GET /api/operations/drivers/available` — list available drivers (not on another trip, not on leave)
- ✅ Driver schedule view (all trips assigned to a specific driver)
- ✅ Driver trip notification (in-app notification created on driver assignment via `notificationService`)
- ✅ Driver trip confirmation flow (accept / reject trip)
- **Frontend pages:**
  - ✅ Driver assign modal on trip detail (avail driver list with status indicators)
  - ✅ Driver schedule page (day/week view, all trips assigned to selected driver)
  - ✅ Trip confirmation status badge (accepted/rejected/pending on trip card)

### 2.5 Trip Monitoring (Pre-GPS)
- ✅ Manual status override buttons for control room — `POST /api/v1/operations/monitoring/trips/:id/override` + `/dashboard/monitoring` UI
- ✅ Trip status update via SMS/call (when no GPS) — `POST /api/v1/operations/monitoring/trips/:id/external-update` (method: sms|call|app)
- ✅ Trip timeline with manual timestamps — `trip_status_logs` table records every status change with `change_method`, `changed_by`, `notes`
- ✅ Expected vs actual timeline comparison — `GET .../monitoring/trips/:id/timeline` + `TimelineComparison` component
- ✅ Delay dashboard: all delayed trips with reason and estimated resolution — `GET /api/v1/operations/monitoring/delays` + `/dashboard/delays`
- **Frontend pages:**
  - ✅ Trip monitoring dashboard (list of active trips with status controls) — `/dashboard/monitoring`
  - ✅ Timeline comparison component (expected bar vs actual bar side-by-side) — `TimelineComparison.tsx`
  - ✅ Delay dashboard (table: route, bus, delay min, reason, estimated resolution) — `/dashboard/delays`
  - ✅ Manual status override buttons (large, role-protected) — Start Trip (blue), Complete (green), Mark Delayed (amber), Cancel (red)

### 2.6 Trip Reports
- ✅ Daily trip summary (total trips, completed, delayed, cancelled) — `GET /api/v1/operations/reports/trip`
- ✅ Driver performance per trip (on-time, late, incidents) — `GET /api/v1/operations/reports/drivers`
- ✅ Route performance (average duration, delay frequency) — `GET /api/v1/operations/reports/routes`
- ✅ Bus utilization per trip — `GET /api/v1/operations/reports/buses`
- ✅ Export trip report (CSV) — `GET /api/v1/operations/reports/export`
- **Frontend pages:**
  - ✅ Trip reports page (date range picker, summary cards, detailed tables) — `/dashboard/trips/reports`
  - ✅ Driver performance table (sortable by on-time %, completion rate)
  - ✅ Route performance table (avg duration, delay frequency %)
  - ✅ Export button dropdown (PDF / CSV)

### 2.7 Trip Types — Single vs Round/Recurring (Client Spec Update, Aug 2026)
Client clarification: exactly **2 trip types**:
- **Single / simple trip** — one route, one date (current behavior of the `trips` table).
- **Round / recurring trip** — ONE trip entity that contains **multiple stops/legs on multiple dates** (e.g. Hajj/Umrah journey: Jeddah → Madinah → Makkah → return, spread across days).
- Reference files: `Downloads\SEUM\Drj.pdf` (client manifest form showing legs 1–5 with From/To/Date/Time + Nusuk/Flights/Hotels sections) and client screenshot `WhatsApp Image 2026-07-11 at 11.49.17 PM.jpeg`.
- ✅ Enforce `trips.trip_type` as enum `'single' | 'round'` (migration + validator; backfill existing rows to `'single'`)
- ✅ `trip_legs` table: trip_id, leg_no, from (origin), to (destination), leg_date, departure_time, arrival_time, overnight_flag — one round trip = many legs, each with its own date/time
- ✅ Round trip create API — create trip + legs atomically; list/detail includes nested `legs[]` ordered by leg_no
- ✅ Trip detail/calendar/status flow works for round trips (status applies to the whole trip; legs have per-leg status when needed)
- ✅ Recurring pattern generation (`2.3`) extended: pattern can be round type with multi-leg template → generated trips carry the legs
- ✅ Manifest data (from Drj.pdf): trip title, vehicle type, group leader + no, nationality, agent, group no, no of pax, routes 1–N grid
- ✅ Optional linked info sections: Nusuk info, Flights (flight no, airline, from, to, date, time), Hotels (city, hotel, from, to, date, time) — separate tables or JSONB on trip
- **Frontend pages:**
  - ✅ Trip create/edit form gets type toggle (Single / Round) — round type shows legs grid (From, To, Date, Time per leg)
  - ✅ Trip detail shows legs timeline for round trips
  - ✅ Trip manifest print view (matches client form: Trip Info, Routes, Flights, Hotels, Transportation)
  - ✅ Recurring pattern form supports round patterns with leg template

---

## PHASE 3: Driver Management

### 3.1 Driver Master
- ✅ `drivers` table: tenant_id, user_id, employee_code, license_number, license_expiry, license_category, passport_number, nationality, date_of_birth, hire_date, emergency_contact_name, emergency_contact_phone, blood_type, medical_fitness_expiry, status (active, suspended, terminated, on_leave)
- ✅ `driver_documents` table: driver_id, document_type, number, issue_date, expiry_date, file_url
- ✅ `POST /api/v1/drivers` — create driver profile (creates user + driver role + driver profile)
- ✅ `GET /api/v1/drivers` — list drivers (filterable by status, nationality, search)
- ✅ `GET /api/v1/drivers/:id` — full driver profile with documents
- ✅ `PATCH /api/v1/drivers/:id` — update
- ✅ `DELETE /api/v1/drivers/:id` — soft delete
- ✅ Driver photo upload — `POST /api/v1/drivers/:id/photo` (multer)
- ✅ License expiry alerts — `GET /api/v1/drivers/expiring/licenses`
- ✅ Medical fitness expiry alerts — `GET /api/v1/drivers/expiring/medical`
- **Frontend pages:**
  - ✅ Drivers list page (table with photo thumb, status badge, nationality filter, expiry chips)
  - ✅ Driver profile page (photo, all fields, documents tab, schedule tab)
  - ✅ Driver create form (with photo upload, document add sections)
  - ✅ Driver edit form (all fields, status management)
  - ✅ Expiry alert badges (license, medical) on driver cards and profile page

### 3.2 Driver Attendance
- ✅ `driver_attendance` table: driver_id, date, check_in_time, check_out_time, status (present, absent, late, half_day, on_leave, on_trip), late_minutes, notes
- ✅ `POST /api/v1/drivers/attendance/check-in` — clock in
- ✅ `POST /api/v1/drivers/attendance/check-out` — clock out
- ✅ `GET /api/v1/drivers/attendance/list` — attendance records (filterable by driver, date range)
- ✅ `POST /api/v1/drivers/attendance/manual` — HR override / correction
- ✅ Auto-detect: driver on trip = on_trip (auto check-in via `POST /api/v1/drivers/attendance/auto-detect`)
- ✅ Monthly attendance summary (`GET /api/v1/drivers/attendance/summary`)
- ✅ Today dashboard endpoint (`GET /api/v1/drivers/attendance/dashboard`)
- **Frontend pages:**
  - ✅ Attendance page at `/dashboard/drivers/attendance` (date filter, table, check-in/out buttons, summary cards)
  - ✅ Check-in / Check-out button (per driver, with timestamp display)
  - ✅ Manual correction modal (HR only, override status + notes)
  - ✅ Monthly summary card (present/absent/late counts)
  - ✅ Today attendance summary cards (checked-in, late, absent, not recorded)

### 3.3 Driver Leave Management
- ✅ `driver_leaves` table: tenant_id, driver_id, leave_type (annual, sick, emergency, unpaid), start_date, end_date, reason, status (pending, approved, rejected), approved_by, documents (JSONB)
- ✅ `POST /api/v1/drivers/leaves` — apply for leave
- ✅ `GET /api/v1/drivers/leaves` — list leaves (filterable by status, type, driver, date range)
- ✅ `PATCH /api/v1/drivers/leaves/:id/approve` — approve (company admin / HR)
- ✅ `PATCH /api/v1/drivers/leaves/:id/reject` — reject with reason
- ✅ Leave calendar (`GET /api/v1/drivers/leaves/calendar?year=&month=`)
- ✅ Remaining leave balance tracking (`GET /api/v1/drivers/leaves/balance/:driverId` — annual 30, sick 14, emergency 10)
- ✅ Auto-block driver from trip assignment during leave period (helper: `getActiveLeavesForDriver()` + overlapping leave validation on apply)
- **Frontend pages:**
  - ✅ Leave list page at `/dashboard/drivers/leaves` (table filterable by status, type; approve/reject action buttons)
  - ✅ Apply leave form (type selector, date range, reason, driver ID)
  - ✅ Approve/Reject action buttons on pending leaves (reject modal with reason textarea)
  - ✅ Leave calendar view (driver rows, leave blocks color-coded by type, month navigation)
  - ✅ Leave balance card (annual used/remaining, sick, emergency, unpaid for current year)

### 3.4 Driver Violations & Incidents
- ✅ `driver_violations` table: tenant_id, driver_id, trip_id, violation_type, severity (minor/major/critical), description, points, recorded_at, action_taken, action_taken_by, status (open/resolved/disputed), dispute_reason, dispute_evidence (JSONB)
- ✅ `POST /api/v1/drivers/violations` — record violation (auto-calculates points: minor=2, major=5, critical=10)
- ✅ `GET /api/v1/drivers/violations` — list violations (filterable by driver, status, severity, type, date)
- ✅ `PATCH /api/v1/drivers/violations/:id` — update status / action taken
- ✅ `POST /api/v1/drivers/violations/:id/dispute` — driver can dispute with reason + evidence
- ✅ Violation points system (points accumulate over 90-day window; threshold of 30 → auto-suspend driver)
- ✅ Driver safety score (0-100 computed from total points in 90 days; grade A/B/C/D; leaderboard endpoint)
- **Frontend pages:**
  - ✅ Violations list page at `/dashboard/drivers/violations` (table with severity/type/status badges, driver, points, date)
  - ✅ Record violation form (type dropdown, severity selector, description, driver/trip UUIDs)
  - ✅ Violation detail modal (full info grid, resolve/dispute action buttons)
  - ✅ Dispute form (driver-side, reason textarea, submits via dispute endpoint)
  - ✅ Safety score card (score circle with color gauge, grade, points bar, breakdown table, leaderboard-ready)

### 3.5 Driver Performance Scoring
- ✅ `driver_scores` table: tenant_id, driver_id, period_start, period_end, safety_score, punctuality_score, customer_score, fuel_efficiency_score, overall_score, computed_by, computed_at
- ✅ `POST /api/v1/drivers/scores/compute/:driverId` — compute score for period (safety from violations, punctuality from attendance, customer from complaints, fuel from logs)
- ✅ `GET /api/v1/drivers/scores/history/:driverId` — score history (paginated)
- ✅ `GET /api/v1/drivers/scores/leaderboard?period=month|quarter|year` — top/bottom drivers
- ✅ `GET /api/v1/drivers/scores/latest/:driverId` — latest score + incentive recommendation
- ✅ Score breakdown visualization (SVG radar chart: safety, punctuality, customer, fuel)
- ✅ Score → incentive/promotion recommendation (silver ≥70 bonus 5%, gold ≥80 bonus 10%, platinum ≥90 bonus 20%)
- **Frontend pages:**
  - ✅ Score history page at `/dashboard/drivers/scores` (bar chart: overall score per period, 5 score cards)
  - ✅ Score breakdown radar chart (SVG polygon: safety, punctuality, customer, fuel axes)
  - ✅ Driver leaderboard page (ranked table with score bars, top/bottom toggle, month/quarter/year filter)
  - ✅ Incentive recommendation card (shown when score ≥70, tier badge + bonus description)

### 3.6 Driver Payroll (Basic)
- ✅ `driver_payroll` table: tenant_id, driver_id, period_start, period_end, base_salary, trip_allowance, overtime_hours, overtime_rate, overtime_pay, bonuses, deductions, total_payable, status (draft, approved, paid), paid_at, payment_reference
- ✅ `POST /api/v1/drivers/payroll/generate` — generate payroll for period (auto-calculates trip allowance from completed trips, overtime beyond 30 trips)
- ✅ `GET /api/v1/drivers/payroll` — payroll history (filterable by driver, status, date)
- ✅ `PATCH /api/v1/drivers/payroll/:id/approve` — approve (finance / company admin)
- ✅ `PATCH /api/v1/drivers/payroll/:id/pay` — mark as paid (with payment reference)
- ✅ Payslip data embedded in detail endpoint
- ✅ Trip-based allowance auto-calculation (per completed trip × trip rate, default $25)
- **Frontend pages:**
  - ✅ Payroll list page at `/dashboard/drivers/payroll` (period, driver, base/trip allowance/overtime/total/status)
  - ✅ Payroll detail modal (per-driver breakdown: base, allowances, overtime, deductions, net + payslip preview)
  - ✅ Generate payroll form (period selector, trip rate, preview table with totals row)
  - ✅ Approve/Pay action buttons (with payment reference confirmation modal)
  - ✅ Payslip view modal (printable, white card with line items and NET PAYABLE)

---

## PHASE 4: Accounting & Finance

### 4.1 Chart of Accounts
- ✅ `accounts` table: tenant_id, code (unique per tenant), name, type (asset, liability, equity, revenue, expense), parent_account_id, is_active, description
- ✅ Seed default accounts (14 standard accounts seeded on first list for each tenant: Assets, Cash & Bank, AR, Liabilities, AP, Equity, Revenue, Trip Revenue, Expenses, Fuel/Salary/Maintenance/Insurance/Tolls)
- ✅ `POST /api/v1/accounts` — create account
- ✅ `GET /api/v1/accounts` — list with tree structure (flat array + nested tree)
- ✅ `PATCH /api/v1/accounts/:id` — update
- ✅ `GET /api/v1/accounts/:id` — detail with parent info
- **Frontend pages:**
  - ✅ Chart of accounts page at `/dashboard/accounts` (tree view, expandable/collapsible parent/child, type color badges)
  - ✅ Account create/edit form modal (code, name, type, parent selector from tree, description)
  - ✅ Account detail slideover (code, name, type, status, description, parent info, child count)

### 4.2 Journal Entries
- ✅ `journal_entries` table: tenant_id, entry_number (auto), date, description, reference_type, reference_id, created_by, status (draft, posted)
- ✅ `journal_entry_lines` table: journal_entry_id, account_id, debit_amount, credit_amount, description
- ✅ `POST /api/v1/accounting/journal-entries` — create journal entry (double-entry validation, debits = credits)
- ✅ `GET /api/v1/accounting/journal-entries` — list entries (paginated, filterable by status/date)
- ✅ `GET /api/v1/accounting/journal-entries/:id` — entry detail with lines + running balance
- ✅ `POST /api/v1/accounting/journal-entries/:id/post` — post entry (locks it, validates balance)
- ✅ Auto-numbering in `JE-YYYY-NNNN` format
- ✅ Double-entry validation (Zod schema + post-time recheck)
- **Frontend pages:**
  - ✅ Journal entries list page at `/dashboard/accounting/journal-entries` (table with date, number, description, status, totals)
  - ✅ Journal entry create form (dynamic line items table: account picker from Chart of Accounts, debit/credit inputs, auto-sum + balance check)
  - ✅ Entry detail slideover (locked after posting, shows all lines with running balance, posted timestamp)
  - ✅ Post action button (with confirmation modal, role-protected)

### 4.3 Invoicing
- ✅ `invoices` table: tenant_id, invoice_number (auto INV-YYYY-NNNN), customer_name, customer_contact, invoice_date, due_date, subtotal, tax_amount, total, status (draft/issued/paid/overdue/cancelled/refunded), reference_trip_ids[], notes, paid_amount, paid_at, payment_method, payment_reference
- ✅ `invoice_line_items` table: invoice_id, description, quantity, unit_price, total, account_id, trip_id
- ✅ `POST /api/v1/accounting/invoices` — create invoice (auto-calc subtotal/total, line items)
- ✅ `GET /api/v1/accounting/invoices` — list (filterable by status, date, customer; paginated)
- ✅ `GET /api/v1/accounting/invoices/:id` — invoice detail with line items
- ✅ `PATCH /api/v1/accounting/invoices/:id` — update (draft only, can replace line items)
- ✅ `POST /api/v1/accounting/invoices/:id/issue` — issue (draft → issued, locks invoice)
- ✅ `POST /api/v1/accounting/invoices/:id/pay` — record payment (amount, method, date; partial/full; status auto-updates to paid)
- ✅ `POST /api/v1/accounting/invoices/:id/cancel` — cancel (draft/issued → cancelled)
- ✅ `POST /api/v1/accounting/invoices/:id/refund` — refund (paid → refunded)
- ✅ Invoice PDF generation (PDFKit, A4, company name header, line items table, subtotal/tax/total, ZATCA footer)
- ✅ Invoice send placeholder (email/whatsapp channel, returns queued status)
- ✅ State machine enforcement (VALID_TRANSITIONS map, Rejects invalid transitions)
- **Frontend pages:**
  - ✅ Invoices list page at `/dashboard/accounting/invoices` (table filterable by status, date range, customer; paginated)
  - ✅ Invoice create form (customer fields, date/due-date, dynamic line items grid with account picker, auto-calc totals, tax input)
  - ✅ Invoice detail slideover (printable layout showing all fields, line items table, status, payment info)
  - ✅ Action buttons: Issue (with confirmation), Record Payment (modal with amount/method/date/reference), Cancel (confirmation), Refund (confirmation)
  - ✅ PDF download button (blob fetch with auth header, auto-download)
- **Tests:** 23 comprehensive unit tests for service layer (all CRUD, all transitions, PDF validation)

### 4.4 Expense Tracking
- ✅ `expenses` table: tenant_id, expense_category (fuel, maintenance, salary, tolls, parking, permits, insurance, utilities, office, other), amount, description, date, bus_id, driver_id, trip_id, receipt_url, paid_by, status (pending, approved, reimbursed), approved_by
- ✅ `POST /api/v1/accounting/expenses` — record expense (with optional bus/driver refs)
- ✅ `GET /api/v1/accounting/expenses` — list (filterable by category, status, bus, driver, date; paginated with joined names)
- ✅ `GET /api/v1/accounting/expenses/:id` — expense detail (with paid_by/approved_by names, bus plate, driver name)
- ✅ `PATCH /api/v1/accounting/expenses/:id/approve` — approve (pending → approved, records approver + timestamp)
- ✅ `PATCH /api/v1/accounting/expenses/:id/reimburse` — mark reimbursed (approved → reimbursed)
- ✅ `POST /api/v1/accounting/expenses/:id/receipt` — upload receipt image (multer, stored in /uploads)
- ✅ State machine enforcement (validate transitions: pending→approved, approved→reimbursed)
- **Frontend pages:**
  - ✅ Expenses list page at `/dashboard/accounting/expenses` (table filterable by category, status, date; shows bus/driver plates)
  - ✅ Expense entry form (category dropdown, amount, date, optional bus/driver selectors, description)
  - ✅ Detail slideover (full info, receipt image or upload button, approve/reimburse action buttons with confirmation)
- **Tests:** 14 comprehensive unit tests (create, list, detail, approve, reimburse, receipt upload, all forbidden transitions)

### 4.5 Trip Profitability
- ✅ `estimated_revenue` column added to `trips` table (ALTER TABLE, defaults to 0)
- ✅ `GET /api/v1/accounting/trip-profitability` — list all trips with profit breakdown (revenue - fuel/maintenance/toll costs per trip), filterable by status/date/route/bus, paginated
- ✅ `GET /api/v1/accounting/trip-profitability/analytics` — KPIs (avg profit, avg margin, trip count) + grouped breakdown by route or bus with totals
- ✅ Auto-journal entry when trip is completed (hooks into `completeTrip`, creates revenue + AR double-entry, skips if revenue = 0 or accounts missing)
- **Frontend pages:**
  - ✅ Trip profitability list page at `/dashboard/accounting/trip-profitability` (table: date, route, bus, revenue, fuel, maintenance, tolls, total costs, profit, margin % with color bar)
  - ✅ Profit analytics page at `/dashboard/accounting/trip-profitability/analytics` (4 KPI cards: trip count, avg revenue, avg profit, avg margin; groupable breakdown table by route/bus with sorting)

### 4.6 Financial Reports
- ✅ `GET /api/v1/accounting/reports/profit-loss` — P&L statement (start_date, end_date) with revenue/expense breakdowns
- ✅ `GET /api/v1/accounting/reports/balance-sheet` — Balance Sheet (as_of_date) with assets/liabilities/equity sections + retained earnings
- ✅ `GET /api/v1/accounting/reports/ar-aging` — AR Aging (as_of_date) with aging buckets
- ✅ `GET /api/v1/accounting/reports/ap-aging` — AP Aging from expenses (as_of_date)
- ✅ `GET /api/v1/accounting/reports/cash-flow` — Cash Flow (start_date, end_date) with operating/investing/financing
- ✅ `GET /api/v1/accounting/reports/expense-category` — Expense by Category (start_date, end_date)
- ✅ `GET /api/v1/accounting/reports/revenue-route` — Revenue by Route (start_date, end_date)
- ✅ `GET /api/v1/accounting/reports/revenue-bus` — Revenue by Bus (start_date, end_date)
- ✅ `GET /api/v1/accounting/reports/export/:report_type/:format` — Export to PDF (PDFKit A4, professional layout) or CSV
- ✅ `report_schedules` table + CRUD endpoints for scheduled report auto-generation
- ✅ 10 unit tests for all report types + PDF/CSV generation
- **Frontend pages:**
  - ✅ Financial reports hub page at `/dashboard/accounting/reports` with tabbed interface for all 8 report types
  - ✅ Tab: Profit & Loss — summary cards (revenue, expenses, net) + breakdown tables with totals
  - ✅ Tab: Balance Sheet — asset/liability/equity sections with retained earnings + total L&E
  - ✅ Tab: AR Aging — aging bucket cards + detail table
  - ✅ Tab: AP Aging — aging bucket cards + detail table
  - ✅ Tab: Cash Flow — operating/investing/financing cards + detail tables
  - ✅ Tab: Expense by Category — grand total + breakdown table with count/amount/%
  - ✅ Tab: Revenue by Route/Bus — trip count + total revenue tables
  - ✅ Date range picker + preset quick selects (This Month, Last Month, This Quarter, This Year, All Time)
  - ✅ Export PDF and CSV buttons on every report

### 4.7 Payroll (Finance Side)
- ✅ `payroll_batches` table: tenant_id, period_start, period_end, total_salaries, total_deductions, total_allowances, net_payable, employee_count, status (draft→approved→paid), approved_by, paid_at
- ✅ `payroll_items` table: payroll_batch_id, driver_id, employee_code, employee_name, base_salary, trip_allowance, overtime_hours/rate/pay, bonuses, deductions, net_pay
- ✅ `POST /api/v1/accounting/payroll/batches` — create payroll batch (auto-pulls active drivers, calculates trip allowance at SAR 25/trip + overtime above 30 trips threshold)
- ✅ `GET /api/v1/accounting/payroll/batches` — list batches, filterable by status
- ✅ `GET /api/v1/accounting/payroll/batches/:id` — batch detail with all items
- ✅ `PATCH /api/v1/accounting/payroll/batches/:id/approve` — draft→approved, auto-creates journal entry (Dr Salary Expense, Cr AP)
- ✅ `PATCH /api/v1/accounting/payroll/batches/:id/pay` — approved→paid, auto-creates payment journal entry (Dr AP, Cr Cash & Bank)
- ✅ `DELETE /api/v1/accounting/payroll/batches/:id` — delete draft batches only
- ✅ 13 unit tests for all operations + journal entry auto-creation
- **Frontend pages:**
  - ✅ Payroll batches list page at `/dashboard/accounting/payroll` (grid cards: period, employee count, net payable, status, delete draft)
  - ✅ Batch detail page at `/dashboard/accounting/payroll/[id]` (per-employee breakdown table, summary cards, approve/pay/delete action buttons)
  - ✅ Create batch form at `/dashboard/accounting/payroll/new` (period picker, validates dates, confirms no duplicate period)

### 4.8 Bank & Payment Reconciliation
- ✅ `bank_accounts` table: tenant_id, bank_name, account_number, account_type (checking/savings/cash), opening_balance, current_balance
- ✅ `bank_transactions` table: bank_account_id, date, description, reference, debit, credit, reconciled (boolean), matched_invoice_id, matched_expense_id
- ✅ `POST /api/v1/accounting/banking/accounts` — create bank account (opening balance sets current_balance)
- ✅ `GET /api/v1/accounting/banking/accounts` — list
- ✅ `GET /api/v1/accounting/banking/accounts/:id` — detail
- ✅ `PATCH /api/v1/accounting/banking/accounts/:id` — update name/type
- ✅ `POST /api/v1/accounting/banking/accounts/:accountId/transactions` — import transactions (JSON body)
- ✅ `POST /api/v1/accounting/banking/accounts/:accountId/transactions/csv` — CSV upload (multer, auto-parses headers: date, description, reference, debit, credit)
- ✅ `GET /api/v1/accounting/banking/accounts/:accountId/transactions` — list, filterable by reconciled status
- ✅ `GET /api/v1/accounting/banking/reconciliation/unmatched` — get unmatched bank txs + invoices + expenses
- ✅ `POST /api/v1/accounting/banking/reconciliation/match` — match a bank tx to invoice or expense (updates reconciled flag + invoice paid_amount)
- ✅ `POST /api/v1/accounting/banking/reconciliation/unmatch/:id` — reverse a match
- ✅ 7 unit tests
- **Frontend pages:**
  - ✅ Bank accounts list at `/dashboard/accounting/bank-accounts` (cards: bank name, account number, type badge, balance)
  - ✅ Create account form at `/dashboard/accounting/bank-accounts/new` (bank name, account number, type, opening balance)
  - ✅ Transactions page at `/dashboard/accounting/bank-accounts/[id]` (CSV upload section, filter reconciled toggle, transactions table with date/description/reference/debit/credit/status)
  - ✅ Reconciliation page at `/dashboard/accounting/bank-accounts/[id]/reconciliation` (split view: unmatched bank txs left, unmatched invoices/expenses right; match modal with dropdown selectors for tx + target)

---

## PHASE 5: HR & Employee Management (Non-Driver)

### 5.1 Employee Master
- ✅ `employees` table: tenant_id, user_id, employee_code, department (operations, finance, hr, fleet, maintenance, customer_service, executive, admin), designation, phone, email, join_date, contract_end_date, nationality, id_number, status
- ✅ `POST /api/hr/employees` — create
- ✅ `GET /api/hr/employees` — list
- ✅ `GET /api/hr/employees/:id` — detail
- ✅ `PATCH /api/hr/employees/:id` — update
- ✅ `DELETE /api/hr/employees/:id` — soft delete
- **Frontend pages:**
  - ✅ Employees list page (table with department filter, status badge, search)
  - ✅ Employee profile page (details, department, documents tab, attendance tab)
  - ✅ Employee create/edit form

### 5.2 Employee Attendance
- ✅ Same pattern as driver attendance (separate or unified table)
- ✅ `POST /api/hr/employee-attendance/check-in`
- ✅ `POST /api/hr/employee-attendance/check-out`
- ✅ `GET /api/hr/employee-attendance` — records
- ✅ Monthly attendance summary
- **Frontend pages:**
  - ✅ Employee attendance page (table filterable by employee, date range)
  - ✅ Check-in/out interface
  - ✅ Monthly summary card

### 5.3 Employee Payroll
- ✅ `employee_payroll` similar to driver payroll
- ✅ Salary structure (basic, housing, transport, other allowances)
- ✅ Deductions (insurance, loans, penalties)
- ✅ Payroll processing (monthly batch)
- **Frontend pages:**
  - ✅ Employee payroll list page (by period)
  - ✅ Salary structure form (per-employee allowance/deduction breakdown)
  - ✅ Batch payroll processing page

### 5.4 Employee Leaves
- ✅ `employee_leaves` table (tenant_id, employee_id, leave_type, start/end_date, status, manager/HR approver + timestamps, rejection_reason, documents)
- ✅ Leave balance per employee (annual 30 / sick 20 / maternity 90 / unpaid 0, pro-rated on approval)
- ✅ Approval workflow (pending_manager → manager approve → pending_hr → HR approve; any-stage reject)
- ✅ Overlap prevention (409 on overlapping active leave)
- ✅ Calendar endpoint (monthly, per-employee)
- **Frontend pages:**
  - ✅ Employee leave list page (filterable by department, status, leave type)
  - ✅ Leave application form (type, dates, reason)
  - ✅ Approval workflow UI (manager approve → HR approve, chain indicator)
  - ✅ Leave balance card per employee

### 5.5 Contracts & Documents
- ✅ `employee_contracts` table: employee_id, contract_type, start_date, end_date, salary, benefits, file_url, status
- ✅ `employee_documents` table: employee_id, document_type, number, expiry_date, file_url
- ✅ Contract expiry alerts (`GET /api/v1/hr/expiry-alerts?days=N`)
- ✅ Document expiry alerts (expiring_within filter + combined alerts endpoint)
- **Frontend pages:**
  - ✅ Contracts tab on employee profile (list, upload, expiry badges)
  - ✅ Documents tab on employee profile (list by type, upload, expiry alerts)

---

## PHASE 6: Maintenance & Workshop

### 6.1 Maintenance Scheduling
- ✅ `maintenance_tasks` table: tenant_id, bus_id, task_type (oil_change, tire_replacement, brake_inspection, engine_service, ac_service, electrical, body_repair, general_service, other), description, priority (low, medium, high, critical), scheduled_date, scheduled_km, recurring_interval_days, recurring_interval_km, status (scheduled, in_progress, completed, cancelled), assigned_workshop, assigned_mechanic
- ✅ `POST /api/maintenance/tasks` — schedule maintenance
- ✅ `GET /api/maintenance/tasks` — list tasks (filterable by bus, status, priority)
- ✅ `GET /api/maintenance/tasks/:id` — task detail
- ✅ `PATCH /api/maintenance/tasks/:id` — update
- ✅ `POST /api/maintenance/tasks/:id/start` — begin work
- ✅ `POST /api/maintenance/tasks/:id/complete` — finish with notes and cost (advances bus next_km_threshold when recurring_interval_km set)
- ✅ `POST /api/maintenance/tasks/:id/cancel` — cancel with reason
- ✅ Auto-generate maintenance task when bus reaches next_km_threshold (`POST /api/maintenance/tasks/auto-generate`; buses gained `current_km` + `next_km_threshold` columns)
- ✅ Maintenance calendar view
- **Frontend pages:**
  - ✅ Maintenance tasks list page (table filterable by bus, status, priority; priority color badges)
  - ✅ Schedule maintenance form (bus selector, task type, priority, date/km, workshop)
  - ✅ Task detail page (timeline: scheduled → in_progress → completed)
  - ✅ Start/Complete/Cancel action buttons (with notes/cost modal on complete)
  - ✅ Maintenance calendar view (monthly, task blocks color-coded by priority)

### 6.2 Breakdown & Emergency Repair
- ✅ `breakdown_reports` table: tenant_id, bus_id, trip_id, reported_by, breakdown_type (engine_failure, transmission, electrical, tire_blowout, brake_failure, suspension, fuel_system, cooling_system, clutch, body_damage, accident, mechanical, other), description, location (+ optional location_lat/lng), severity (low, medium, high, critical), status (reported, dispatched, in_progress, resolved), dispatched_mechanic/at/by, resolution_notes, cost, resolved_at/by
- ✅ `POST /api/maintenance/breakdowns` — report breakdown (validates bus + optional trip)
- ✅ `GET /api/maintenance/breakdowns` — list (filterable by bus, status, severity, type; search on plate/location; status-priority ordering)
- ✅ `PATCH /api/maintenance/breakdowns/:id/dispatch` — send mechanic (reported → dispatched, records mechanic)
- ✅ `PATCH /api/maintenance/breakdowns/:id/start` — dispatched → in_progress (mechanic starts work)
- ✅ `PATCH /api/maintenance/breakdowns/:id/resolve` — mark resolved with notes + cost (any non-resolved state)
- ✅ `GET /api/maintenance/breakdowns/heatmap` — breakdowns grouped by location with total/open counts, avg cost (drives heat map)
- ✅ State machine enforcement (dispatch only from reported/dispatched, start only from dispatched, no re-resolve)
- **Frontend pages** (`/dashboard/maintenance/breakdowns`):
  - ✅ Breakdown reports list page (table with severity badge, bus, type, location, status; filters by bus/status/severity)
  - ✅ Report breakdown form (bus selector, type, severity, location + optional lat/lng, description)
  - ✅ Dispatch mechanic button (status change + assign modal with mechanic name)
  - ✅ Start Work button (dispatched → in_progress)
  - ✅ Resolve modal (resolution notes, cost)
  - ✅ Breakdown heat map page (SVG cluster grid colored/intensified by report count per location, total/open/location stats)
- **Tests:** 12 comprehensive unit tests (create with bus/trip validation, list filters, all state transitions + rejections, heatmap grouping)

### 6.3 Spare Parts Inventory
- ✅ `spare_parts` table: tenant_id, part_code (unique per tenant), part_name, category, manufacturer, unit_of_measure, quantity_in_stock, reorder_level, unit_price, supplier_id, storage_location
- ✅ `inventory_transactions` table: spare_part_id, transaction_type (in/out), quantity (>0), reference_type, reference_id, unit_price, total, notes, date, performed_by
- ✅ `POST /api/maintenance/parts` — create part (logs initial stock-in transaction; 409 on duplicate part code)
- ✅ `GET /api/maintenance/parts` — list (filterable by category, manufacturer, search; `lowStock=true` filter; low-stock rows sorted first, `lowStock` flag on each part)
- ✅ `GET /api/maintenance/parts/:id` — part detail with last 10 transactions
- ✅ `PATCH /api/maintenance/parts/:id` — update (code/name/category/manufacturer/reorder level/price/supplier/location; not quantity)
- ✅ `POST /api/maintenance/parts/:id/stock-in` — add stock (defaults unit price to current, computes total, records transaction)
- ✅ `POST /api/maintenance/parts/:id/stock-out` — remove stock (optional `maintenance_task_id` → validates task, links as reference_type=maintenance_task; rejects insufficient stock)
- ✅ `GET /api/maintenance/parts/transactions` — transaction ledger (filter by part, type, reference_type, date range; paginated)
- ✅ `GET /api/maintenance/parts/usage/:busId` — parts usage history per bus (join through maintenance tasks; total parts + total cost)
- ✅ Low stock alerts (lowStock flag on list/detail + filter; banner + per-row badges on frontend)
- **Frontend pages** (`/dashboard/maintenance/parts`):
  - ✅ Spare parts inventory page (table with qty vs reorder level, LOW badge below reorder, unit price, supplier, storage location, search/category/low-stock-only filters)
  - ✅ Part create/edit form (add-part tab + edit modal; initial qty logs an initial stock transaction)
  - ✅ Stock-in modal (quantity, unit price, supplier, reference)
  - ✅ Stock-out modal (quantity, link to maintenance task with open-task loader, reference)
  - ✅ Parts usage history page per bus (bus selector, totals cards, table: part used, qty, unit/total cost, date, task type)
- **Tests:** 13 comprehensive unit tests (create + duplicate code + initial tx, list filters/low-stock flag, update, stock-in pricing, stock-out with task link + insufficient stock + unknown task, transaction ledger join, usage-per-bus join + totals)

### 6.4 Maintenance Cost Tracking
- ✅ `maintenance_costs` table: maintenance_task_id (unique per task), parts_cost, labor_hours, labor_rate, labor_cost, total_cost, paid_to, invoice_number, status (pending, invoiced, paid, cancelled)
- ✅ Auto-calculate cost: parts_cost summed from stock-out transactions linked to the task (reference_type=maintenance_task), labor_cost = labor_hours × labor_rate (default 50/hr), total = parts + labor — recomputed automatically when hours/rate change
- ✅ `POST /api/maintenance/costs` — record cost for a task (409 if task already has a cost record)
- ✅ `GET /api/maintenance/costs` — costs report (filterable by bus, task type, status, scheduled-date range; paginated + summary KPI card data via meta.summary)
- ✅ `GET /api/maintenance/costs/by-bus` — total maintenance cost per bus (lifetime, parts/labor split, task count, sorted desc + fleet grand total)
- ✅ `GET /api/maintenance/costs/analytics/age` — maintenance cost vs bus age scatter data (age from purchase date/created_at, includes buses with zero cost)
- ✅ `PATCH /api/maintenance/costs/:id` — update hours/rate (recomputes totals) + paid_to/invoice/status; locked once paid/cancelled
- **Frontend pages** (`/dashboard/maintenance/costs`):
  - ✅ Maintenance cost report page (date range + bus/type/status filters, total cost KPI cards, records table with parts/labor/total/invoice/status)
  - ✅ Record cost form (task selector, labor hours/rate with auto-calc note, paid-to, invoice, status)
  - ✅ Cost per bus chart (bar chart: total lifetime cost per bus, task counts, fleet total)
  - ✅ Cost vs bus age scatter plot (SVG: x = bus age years, y = lifetime cost, dot size = task count, axis grid + labels)
- **Tests:** 9 comprehensive unit tests (auto-calc parts from linked stock-outs + labor, duplicate/unknown task rejections, list filters + summary, update recompute, paid-record lock, by-bus aggregation, age analytics mapping)

### 6.5 Workshop Management
- ✅ `workshops` table: tenant_id, name, location, contact, supervisor, is_internal (boolean), services[], soft delete (deleted_at)
- ✅ `POST /api/v1/maintenance/workshops` — create (409 on duplicate name per tenant; services[] array)
- ✅ `GET /api/v1/maintenance/workshops` — list (filterable by is_internal, search on name/location/supervisor; paginated; internal sorted first)
- ✅ `GET /api/v1/maintenance/workshops/:id` — detail
- ✅ `PATCH /api/v1/maintenance/workshops/:id` — update (partial; duplicate-name check excluding self)
- ✅ `DELETE /api/v1/maintenance/workshops/:id` — soft delete
- ✅ `GET /api/v1/maintenance/workshops/:id/tasks` — workshop + assigned maintenance tasks (joined via assigned_workshop = workshop name, with bus plate/make/model; pending-first ordering)
- ✅ `GET /api/v1/maintenance/workshops/:id/work-order.pdf` — work order PDF (pdfkit: workshop details, pending work with priority/date/mechanic, completed/cancelled summary, signature block)
- ✅ Roles: fleet_manager/company_admin/super_admin write, + operations_manager read
- **Frontend pages** (`/dashboard/maintenance/workshops`):
  - ✅ Workshops list page (cards: name, location, contact, supervisor, internal/external badge, services chips)
  - ✅ Workshop create/edit modal form (name, type, location, contact, supervisor, services multi-select chips)
  - ✅ Work order modal (pending/completed tabs, task list with bus/priority/status/mechanic/cost) + Download PDF button
  - ✅ Search + internal/external filter; delete with confirm
  - ✅ `Work Orders` nav entry now points to this module
- **Tests:** 8 comprehensive unit tests (create + duplicate rejection, list filters/search, update partial + services, soft delete, not-found, task lookup join, PDF buffer generation)

---

## PHASE 7: Booking & Customer Service

### 7.1 Customer / Passenger Master
- ✅ `customers` table: tenant_id, name, phone, email, id_number, nationality, address, is_company (boolean), company_name, notes, soft delete (deleted_at); indexes on name/phone/id_number
- ✅ `POST /api/v1/bookings/customers` — create (409 on duplicate phone/email per tenant; company customers require company_name)
- ✅ `GET /api/v1/bookings/customers` — list / search (search on name/phone/email/id_number/company_name; is_company filter; paginated; name-sorted)
- ✅ `GET /api/v1/bookings/customers/:id` — detail
- ✅ `PATCH /api/v1/bookings/customers/:id` — update (partial; duplicate phone/email excluding self; switching company→individual clears company_name)
- ✅ `DELETE /api/v1/bookings/customers/:id` — soft delete
- ✅ `GET /api/v1/bookings/customers/:id/bookings` — booking history (join through trips/routes; empty when bookings table not yet created)
- ✅ Roles: operations_manager/company_admin/super_admin write, + fleet_manager read
- **Frontend pages:**
  - ✅ Customers list / search page (`/dashboard/customers`, table with search by name/phone/id, individual/company filter + badges, contact + ID/nationality columns)
  - ✅ Customer profile page (`/dashboard/customers/[id]` — profile card with contact grid, booking history tab with status/payment badges, details tab)
  - ✅ Customer create/edit form (modal on list page + dedicated `/dashboard/customers/[id]/edit` page; company name conditional field)
- **Tests:** 9 comprehensive unit tests (create + dup phone + company-name validation, list filters/search, update + company_name clearing, soft delete, not-found, booking history join + 42P01 graceful empty)

### 7.2 Booking Management
- ✅ `bookings` table: tenant_id, customer_id, trip_id, booking_reference (auto `BK-YYYY-####`), number_of_passengers, seat_numbers[], total_amount, paid_amount, balance, status (pending, confirmed, cancelled, refunded), booking_date, payment_status, notes; indexes on tenant/customer/trip/status/date
- ✅ `booking_passengers` table: booking_id, passenger_name, id_number, seat_number, age, special_requirements
- ✅ `POST /api/v1/bookings` — create booking (auto reference, seat conflict + capacity validation, payment_status computed, passengers insert)
- ✅ `GET /api/v1/bookings` — list (filterable by status, date range, customer, trip, payment_status + search on reference/customer/route; paginated)
- ✅ `GET /api/v1/bookings/:id` — booking detail (customer + trip + route + bus joined)
- ✅ `PATCH /api/v1/bookings/:id` — update (seats w/ conflict exclusion of self, passengers, amounts, notes)
- ✅ `POST /api/v1/bookings/:id/confirm` — confirm booking (pending only)
- ✅ `POST /api/v1/bookings/:id/cancel` — cancel (reason required; pending/confirmed only)
- ✅ `POST /api/v1/bookings/:id/refund` — process refund (confirmed/cancelled with paid > 0; zeroes paid_amount)
- ✅ `GET /api/v1/bookings/:id/ticket` — generate ticket (PDF via pdfkit, attachment download)
- ✅ Seat availability check per trip (`GET /api/v1/bookings/trips/:tripId/availability` — capacity/occupied/available/bookedCount; seats of pending+confirmed bookings count as occupied)
- ✅ Prevent overbooking (hard seat conflict check vs bus capacity; waitlist is Phase 7.3)
- ✅ Roles: super_admin/company_admin/operations_manager/customer_service write, + finance_accountant/executive read
- **Frontend pages:**
  - ✅ Bookings list page (`/dashboard/bookings` — table filterable by status, payment status, date range, search; server pagination; status/payment badges)
  - ✅ Booking create form (`/dashboard/bookings/new` — customer search dropdown, bookable trip selector, seat map, passenger rows auto-synced to seats, payment fields)
  - ✅ Booking detail page (`/dashboard/bookings/[id]` — customer info, trip info, passenger list, payment breakdown, status badges)
  - ✅ Seat selection UI (SeatMap component: visual seat grid occupied/available/selected with legend)
  - ✅ Confirm/Cancel/Refund action buttons (cancel uses reason modal; refund uses confirm dialog)
  - ✅ Ticket PDF download button (blob download with auth header)
- **Tests:** 15 backend unit tests (create + seat conflict + out-of-range + paid>total + non-bookable trip, availability calc, list filters/search, confirm/cancel/refund lifecycle, update w/ self-exclusion, PDF buffer) + frontend vitest tests

### 7.3 Waitlist
- ✅ `booking_waitlist` table: tenant_id, trip_id, customer_id, number_of_passengers, request_date, status (waiting, offered, converted, expired)
- ✅ `POST /api/bookings/waitlist` — join waitlist
- ✅ `GET /api/bookings/waitlist` — view waitlist
- ✅ Auto-offer when seat becomes available (notify customer)
- ✅ Auto-expire unresponsive offers
- **Frontend pages:**
  - ✅ Waitlist page per trip (table: customer, requested seats, wait time, status)
  - ✅ "Join waitlist" button on trip with no availability

### 7.4 Booking Dashboard
- ✅ Today's bookings summary
- ✅ Upcoming trips with booking counts
- ✅ Cancellation rate
- ✅ Revenue from bookings (today, this week, this month)
- ✅ Customer search (find bookings by name / phone / reference)
- **Frontend pages:**
  - ✅ Booking dashboard page (summary cards, revenue trend, upcoming trips table)
  - ✅ Global customer search bar (finds bookings across all trips)

### 7.5 Customer Communication (Booking Related)
- ✅ `booking_communications` table: tenant_id, booking_id, comm_type, recipient_email, subject, status (sent/failed), error, sent_at
- ✅ Booking confirmation (auto, on create; receipt auto when paid)
- ✅ Trip reminder (24 hours before; hourly scheduled job backend-side)
- ✅ Delay notification to all passengers on affected trip (auto on delay)
- ✅ Cancellation notification (auto on cancel)
- ✅ Payment receipt (auto; refund receipt on refund), refund notification
- ✅ `POST /api/bookings/:id/communications/send` — manual resend (confirmation, receipt, reminder, cancellation, delay)
- ✅ `GET /api/bookings/:id/communications` — communication log
- **Frontend pages:**
  - ✅ Communication log section on booking detail (type, subject, recipient, status badge sent/failed, timestamp)
  - ✅ Manual send buttons (resend confirmation, send receipt, send reminder, send delay alert; errors shown inline)
- **Email:** nodemailer Gmail SMTP with SEUM-branded HTML template (`#1d4ed8` primary); senders degrade gracefully to log-only when SMTP unconfigured
- **Tests:** 8 backend tests (confirmation + no-email guard, delay alerts, cancellation, comm log, reminder sender guard, reminder job send + dedupe, reminder job no-op) + hooks verified across bookings/trips/driver-assignment suites (40 suites / 393 backend + 94 frontend green)

### 7.6 Booking Approval & Status Workflow (Client: Supervisor Review)
- [ ] Extend `bookings` status flow to the request pipeline: `draft → pending_approval → approved → planning → assigned → confirmed → in_progress → completed` (keep existing `pending/confirmed/cancelled/refunded` as compatible aliases or migrate carefully)
- [ ] `booking_status_history` table: booking_id, from_status, to_status, changed_by, changed_at, notes (every transition recorded with actor + timestamp)
- [ ] `POST /api/v1/bookings/:id/submit` — move `new/draft` booking to `pending_approval`
- [ ] `POST /api/v1/bookings/:id/approve` — supervisor approve (records approver + timestamp); moves booking to `approved` → appears in planning queue
- [ ] `POST /api/v1/bookings/:id/reject` — supervisor reject (reason required)
- [ ] Supervisor review surface: open full booking detail (customer, company, trip, date, time, pickup, destination, pax, trip type, vehicle requirements, special requirements, quotation, invoice info, amounts)
- [ ] `PATCH /api/v1/bookings/:id` extended for supervisor: edit price/quotation + attach invoice reference at approval stage (price verification)
- [ ] Planning queue endpoint: `GET /api/v1/bookings?status=approved` → planning team assigns vehicle + driver (reuses existing assignment endpoints from Phase 2 / Fleet)
- [ ] Auto-transition `confirmed` once planned + assigned (or manual confirm per current flow)
- [ ] Roles: supervisor = company_admin / operations_manager; planning = operations_manager / fleet_manager
- **Frontend pages:**
  - [ ] Booking Management queue: "New Trips / Pending Approval" view (approval status filter on `/dashboard/bookings`)
  - [ ] Booking detail with supervisor review panel (edit price, attach invoice, verify amounts, Approve / Reject buttons, reject-reason modal)
  - [ ] Planning queue view (approved bookings awaiting vehicle + driver assignment)
  - [ ] Status timeline on booking detail (from `booking_status_history`)

### 7.7 Excel Bulk Import (Client: B2B Excel Upload Channel)
- [ ] Excel template download (`GET /api/v1/bookings/import/template` — standardized columns: customer info, trip info, date, time, pickup, destination, passenger count, trip/service type, price)
- [ ] `POST /api/v1/bookings/import` — multipart `.xlsx` upload
- [ ] Validation per row: required fields, customer match (name/phone/company), date format, time format, pickup/destination, passenger count, trip type, price, duplicate records, invalid data
- [ ] Validation report response with per-row errors; no trips created if errors exist (fail-safe)
- [ ] Batch create on valid file → all requests land as `pending_approval` (Phase 7.6), `channel = excel`
- [ ] Frontend: Excel upload page (template download, file picker, error table with row/column references, success summary)

### 7.8 Booking Channels & Source Tagging (Client: Unified Channels)
- [ ] `channel` column on `bookings`: `internal`, `excel`, `b2b_portal`, `b2c_website`, `cs_employee`, `whatsapp` (reserved for future chatbot)
- [ ] Set channel at creation by intake source (internal form, import job, portal API, CS screen)
- [ ] List filter `?channel=...` + channel breakdown in booking dashboard/reports
- [ ] Frontend: channel badge on booking list/detail, channel filter dropdown
- [ ] Future-proofing: new channels reuse central booking module without schema change (client principle: multiple channels → central booking management)

---

## PHASE 8: Notifications & Communication

### 8.1 Notification Engine
- ✅ `notifications` table: tenant_id, user_id, type, title, message, data (JSONB), resource, resource_id, is_read, is_seen, read_at, created_at
- ✅ `notification_preferences` table: per-user (tenant_id, user_id, event_type, in_app, email) with PK upsert
- ✅ `POST /api/notifications` — create notification (internal, preference-aware)
- ✅ `GET /api/notifications` — list (paginated, unread first, `type` filter)
- ✅ `PATCH /api/notifications/:id/read` — mark as read (sets read_at)
- ✅ `PATCH /api/notifications/read-all` — mark all read (sets read_at)
- ✅ `GET /api/notifications/count` — badge count
- ✅ `DELETE /api/notifications/:id` — dismiss
- ✅ `GET/PUT /api/notifications/preferences` — per-event channel toggles
- ✅ Preference-aware sends: `createNotification` gated by in-app pref; email gated by email pref (document expiry, waitlist offers, trip assignment emails)
- **Frontend pages:**
  - ✅ Notification center page (`/dashboard/notifications`) — full list with read/unread, type filter, mark-all-read, dismiss, pagination
  - ✅ Notification bell dropdown (latest 5, unread badge, mark-all-read button, "Open notification center" link) — pre-existing, verified
  - ✅ Notification preference settings page (`/dashboard/notifications/preferences`) — per-event in-app/email toggles
- **Tests:** 9 backend notification tests (data JSON, in-app suppression, pref defaults, prefs catalog/upsert, expiry email gating) + 3 frontend vitest tests (render+unread, type filter, mark-all+dismiss) — 40 suites / 399 backend + 97 frontend green

### 8.2 WhatsApp Integration
- [ ] WhatsApp Business API connection (Twilio / Meta API / WATI / direct)
- [ ] `whatsapp_templates` table: tenant_id, template_name, language, body_template, variables[]
- [ ] `POST /api/communications/whatsapp/send` — send message
- [ ] `POST /api/communications/whatsapp/templates` — manage templates
- [ ] Template variable substitution engine
- [ ] Message sending queue (high priority first — trip alerts vs promotions)
- [ ] Sent message log with delivery status
- **Frontend pages:**
  - [ ] WhatsApp template management page (list, create/edit template with variable editor)
  - [ ] Send message form (recipient, template selector, variable values preview)
  - [ ] Message log page (table: recipient, template, status, sent at)

### 8.3 SMS / Email
- [ ] SMS provider integration
- [ ] Email provider integration (Resend / SendGrid / SES)
- [ ] Unified send interface: `sendMessage(recipient, channel, template, variables)`
- [ ] Communication preference per customer (SMS / WhatsApp / Email)
- **Frontend pages:**
  - [ ] Communication settings page (provider config, channel enable/disable)
  - [ ] Customer communication preference form (per-customer channel selection)

### 8.4 Automated Notifications (Rule Engine)
- [ ] Trip assigned to driver → notify driver
- [ ] Trip delayed → notify ops manager + all passengers on that trip
- [ ] Trip completed → notify finance (for invoicing)
- [ ] Bus out of service → notify fleet manager
- [ ] Document expiring → notify relevant role
- [ ] Maintenance due → notify fleet manager + maintenance workshop
- [ ] Violation recorded → notify driver + HR
- [ ] Payroll generated → notify finance to review
- **Frontend pages:**
  - [ ] Automation rules page (table: trigger event, action, channel, enabled toggle)
  - [ ] Rule create/edit form (event selector, channel selector, recipient role)

---

## PHASE 9: Real-Time Layer & GPS Integration (Software Side)

### 9.1 WebSocket Infrastructure
- [ ] Socket.IO server on Express
- [ ] Redis adapter for horizontal scaling (multiple instances)
- [ ] Socket authentication middleware (JWT)
- [ ] Client Socket.IO provider (React context)
- [ ] Connection management (join room by tenant_id, user_id)
- **Frontend pages:**
  - [ ] (Infrastructure — no direct page, consumed by all real-time components)

### 9.2 Real-Time Events
- [ ] `trip:status_changed` — push to ops dashboard
- [ ] `trip:delayed` — push to all concerned
- [ ] `trip:position_updated` — push to monitoring room
- [ ] `bus:status_changed` — push to fleet dashboard
- [ ] `alert:ai_event` — push to monitoring room
- [ ] `notification:new` — push to specific user
- **Frontend pages:**
  - [ ] (Consumed by dashboards — live-updating trip cards, bus markers, notification badge)

### 9.3 GPS Data Ingestion (Software)
- [ ] `gps_positions` table: tenant_id, bus_id, device_id, latitude, longitude, speed, heading, altitude, timestamp, ignition_status, odometer_reading
- [ ] `POST /api/gps/ingest` — endpoint for GPS devices to push data (rate-limited)
- [ ] `GET /api/gps/current-positions` — latest position for all buses
- [ ] `GET /api/gps/trip-history` — historical positions for a specific trip
- [ ] GPS data processing pipeline:
  - [ ] Receive raw data
  - [ ] Validate and sanitize
  - [ ] Associate with current trip
  - [ ] Store in time-series efficient format
  - [ ] Emit real-time event
  - [ ] Check geofence rules
  - [ ] Calculate distance from route
- **Frontend pages:**
  - [ ] (Backend/infrastructure — consumed by live map and reports)

### 9.4 Geofencing
- [ ] `geofences` table: tenant_id, name, type (depot, terminal, checkpoint, restricted, holy_site), coordinates (polygon), radius_meters (for circle), rules[]
- [ ] `POST /api/gps/geofences` — create
- [ ] `GET /api/gps/geofences` — list
- [ ] Geofence trigger events:
  - [ ] Bus entered geofence
  - [ ] Bus exited geofence
  - [ ] Bus stayed beyond allowed time
  - [ ] Unauthorized entry to restricted zone
- [ ] Event → notification pipeline
- **Frontend pages:**
  - [ ] Geofences list page (table: name, type, coordinates summary, rules)
  - [ ] Geofence create/edit form (map-based polygon drawing tool, type selector)
  - [ ] Geofence map overlay (polygons displayed on live map, color-coded by type)

### 9.5 Route Deviation Detection
- [ ] `route_corridor` per route (buffer zone around route path)
- [ ] On each GPS position, check: is bus within route corridor?
- [ ] If outside → generate deviation event
- [ ] Deviation alert (monitoring room → ops manager)
- [ ] Deviation tolerance configurable (meters, minutes)
- **Frontend pages:**
  - [ ] Deviation alerts feed in monitoring dashboard (real-time)
  - [ ] Deviation tolerance settings form (meters, minutes per route)

### 9.6 Live Map Dashboard
- [ ] Map component (Google Maps API or Mapbox)
- [ ] Bus markers with real-time position updates
- [ ] Bus popup: plate, speed, driver, trip, status
- [ ] Color-coded markers (green = on_time, yellow = delayed, red = stopped, gray = offline)
- [ ] Trip route polyline on map
- [ ] Geofence polygons on map
- [ ] Playback feature (replay a trip's GPS trail)
- [ ] Filter: show all buses / only active / only delayed
- **Frontend pages:**
  - [ ] Live map dashboard page (full-screen map, bus markers, filter controls)
  - [ ] Bus popup component (plate, speed, driver name, trip status)
  - [ ] Route polyline layer (trip route highlighted on map)
  - [ ] Playback controls (play/pause/scrub bar for replaying trip trail)
  - [ ] Layer toggle panel (buses, routes, geofences, heat map)

### 9.7 Speed Monitoring
- [ ] Speed threshold per bus/route (configurable)
- [ ] Overspeed detection on each GPS update
- [ ] Overspeed event generation
- [ ] Cumulative overspeed report per driver/per trip
- **Frontend pages:**
  - [ ] Speed thresholds settings page (per bus or per route)
  - [ ] Overspeed report page (table: driver, trip, overspeed count, max speed, duration)
  - [ ] Speed alert feed (real-time overspeed events in monitoring sidebar)

---

## PHASE 10: AI Safety Event Integration (Software Side)

> Note: AI detection happens on hardware (ADAS/DMS cameras). This phase is the SOFTWARE layer that receives, stores, displays, and acts on those events.

### 10.1 AI Event Ingestion
- [ ] `ai_events` table: tenant_id, bus_id, trip_id, device_id, event_type (fcw, ldw, fatigue, phone_usage, smoking, seatbelt, pedestrian, blind_spot, speed_limit, rapid_accel, rapid_decel, sharp_turn, headway, driver_absent), severity (info, warning, critical), event_time, location_lat, location_lon, speed_at_event, image_url (snapshot), video_url (clip), raw_data (JSON), processed (boolean)
- [ ] `POST /api/ai/events/ingest` — receive event from MDVR
- [ ] `GET /api/ai/events` — list events (filterable by bus, type, severity, date)
- [ ] `GET /api/ai/events/:id` — event detail with snapshot
- [ ] `GET /api/ai/events/stats` — event statistics (count by type, trend)
- **Frontend pages:**
  - [ ] AI events list page (table filterable by bus, event type, severity, date range)
  - [ ] Event detail modal (snapshot image, event data, linked trip/bus info)
  - [ ] Event stats page (bar chart: count by type; trend line: events over time)

### 10.2 Event Processing Pipeline
- [ ] Real-time: receive event → store → emit via WebSocket → check escalation rules
- [ ] Critical event escalation:
  - [ ] If severity = critical AND event_type in (fatigue, collision_warning, phone_usage_highway) → notify monitoring room immediately
  - [ ] If 3+ events in 5 minutes → escalate
- [ ] Batch processing (nightly) for analytics
- [ ] Events summary per trip (post-trip report)
- **Frontend pages:**
  - [ ] (Pipeline — no direct page; escalation appears as real-time alert)

### 10.3 Driver Scoring (AI-Enhanced)
- [ ] Score calculation using AI events + violations + manual reviews
- [ ] Weighted formula: safety_events (40%), punctuality (20%), customer_feedback (20%), violations (20%)
- [ ] Real-time score updates
- [ ] Score trend chart
- [ ] Score threshold alerts (driver falling below threshold)
- **Frontend pages:**
  - [ ] Driver AI score detail page (radar chart + trend line)
  - [ ] Score threshold settings page (configurable per score component)
  - [ ] Threshold alert banner on driver profile when score drops below limit

### 10.4 Safety Dashboard
- [ ] Live safety event feed (scrollable, auto-updating)
- [ ] Event type distribution (pie chart)
- [ ] Events by bus (ranked)
- [ ] Events by driver (ranked)
- [ ] Safety score leaderboard
- [ ] Critical events timeline
- [ ] Daily safety summary email
- **Frontend pages:**
  - [ ] Safety dashboard page (live feed sidebar, event distribution chart, ranked lists)
  - [ ] Safety score leaderboard (ranked table, color-coded score bars)
  - [ ] Critical events timeline (scrollable chronological list with severity badge)

### 10.5 Incident Management
- [ ] `incidents` table: tenant_id, incident_type (collision, near_miss, fire, medical, assault, theft, accident, other), severity, description, trip_id, bus_id, driver_id, involved_parties[], event_ids[] (linked ai_events), video_urls[], image_urls[], reported_by, reported_at, status (open, investigating, resolved, closed), investigation_notes, resolution_summary
- [ ] `POST /api/safety/incidents` — create incident
- [ ] `GET /api/safety/incidents` — list
- [ ] `GET /api/safety/incidents/:id` — detail
- [ ] `PATCH /api/safety/incidents/:id` — update status
- [ ] `POST /api/safety/incidents/:id/attachments` — upload evidence
- [ ] Incident report generation (PDF)
- **Frontend pages:**
  - [ ] Incidents list page (table filterable by type, severity, status)
  - [ ] Incident detail page (full info, linked AI events, evidence attachments)
  - [ ] Report incident form (type, description, bus/driver/trip selectors, evidence upload)
  - [ ] Status update modal (open → investigating → resolved → closed)
  - [ ] Incident report PDF download button

---

## PHASE 11: Monitoring & Control Room

### 11.1 Control Room Dashboard
- [ ] Full-screen live map view
- [ ] Camera feed tiles (when CCTV integration is ready)
- [ ] Live AI event feed sidebar
- [ ] Trip status summary strip (scheduled / en_route / completed / delayed / cancelled)
- [ ] Global alert banner (severe weather, traffic, security)
- **Frontend pages:**
  - [ ] Control room dashboard page (full-screen layout, map dominant, side panels)
  - [ ] Camera feed tile grid (placeholder tiles ready for CCTV integration)
  - [ ] Live event feed sidebar (scrollable, auto-updating, severity color-coded)
  - [ ] Trip status summary strip (horizontal bar with counts per status)
  - [ ] Global alert banner component (dismissable, severity color-coded)

### 11.2 Multi-View Layout
- [ ] Map view (primary)
- [ ] Camera grid view (2x2, 3x3, 4x4)
- [ ] Split view (map left, cameras right)
- [ ] Trip detail panel (click a bus → see trip info)
- [ ] Quick actions: call driver, send message, escalate alert
- **Frontend pages:**
  - [ ] View switcher controls (Map / Cameras / Split buttons)
  - [ ] Camera grid layout (2x2 / 3x3 / 4x4 selector)
  - [ ] Trip detail slideover panel (opens on bus click, shows trip + driver + actions)
  - [ ] Quick action buttons (call icon, message icon, escalate button)

### 11.3 Alert Management
- [ ] Alert queue with priority sorting
- [ ] Acknowledge alert (monitoring staff)
- [ ] Escalate alert (to supervisor / executive)
- [ ] Resolve alert (with notes)
- [ ] Alert history log
- [ ] Alert SLA (auto-escalate if unacknowledged after X minutes)
- **Frontend pages:**
  - [ ] Alert queue page (table sorted by priority, SLA timer badge)
  - [ ] Acknowledge/Escalate/Resolve action buttons (with notes modal)
  - [ ] Alert history log page (filterable by date, priority, status)
  - [ ] SLA settings form (timeout per priority level)

### 11.4 Video Playback (Software)
- [ ] Video archive browser (by bus, date, trip, event)
- [ ] Video player with scrub controls
- [ ] Jump to event timestamp
- [ ] Download video clip
- [ ] Video retention management (auto-delete after X days, keep events longer)
- **Frontend pages:**
  - [ ] Video archive browser page (search by bus, date range, trip, event type)
  - [ ] Video player component (HTML5 with custom scrub bar, timestamp display)
  - [ ] Jump-to-event markers on scrub bar (clickable dots)
  - [ ] Download clip button
  - [ ] Video retention settings form (default retention days, event retention override)

---

## PHASE 12: Executive Dashboards & Reporting

### 12.1 Executive Dashboard
- [ ] Summary cards: total trips (today), active buses, active drivers, revenue (period)
- [ ] Revenue trend chart (daily / weekly / monthly)
- [ ] Trip completion rate (completed vs scheduled)
- [ ] On-time performance (%)
- [ ] Safety events trend (daily)
- [ ] Top performing / worst performing routes
- [ ] Fleet utilization gauge
- [ ] Profit margin trend
- **Frontend pages:**
  - [ ] Executive dashboard page (KPI cards row + charts grid)
  - [ ] Revenue trend chart (line chart with daily/weekly/monthly toggle)
  - [ ] Fleet utilization gauge (semi-circular gauge component)
  - [ ] Top/worst routes widget (ranked list with up/down arrows)
  - [ ] Profit margin trend chart (area chart)

### 12.2 Operational Reports
- [ ] Daily operations summary (auto-generated PDF)
- [ ] Weekly operations report
- [ ] Monthly performance report
- [ ] Route profitability report
- [ ] Driver performance report
- [ ] Fleet utilization report
- **Frontend pages:**
  - [ ] Operations reports page (report type cards with generate button)
  - [ ] Report preview component (embedded PDF viewer or HTML summary)
  - [ ] Schedule report form (frequency, format, email recipients)

### 12.3 Financial Reports
- [ ] Profit & Loss (date range)
- [ ] Revenue breakdown (by route, customer, period)
- [ ] Expense breakdown (by category, bus, department)
- [ ] Accounts aging
- [ ] Cash flow forecast
- [ ] Budget vs actual
- **Frontend pages:**
  - [ ] Financial reports hub (tabs: P&L, Revenue, Expense, Aging, Cash Flow, Budget)
  - [ ] Date range picker shared across all financial report pages
  - [ ] Budget vs actual chart (side-by-side bar chart with variance %)

### 12.4 Safety Reports
- [ ] Safety incident summary (monthly)
- [ ] Event type distribution
- [ ] Driver safety ranking
- [ ] Bus safety ranking
- [ ] Risk assessment (buses/routes with most events)
- **Frontend pages:**
  - [ ] Safety reports page (date range selector, summary cards)
  - [ ] Safety ranking tables (driver ranking, bus ranking, sortable)
  - [ ] Risk assessment matrix (bus × route heatmap)

### 12.5 Report Scheduling & Export
- [ ] Schedule report generation (daily, weekly, monthly)
- [ ] Auto-email reports to stakeholders
- [ ] Export formats: PDF, Excel, CSV
- [ ] Report archive (access past reports)
- **Frontend pages:**
  - [ ] Report schedule configuration page (list of schedules with enable/disable toggle)
  - [ ] Schedule create/edit form (report type, frequency, recipients, format)
  - [ ] Report archive page (date picker, download links for past reports)

---

## PHASE 13: Hajj & Umrah Module

### 13.1 Hajj Season Management
- [ ] `hajj_seasons` table: tenant_id, year, name, season_start_date, season_end_date, quota_allowed, quota_used, status (planning, active, completed, archived)
- [ ] `POST /api/hajj/seasons` — create season
- [ ] `GET /api/hajj/seasons` — list
- [ ] `GET /api/hajj/seasons/:id` — detail with quota usage
- **Frontend pages:**
  - [ ] Hajj seasons list page (table: year, name, status badge, quota progress bar)
  - [ ] Season create/edit form
  - [ ] Season detail page (quota gauge, group list, movement timeline)

### 13.2 Pilgrim Group Management
- [ ] `pilgrim_groups` table: tenant_id, season_id, group_name, group_code, size, group_leader, contact, accommodation_details (mina_tent, arafat, muzdalifah), transport_schedule_ids[], status
- [ ] `pilgrims` table: group_id, full_name, passport_number, id_number, nationality, date_of_birth, gender, phone, email, emergency_contact, medical_conditions, special_needs, nusuk_reference, status
- [ ] `POST /api/hajj/groups` — create group
- [ ] `GET /api/hajj/groups` — list
- [ ] `GET /api/hajj/groups/:id` — group detail with pilgrim list
- [ ] `PATCH /api/hajj/groups/:id` — update
- [ ] `POST /api/hajj/groups/:id/pilgrims` — add pilgrim
- [ ] `GET /api/hajj/pilgrims/search` — search by name/passport
- [ ] `GET /api/hajj/groups/:id/manifest` — generate pilgrim manifest (PDF)
- [ ] `POST /api/hajj/groups/:id/export` — export for Nusuk system
- [ ] Pilgrim check-in/check-out for bus boarding
- **Frontend pages:**
  - [ ] Pilgrim groups list page (table: group name, code, size, leader, status)
  - [ ] Group create/edit form (name, code, leader, accommodation fields)
  - [ ] Group detail page (pilgrim data table, check-in/out controls, manifest button)
  - [ ] Add pilgrim form (inline or modal: name, passport, nationality, medical info)
  - [ ] Pilgrim search page (search by name/passport across all groups)
  - [ ] Manifest PDF download button
  - [ ] Nusuk export button
  - [ ] Pilgrim check-in/check-out UI (scan or manual toggle per pilgrim)

### 13.3 Hajj-Specific Routes & Movements
- [ ] Pre-defined Hajj movement templates:
  - [ ] Makkah → Mina (Day of Tarwiyah)
  - [ ] Mina → Arafat (Day of Arafah)
  - [ ] Arafat → Muzdalifah (Night of Muzdalifah)
  - [ ] Muzdalifah → Mina (Ramy al-Jamarat)
  - [ ] Mina → Makkah (Tawaf al-Ifadah)
  - [ ] Makkah → Mina (remaining days)
  - [ ] Mina → Makkah (final departure)
- [ ] Movement scheduling per group
- [ ] `GET /api/hajj/movements` — movement timeline for season
- [ ] `POST /api/hajj/movements` — schedule movement
- [ ] `GET /api/hajj/movements/timeline` — Gantt chart view for all groups
- **Frontend pages:**
  - [ ] Movement templates page (pre-defined list, one-click assign to group)
  - [ ] Movement schedule form (group selector, movement template, date/time)
  - [ ] Movement Gantt chart page (groups on Y axis, days on X, colored bars per movement)
  - [ ] Movement timeline view (chronological list of all movements across groups)

### 13.4 Nusuk Integration
- [ ] Nusuk API connection (Saudi Ministry of Hajj & Umrah platform)
- [ ] Pilgrim data sync (SEUM → Nusuk)
- [ ] Visa/permit status tracking
- [ ] `GET /api/hajj/nusuk/status` — Nusuk compliance status
- [ ] Compliance report generation
- **Frontend pages:**
  - [ ] Nusuk integration status page (connection status, last sync timestamp)
  - [ ] Sync now button (with progress indicator)
  - [ ] Compliance report page (table: pilgrim name, visa status, permit status, sync status)

### 13.5 Hajj-Specific Dashboard
- [ ] Total pilgrims under management
- [ ] Quota utilization (used / remaining)
- [ ] Group distribution (how many groups, sizes)
- [ ] Movement completion status
- [ ] Pilgrim attendance (checked in on bus)
- [ ] Lost pilgrim alerts (checked out but not returned)
- **Frontend pages:**
  - [ ] Hajj dashboard page (KPI cards: pilgrims, quota %, groups, movements)
  - [ ] Quota utilization gauge (filled vs remaining)
  - [ ] Group distribution pie chart (by size range)
  - [ ] Movement completion status bar (scheduled vs completed %)
  - [ ] Pilgrim attendance card (checked in / total)
  - [ ] Lost pilgrim alert list (red badge, pilgrim name, last seen time/location)

---

## PHASE 14: Customer Portals (B2C Website & B2B Portal)

> Client scope: B2B Website and B2C Website are current-phase booking channels (only WhatsApp/chatbot is future).
>
> **Revenue cut line:** Phases 0–13 = the operational engine (built). Phases 14–15 = go-live critical — without these, no customer can book or pay online. Everything before is enabling; this is where customers + money meet.

### 14.1 Public Booking API (Backend Foundation)
- [ ] Public endpoints (no internal session; token/rate-limited): `GET /api/v1/public/trips` (published trip search by route/date), `GET /api/v1/public/trips/:id/availability`, `POST /api/v1/public/bookings` (guest booking create), `GET /api/v1/public/bookings/:reference` (status lookup by reference), `POST /api/v1/public/bookings/:id/payment-link`
- [ ] `channel` tag written on every public booking (`b2c_website` / `b2b_portal`) — consumes Phase 7.8 field
- [ ] Public rate limiting + abuse protection (captcha/OTP on portal login)
- [ ] Customer-facing status reads from `booking_status_history` (Phase 7.6) — history visible to customer, actor names masked for privacy

### 14.2 B2C Website
- [ ] Homepage: trip search (route selector, date picker, timetable)
- [ ] Trip schedule page (search result list with seats/fares)
- [ ] Online booking flow: select trip → seat map → passenger info → review price → pay → confirm
- [ ] Ticket download page (PDF preview + download; reuses Phase 7.2 ticket endpoint)
- [ ] Booking lookup by reference with status/payment badges
- [ ] Booking history (customer login required)
- [ ] Live bus tracking page (map with bus position for booked trip — consumes Phase 9 GPS layer)
- [ ] Guest booking without login (contact info + booking reference as identifier)

### 14.3 B2B Portal
- [ ] Company login (auth for company customers — user accounts linked to `customers`/`companies`)
- [ ] Create booking request: company/customer info, trip info, date, time, pickup, destination, passenger count, trip/service type, additional requirements, quotation/selling price
- [ ] Submit → request lands in central queue as `pending_approval` (Phase 7.6)
- [ ] Status tracking: request lifecycle, approvals, assignment (vehicle/driver), notifications
- [ ] Excel upload (reuses Phase 7.7 template + validation)
- [ ] Booking history + per-request status timeline (from `booking_status_history`)
- [ ] Resubmit rejected requests (rejection reason shown)

### 14.4 Portal Frontend & Infrastructure
- [ ] Public Next.js routes outside the dashboard shell (`/`, `/trips`, `/book`, `/payment/return`, `/portal`)
- [ ] B2B portal pages: login, dashboard (my requests/status), create request form, request detail, upload page
- [ ] Payment redirect/return pages (consume Phase 15 payment link/gateway)
- [ ] Shared public components/API client (separate from dashboard shell)

---

## PHASE 15: Payment & Billing

> Current scope — required by the B2C channel. Cash/manual recording already exists (Phase 7.2 booking `paid_amount`); this phase adds the online layer.

### 15.1 Payment Processing
- [ ] `payments` table: tenant_id, reference_type (invoice, booking, expense), reference_id, amount, payment_method (cash, bank_transfer, card, mada, stc_pay, apple_pay), payment_date, transaction_id, status, notes
- [ ] `POST /api/payments` — record payment
- [ ] `GET /api/payments` — list
- [ ] `GET /api/payments/:id` — detail
- [ ] `POST /api/payments/reconcile` — reconcile with bank statement
- [ ] Payment gateway integration (Mada, STC Pay, Apple Pay)
- [ ] Payment link generation (share via WhatsApp)
- [ ] Payment link per booking: generate + send (WhatsApp/email), track status (pending/paid/failed), expiry/void on refund
- [ ] Payment webhook → auto-confirm booking (payment_status paid → booking `confirmed`, feeds Phase 7.6 workflow)
- [ ] **Frontend pages:**
  - [ ] Payments list page (table filterable by method, status, date)
  - [ ] Record payment form (reference type search, amount, method, date)
  - [ ] Payment detail modal
  - [ ] Reconciliation page (match payments to bank transactions)
  - [ ] Payment link generator (amount, reference, generate shareable link; send from booking detail)

### 15.2 ZATCA E-Invoicing (Saudi Compliance)
- [ ] ZATCA Phase 2 compliance:
  - [ ] Invoice UUID (UUID v4)
  - [ ] Invoice timestamp (ISO 8601)
  - [ ] Seller details (name, VAT number)
  - [ ] Buyer details
  - [ ] Invoice line items with VAT amounts
  - [ ] Total with VAT
  - [ ] QR code generation (TLV format)
  - [ ] XML generation (ZATCA format)
  - [ ] Cryptographic stamping
- [ ] `POST /api/zatca/onboard` — register with ZATCA (production/CSID)
- [ ] `POST /api/zatca/sign-invoice` — sign and submit invoice
- [ ] `GET /api/zatca/compliance-status` — compliance dashboard
- **Frontend pages:**
  - [ ] ZATCA compliance dashboard page (onboarding status, compliance %)
  - [ ] ZATCA onboard form (company credentials, certificate upload)
  - [ ] Invoice signing status indicator on invoice detail page
  - [ ] ZATCA QR code display on invoice PDF

---

## PHASE 16: System Admin & Settings

### 16.1 System Configuration
- [ ] `system_config` table: tenant_id, config_key, config_value
- [ ] Config key examples:
  - Company name, logo, address, VAT number
  - Invoice numbering format
  - Currency (SAR default)
  - Timezone
  - Date format
  - Language (Arabic / English)
  - Trip auto-completion rules
  - Notification preferences
- [ ] `GET /api/settings` — get tenant settings
- [ ] `PATCH /api/settings` — update settings
- **Frontend pages:**
  - [ ] System settings page (form with sections: company info, localization, trip rules, notifications)
  - [ ] Company logo upload with preview
  - [ ] Language switcher (Arabic/English toggle in settings)

### 16.2 User Management (Tenant Level)
- [ ] `GET /api/users` — list users
- [ ] `POST /api/users/invite` — invite user via email
- [ ] `PATCH /api/users/:id/roles` — update roles
- [ ] `PATCH /api/users/:id/activate` — activate/deactivate
- [ ] `DELETE /api/users/:id` — remove user
- **Frontend pages:**
  - [ ] Users list page (table: name, email, roles, status, last login)
  - [ ] Invite user form (email, role selector, optional message)
  - [ ] User roles editor (multi-select or checkboxes)
  - [ ] Activate/deactivate toggle (with confirmation)
  - [ ] Remove user action (with confirmation, cascade options)

### 16.3 Backup & Data Management
- [ ] Manual backup trigger
- [ ] Backup schedule configuration
- [ ] Backup restore (super admin only)
- [ ] Data retention policy configuration
- [ ] Data export (full tenant export for GDPR/compliance)
- **Frontend pages:**
  - [ ] Backup management page (manual backup button, list of backups with timestamps)
  - [ ] Backup schedule form (frequency, time, retention count)
  - [ ] Restore button (with file picker, super admin only, confirmation)
  - [ ] Data retention settings form (audit log days, archive config)
  - [ ] Data export button (triggers full tenant export download)

### 16.4 Logs & Monitoring (Infrastructure)
- [ ] API request/response log viewer
- [ ] Error log viewer (grouped by type)
- [ ] Performance monitoring (response times, endpoint stats)
- [ ] Active user sessions
- **Frontend pages:**
  - [ ] API logs page (table: endpoint, method, status, response time, timestamp; filterable)
  - [ ] Error logs page (grouped by error type, expandable detail, time range filter)
  - [ ] Performance monitoring page (response time chart, endpoint stats table, slowest endpoints)
  - [ ] Active sessions page (table: user, login time, IP, current page)

---

## PHASE 17: Hotel & Multi-Business Expansion (Future)

### 17.1 Hotel Management (Basic)
- [ ] `hotels` table: tenant_id, name, address, contact, star_rating, room_types[], contract_start, contract_end, contract_rate
- [ ] `hotel_bookings` table: hotel_id, group_id, check_in, check_out, room_count, room_type, total_cost, status
- [ ] Room inventory tracking
- [ ] Check-in/check-out management
- **Frontend pages:**
  - [ ] Hotels list page (cards: name, address, star rating, contract dates)
  - [ ] Hotel create/edit form
  - [ ] Hotel detail page (room types, contract info, booking list)
  - [ ] Hotel booking form (group selector, room type, dates)
  - [ ] Check-in/check-out UI per booking

### 17.2 Multi-Business Profile
- [ ] A single tenant can have multiple business profiles (transport, hotel, tours)
- [ ] Module switching within same login
- **Frontend pages:**
  - [ ] Business profile switcher (dropdown in sidebar header)
  - [ ] Business profile management page (list, create, activate)

### 17.3 Customer Extras
- [ ] Live bus tracking page (map with bus position for booked trip)

---

## CROSS-CUTTING CONCERNS (Applied Throughout)

### Performance & Scaling
- Database indexing strategy documented per table
- API pagination (cursor-based for large datasets, offset-based for small)
- Response caching (Redis for frequent read queries)
- Rate limiting per endpoint tier (auth strict, reads medium, writes standard)
- N+1 query prevention in all list endpoints

### Security
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection
- Helmet.js headers
- CORS configuration (tight, not wildcard)
- File upload validation (type, size, scan)
- API key rotation for external integrations
- Session timeout configuration

### Internationalization
- i18n setup (next-intl or similar)
- Arabic RTL support
- English ↔ Arabic in all UI labels
- Hijri date support alongside Gregorian
- Currency formatting (SAR with Arabic numerals)

### Data Validation
- Zod or Joi schemas on all API inputs
- Consistent error response format
- Input sanitization
- Business rule validation layer (not just type validation)

---

## DEVELOPMENT PRINCIPLES FOR THIS LIFECYCLE

1. **Phase order is intentional** — each phase builds on the previous. Do not skip phases.
2. **Within each phase, build in this order:** Database schema → API endpoints → Backend logic → Frontend pages → Manual test
3. **Every sub-bullet is a testable unit.** After checking off a sub-bullet, you should be able to manually verify it works before moving on.
4. **Seed data is your friend.** After each phase, update the seed script so you can reset and re-test quickly.
5. **No feature is "done" until you've walked through it with real data.** Don't rely on automated tests alone for this project's complexity.
6. **When in doubt, build the simplest version that works.** You can always add validation, edge cases, and polish later. Don't let perfectionism block progress.

---

*End of document. This lifecycle covers all software features of the SEUM ERP platform across 17 phases and hundreds of individual implementable units.*
