# SEUM ERP — Full Software Development Lifecycle

> This document covers ONLY the software platform. Hardware (MDVR, ADAS, DMS, BSD, GPS devices, CCTV cameras, LED/LCD displays, etc.) is excluded.

---

## PHASE 0: Foundation & Infrastructure

### 0.1 Project Scaffolding
- [ ] Next.js 14/15 app with TypeScript and `app/` directory
- [ ] Express.js backend in a `backend/` directory (or as a monorepo with turborepo)
- [ ] PostgreSQL database setup with connection pooling
- [ ] Docker Compose for local dev (PostgreSQL, Redis)
- [ ] Environment config (.env.local, .env.production)
- [ ] ESLint + Prettier configuration
- [ ] Shared TypeScript types package (`packages/shared`)

### 0.2 Database Foundation
- [ ] Migration tool setup (node-pg-migrate, Prisma Migrate, or Knex)
- [ ] Seed script foundation
- [ ] Base schema:
  - `tenants` (companies / organizations)
  - `users` (all roles, linked to tenant)
  - `roles` (enum or table: super_admin, company_admin, ops_manager, fleet_manager, driver, hr, finance, monitoring, customer_service, executive, maintenance)
  - `user_roles` (junction for users with multiple roles)
  - `permissions` (resource + action)
  - `role_permissions`
  - `audit_logs` (who did what, when, to which resource)
  - `sessions` (JWT refresh tokens)

### 0.3 Authentication & Authorization
- [ ] POST `/api/auth/login` — email/password, returns access + refresh tokens
- [ ] POST `/api/auth/register` — super admin creates company admin (not self-registration)
- [ ] POST `/api/auth/refresh` — refresh access token
- [ ] POST `/api/auth/logout` — invalidate token
- [ ] JWT middleware — verify token, decode tenant + role
- [ ] RBAC middleware — `requirePermission(resource, action)` factory
- [ ] Password hashing (bcrypt, 12+ rounds)
- [ ] Rate limiting on auth endpoints
- [ ] Login attempt lockout (5 failed attempts → 15 min block)
- [ ] Forgot password flow (email with reset link)
- [ ] Reset password endpoint

### 0.4 Multi-Tenant Architecture
- [ ] Row-level tenant isolation (all tables have `tenant_id`)
- [ ] ORM/query builder scoped to tenant automatically
- [ ] Tenant creation flow (super admin only):
  - [ ] `POST /api/tenants` — name, domain, contact info, subscription tier
  - [ ] `GET /api/tenants` — list all (super admin)
  - [ ] `GET /api/tenants/:id` — tenant details
  - [ ] `PATCH /api/tenants/:id` — update tenant
  - [ ] `DELETE /api/tenants/:id` — soft delete tenant
- [ ] Subscription / plan model (tier, features, limits, billing cycle)
- [ ] Feature flags per tenant (which modules are enabled)
- **Frontend pages:**
  - [ ] Tenants list page (super admin, with search/filter/pagination)
  - [ ] Tenant create/edit form page
  - [ ] Tenant detail/dashboard page (subscription info, usage stats)
  - [ ] Subscription plan management page (super admin)

### 0.5 Audit Logging System
- [ ] Automatic audit log on every CUD operation
- [ ] Audit log schema: `actor_id`, `action`, `resource`, `resource_id`, `old_value`, `new_value`, `ip_address`, `user_agent`, `timestamp`
- [ ] `GET /api/audit-logs` — filterable by tenant, user, resource, date range
- [ ] Audit log retention policy (configurable, auto-archive)
- **Frontend pages:**
  - [ ] Audit log viewer page (filterable table with date range, user, resource type pickers)
  - [ ] Audit log detail expandable row or modal

### 0.6 UI Shell
- [ ] Login page
- [ ] Forgot password / reset password pages
- [ ] Main layout with sidebar navigation (role-dependent)
- [ ] User avatar / dropdown (profile, logout)
- [ ] Responsive sidebar (collapsible on mobile)
- [ ] Notification bell (real-time notification count)
- [ ] Theme toggle (light/dark mode)

### 0.7 Error Handling & Logging
- [ ] Global Express error handler middleware
- [ ] Structured logging (pino or winston)
- [ ] API response envelope: `{ success: boolean, data?: T, error?: { code, message, details } }`
- [ ] Client-side error boundary
- [ ] Toast / notification component for API errors

---

## PHASE 1: Fleet Management

### 1.1 Bus / Vehicle Master
- [ ] `buses` table: tenant_id, plate_number, chassis_number, make, model, year, capacity (seated + standing), color, VIN, engine_number, fuel_type, status (active, maintenance, retired, sold), purchase_date, purchase_price, assigned_depot
- [ ] `POST /api/fleet/buses` — create bus
- [ ] `GET /api/fleet/buses` — list buses (filterable by status, depot)
- [ ] `GET /api/fleet/buses/:id` — single bus detail
- [ ] `PATCH /api/fleet/buses/:id` — update bus info
- [ ] `DELETE /api/fleet/buses/:id` — soft delete
- [ ] `GET /api/fleet/buses/:id/history` — full bus lifecycle history
- **Frontend pages:**
  - [ ] Buses list page (table with search/filter by status, depot, plate; pagination)
  - [ ] Bus detail page (full info, status badge, lifecycle history timeline)
  - [ ] Bus create/edit form (all fields with validation)
  - [ ] Bus history timeline component (lifecycle events chronologically)

### 1.2 Vehicle Documents
- [ ] `bus_documents` table: bus_id, document_type (registration, insurance, permit, inspection, fitness, road_tax), document_number, issue_date, expiry_date, file_url, status
- [ ] `POST /api/fleet/buses/:id/documents` — upload document
- [ ] `GET /api/fleet/buses/:id/documents` — list documents
- [ ] `PATCH /api/fleet/buses/:id/documents/:docId` — update
- [ ] `DELETE /api/fleet/buses/:id/documents/:docId` — remove
- [ ] Auto-detect expiring documents (30/14/7 days before) → create notification
- [ ] Document expiry dashboard widget
- **Frontend pages:**
  - [ ] Documents list page per bus (table with document type, expiry, status)
  - [ ] Document upload form (file picker, type selector, date fields)
  - [ ] Expiry badge/banner component (green=ok, yellow=30d, orange=14d, red=7d)
  - [ ] Document expiry dashboard widget (summary card for fleet dashboard)

### 1.3 Bus Readiness & Status
- [ ] `bus_readiness` table: bus_id, status (ready, in_maintenance, out_of_service, reserved), checked_by, checked_at, notes, next_scheduled_maintenance_km, next_scheduled_maintenance_date
- [ ] `POST /api/fleet/readiness` — update readiness status
- [ ] `GET /api/fleet/readiness` — current readiness for all buses (color-coded)
- [ ] Fleet dashboard: grid of all buses with readiness indicator (green/yellow/red)
- [ ] Prevent trip assignment to non-ready buses
- **Frontend pages:**
  - [ ] Fleet readiness dashboard (card grid, each bus = card with color-coded status indicator)
  - [ ] Readiness status update modal (dropdown + notes field)
  - [ ] Quick-filters: show ready / maintenance / out-of-service only

### 1.4 Fuel Tracking
- [ ] `fuel_logs` table: bus_id, date, liters, cost_per_liter, total_cost, odometer_reading, station_name, fuel_type, receipt_url, filled_by
- [ ] `POST /api/fleet/fuel` — log fuel fill
- [ ] `GET /api/fleet/fuel` — fuel logs (filterable by bus, date range)
- [ ] `GET /api/fleet/fuel/analytics` — avg km/liter, cost per km, trend chart
- [ ] Fuel efficiency alerts (sudden drop indicates theft or maintenance issue)
- **Frontend pages:**
  - [ ] Fuel logs page (table filterable by bus, date range; receipt image preview)
  - [ ] Fuel log entry form (inline or modal)
  - [ ] Fuel analytics page (trend chart: km/liter over time; avg cost per km card)
  - [ ] Efficiency alert banner (shown on fleet dashboard when drop detected)

### 1.5 Bus Assignment & Scheduling
- [ ] `POST /api/fleet/assign` — assign bus to a depot / route / driver
- [ ] `GET /api/fleet/assignments` — current and upcoming assignments
- [ ] `PATCH /api/fleet/assignments/:id` — update / reassign
- [ ] Bus calendar view (which bus is where, when)
- **Frontend pages:**
  - [ ] Assignments list page (table with bus, route, driver, dates)
  - [ ] Assignment create/edit modal (bus selector, route, driver, date range)
  - [ ] Bus calendar view (monthly calendar, each bus row, trip blocks as colored bars)

### 1.6 Fleet Analytics Dashboard
- [ ] Total buses count (active, maintenance, retired)
- [ ] Fleet utilization rate (% of buses in use vs available)
- [ ] Average bus age
- [ ] Upcoming document renewals
- [ ] Fuel efficiency trends (km/liter over time)
- [ ] Maintenance cost per bus
- [ ] Export fleet report (PDF / CSV)
- **Frontend pages:**
  - [ ] Fleet analytics dashboard page (summary cards + charts: utilization gauge, bus age bar, fuel trend line)
  - [ ] Upcoming renewals widget (sorted list with countdown days)
  - [ ] Export report button (PDF / CSV dropdown)
  - [ ] Maintenance cost per bus chart

---

## PHASE 2: Trip & Operations Management

### 2.1 Route Master
- [ ] `routes` table: tenant_id, name, code, origin, destination, distance_km, estimated_duration_minutes, description, route_type (regular, hajj, umrah, charter, shuttle), status
- [ ] `route_stops` table: route_id, stop_name, stop_order, latitude, longitude, estimated_arrival_minutes
- [ ] `POST /api/operations/routes` — create route
- [ ] `GET /api/operations/routes` — list routes
- [ ] `GET /api/operations/routes/:id` — route with stops
- [ ] `PATCH /api/operations/routes/:id` — update
- [ ] `DELETE /api/operations/routes/:id` — soft delete
- [ ] `POST /api/operations/routes/:id/stops` — add stop
- [ ] `DELETE /api/operations/routes/:id/stops/:stopId` — remove stop
- [ ] Route visualization on map
- **Frontend pages:**
  - [ ] Routes list page (table with origin/destination, type tags, status)
  - [ ] Route detail page (map with route polyline + stops as markers)
  - [ ] Route create/edit form (origin/destination autocomplete, stop order drag-and-drop)
  - [ ] Route map visualization component (polyline + stop markers + info popups)

### 2.2 Trip Scheduling
- [ ] `trips` table: tenant_id, route_id, bus_id, driver_id, trip_type, scheduled_date, scheduled_start_time, scheduled_end_time, actual_start_time, actual_end_time, status (scheduled, en_route, completed, cancelled, delayed), delay_minutes, delay_reason, notes, rejection_reason, created_by, approved_by
- [ ] `trip_passengers` table: trip_id, passenger_name, passenger_id_number, contact_number, seat_number, booking_reference
- [ ] `POST /api/operations/trips` — create trip (operations manager)
- [ ] `GET /api/operations/trips` — list trips (filterable by date, status, bus, route, driver)
- [ ] `GET /api/operations/trips/:id` — trip detail with full timeline
- [ ] `PATCH /api/operations/trips/:id` — update trip
- [ ] `DELETE /api/operations/trips/:id` — cancel trip
- [ ] `POST /api/operations/trips/:id/start` — mark trip as en_route
- [ ] `POST /api/operations/trips/:id/complete` — mark trip as completed
- [ ] `POST /api/operations/trips/:id/delay` — report delay (reason, estimated new time)
- [ ] `POST /api/operations/trips/:id/cancel` — cancel with reason
- [ ] Trip calendar view (daily / weekly / monthly)
- [ ] Trip timeline card (visual: scheduled → en_route → completed)
- **Frontend pages:**
  - [ ] Trips list page (table filterable by date range, status, bus, route, driver)
  - [ ] Trip create form (route selector fills bus/driver suggestions, date/time pickers)
  - [ ] Trip detail page (full info + status timeline + passenger list)
  - [ ] Trip status action buttons (Start / Complete / Delay / Cancel with reason modal)
  - [ ] Trip calendar view (daily/weekly/monthly toggle, trip blocks on calendar)
  - [ ] Trip timeline card component (stepper: scheduled → en_route → completed)

### 2.3 Recurring Trips
- [ ] `recurring_trip_patterns` table: route_id, bus_id, driver_id, frequency (daily, weekdays, weekends, custom_days), days_of_week, start_date, end_date, specific_dates[]
- [ ] `POST /api/operations/recurring-trips` — create pattern
- [ ] `GET /api/operations/recurring-trips` — list patterns
- [ ] `POST /api/operations/recurring-trips/:id/generate` — generate actual trips for date range
- [ ] Auto-generation cron job (weekly trips for next 2 weeks)
- **Frontend pages:**
  - [ ] Recurring patterns list page (frequency badge, route, bus, driver)
  - [ ] Recurring pattern create/edit form (day-of-week checkboxes, date range picker)                        ----------DONE
  - [ ] Generate trips button + date range picker modal

### 2.4 Driver Assignment to Trips
- [ ] `POST /api/operations/trips/:id/assign-driver` — assign driver to trip
- [ ] `GET /api/operations/drivers/available` — list available drivers (not on another trip, not on leave)
- [ ] Driver schedule view (all trips assigned to a specific driver)
- [ ] Driver trip notification (push / SMS / WhatsApp when assigned)
- [ ] Driver trip confirmation flow (accept / reject trip)
- **Frontend pages:**
  - [ ] Driver assign modal on trip detail (avail driver list with status indicators)
  - [ ] Driver schedule page (day/week view, all trips assigned to selected driver)
  - [ ] Trip confirmation status badge (accepted/rejected/pending on trip card)

### 2.5 Trip Monitoring (Pre-GPS)
- [ ] Manual status override buttons for control room
- [ ] Trip status update via SMS/call (when no GPS)
- [ ] Trip timeline with manual timestamps
- [ ] Expected vs actual timeline comparison
- [ ] Delay dashboard: all delayed trips with reason and estimated resolution
- **Frontend pages:**
  - [ ] Trip monitoring dashboard (list of active trips with status controls)
  - [ ] Timeline comparison component (expected bar vs actual bar side-by-side)
  - [ ] Delay dashboard (table: route, bus, delay min, reason, estimated resolution)
  - [ ] Manual status override buttons (large, role-protected)

### 2.6 Trip Reports
- [ ] Daily trip summary (total trips, completed, delayed, cancelled)
- [ ] Driver performance per trip (on-time, late, incidents)
- [ ] Route performance (average duration, delay frequency)
- [ ] Bus utilization per trip
- [ ] Export trip report (PDF / CSV)
- **Frontend pages:**
  - [ ] Trip reports page (date range picker, summary cards, detailed tables)
  - [ ] Driver performance table (sortable by on-time %, incidents count)
  - [ ] Route performance table (avg duration, delay frequency %)
  - [ ] Export button dropdown (PDF / CSV)

---

## PHASE 3: Driver Management

### 3.1 Driver Master
- [ ] `drivers` table: tenant_id, user_id, employee_code, license_number, license_expiry, license_category, passport_number, nationality, date_of_birth, hire_date, emergency_contact_name, emergency_contact_phone, blood_type, medical_fitness_expiry, status (active, suspended, terminated, on_leave)
- [ ] `driver_documents` table: driver_id, document_type, number, issue_date, expiry_date, file_url
- [ ] `POST /api/hr/drivers` — create driver profile
- [ ] `GET /api/hr/drivers` — list drivers (filterable by status, nationality)
- [ ] `GET /api/hr/drivers/:id` — full driver profile
- [ ] `PATCH /api/hr/drivers/:id` — update
- [ ] `DELETE /api/hr/drivers/:id` — soft delete
- [ ] Driver photo upload
- [ ] License expiry alerts (30 days before)
- [ ] Medical fitness expiry alerts
- **Frontend pages:**
  - [ ] Drivers list page (table with photo thumb, status badge, nationality filter)
  - [ ] Driver profile page (photo, all fields, documents tab, attendance tab)
  - [ ] Driver create/edit form (with photo upload, document upload sections)
  - [ ] Expiry alert badges (license, medical) on driver cards

### 3.2 Driver Attendance
- [ ] `driver_attendance` table: driver_id, date, check_in_time, check_out_time, status (present, absent, late, half_day, on_leave), late_minutes, notes
- [ ] `POST /api/hr/attendance/check-in` — clock in
- [ ] `POST /api/hr/attendance/check-out` — clock out
- [ ] `GET /api/hr/attendance` — attendance records (filterable by driver, date range)
- [ ] `POST /api/hr/attendance/manual` — HR override / correction
- [ ] Auto-detect: driver on trip = present (auto check-in)
- [ ] Monthly attendance summary (present days, absent, late count)
- [ ] Attendance dashboard widget
- **Frontend pages:**
  - [ ] Attendance page (calendar view or table filterable by driver/date)
  - [ ] Check-in / Check-out button (large, with timestamp display)
  - [ ] Manual correction modal (HR only, override status + notes)
  - [ ] Monthly summary card (present/absent/late counts with %)
  - [ ] Attendance dashboard widget (today's absent/late counts)

### 3.3 Driver Leave Management
- [ ] `driver_leaves` table: driver_id, leave_type (annual, sick, emergency, unpaid), start_date, end_date, reason, status (pending, approved, rejected), approved_by, documents[]
- [ ] `POST /api/hr/leaves` — apply for leave
- [ ] `GET /api/hr/leaves` — list leaves
- [ ] `PATCH /api/hr/leaves/:id/approve` — approve (company admin / HR)
- [ ] `PATCH /api/hr/leaves/:id/reject` — reject with reason
- [ ] Leave calendar
- [ ] Remaining leave balance tracking
- [ ] Auto-block driver from trip assignment during leave period
- **Frontend pages:**
  - [ ] Leave list page (table filterable by status, driver, date range)
  - [ ] Apply leave form (type selector, date range, reason, document upload)
  - [ ] Approve/Reject action buttons on pending leaves (with reason modal for reject)
  - [ ] Leave calendar view (driver rows, leave blocks color-coded by type)
  - [ ] Leave balance card (annual used/remaining, sick, etc.)

### 3.4 Driver Violations & Incidents
- [ ] `driver_violations` table: driver_id, trip_id, violation_type (speeding, phone_usage, fatigue, lane_departure, seatbelt, smoking, route_deviation, customer_complaint, accident), severity (minor, major, critical), description, recorded_at, action_taken, action_taken_by, status (open, resolved, disputed)
- [ ] `POST /api/hr/violations` — record violation
- [ ] `GET /api/hr/violations` — list violations
- [ ] `PATCH /api/hr/violations/:id` — update status / action taken
- [ ] `GET /api/hr/violations/:id/dispute` — driver can dispute
- [ ] Violation points system (accumulate points → automatic suspension)
- [ ] Driver safety score (auto-calculated from violations history)
- **Frontend pages:**
  - [ ] Violations list page (table with severity color badge, driver, type, status)
  - [ ] Record violation form (type dropdown, severity, description, driver selector)
  - [ ] Violation detail modal (full info, action taken, dispute button)
  - [ ] Dispute form (driver-side, reason text + evidence upload)
  - [ ] Safety score card (score number, color gauge, trend arrow)

### 3.5 Driver Performance Scoring
- [ ] `driver_scores` table: driver_id, period_start, period_end, safety_score, punctuality_score, customer_score, fuel_efficiency_score, overall_score, computed_by, computed_at
- [ ] `POST /api/hr/drivers/:id/compute-score` — compute score for period
- [ ] `GET /api/hr/drivers/:id/scores` — score history
- [ ] `GET /api/hr/drivers/leaderboard` — top/bottom drivers
- [ ] Score breakdown visualization (radar chart)
- [ ] Score → incentive/promotion recommendation
- **Frontend pages:**
  - [ ] Score history chart page (line chart: overall score over periods)
  - [ ] Score breakdown radar chart (safety, punctuality, customer, fuel)
  - [ ] Driver leaderboard page (ranked table with score bars, top/bottom tabs)
  - [ ] Incentive recommendation card (shown when score > threshold)

### 3.6 Driver Payroll (Basic)
- [ ] `driver_payroll` table: driver_id, period_start, period_end, base_salary, trip_allowance, overtime_hours, overtime_rate, bonuses, deductions, total_payable, status (draft, approved, paid), paid_at, payment_reference
- [ ] `POST /api/hr/payroll/generate` — generate payroll for period
- [ ] `GET /api/hr/payroll` — payroll history
- [ ] `PATCH /api/hr/payroll/:id/approve` — approve (finance)
- [ ] `PATCH /api/hr/payroll/:id/pay` — mark as paid
- [ ] Payslip generation (PDF)
- [ ] Trip-based allowance auto-calculation (per trip × trip rate)
- **Frontend pages:**
  - [ ] Payroll list page (period, driver count, total payable, status badge)
  - [ ] Payroll detail page (per-driver breakdown table: base, allowances, deductions, net)
  - [ ] Generate payroll form (period selector, preview before finalize)
  - [ ] Approve/Pay action buttons (with confirmation modal, role-protected)
  - [ ] Payslip view modal (printable, shows all line items)

---

## PHASE 4: Accounting & Finance

### 4.1 Chart of Accounts
- [ ] `accounts` table: tenant_id, code, name, type (asset, liability, equity, revenue, expense), parent_account_id, is_active, description
- [ ] Seed default accounts (cash, bank, accounts_receivable, accounts_payable, fuel_expense, salary_expense, maintenance_expense, trip_revenue, etc.)
- [ ] `POST /api/accounts` — create account
- [ ] `GET /api/accounts` — list (tree structure)
- [ ] `PATCH /api/accounts/:id` — update
- **Frontend pages:**
  - [ ] Chart of accounts page (tree view, expandable parent/child, type badges)
  - [ ] Account create/edit form (code, name, type, parent selector)
  - [ ] Account detail slideover (current balance, recent transactions)

### 4.2 Journal Entries
- [ ] `journal_entries` table: tenant_id, entry_number (auto), date, description, reference_type, reference_id, created_by, status (draft, posted)
- [ ] `journal_entry_lines` table: journal_entry_id, account_id, debit_amount, credit_amount, description
- [ ] `POST /api/accounting/journal-entries` — create journal entry
- [ ] `GET /api/accounting/journal-entries` — list entries
- [ ] `GET /api/accounting/journal-entries/:id` — entry detail
- [ ] `POST /api/accounting/journal-entries/:id/post` — post entry (locks it)
- [ ] Double-entry validation (debits = credits)
- [ ] Auto-numbering based on configurable format
- **Frontend pages:**
  - [ ] Journal entries list page (table with date, number, description, status, total)
  - [ ] Journal entry create form (dynamic line items table: account picker, debit/credit)
  - [ ] Entry detail page (locked after posting, shows all lines with running balance)
  - [ ] Post action button (with confirmation, role-protected)

### 4.3 Invoicing
- [ ] `invoices` table: tenant_id, invoice_number, customer_name, customer_contact, invoice_date, due_date, subtotal, tax_amount, total, status (draft, issued, paid, overdue, cancelled, refunded), reference_trip_ids[], notes
- [ ] `invoice_line_items` table: invoice_id, description, quantity, unit_price, total, account_id, trip_id
- [ ] `POST /api/accounting/invoices` — create invoice
- [ ] `GET /api/accounting/invoices` — list invoices (filterable by status, date, customer)
- [ ] `GET /api/accounting/invoices/:id` — invoice detail
- [ ] `PATCH /api/accounting/invoices/:id` — update (draft only)
- [ ] `POST /api/accounting/invoices/:id/issue` — issue (locks, sends to customer)
- [ ] `POST /api/accounting/invoices/:id/pay` — record payment
- [ ] `POST /api/accounting/invoices/:id/cancel` — cancel
- [ ] `POST /api/accounting/invoices/:id/refund` — refund
- [ ] Invoice PDF generation (with company logo, ZATCA-compatible format)
- [ ] Invoice email / WhatsApp sending
- **Frontend pages:**
  - [ ] Invoices list page (table filterable by status, date range, customer)
  - [ ] Invoice create/edit form (customer search, line items grid, auto-calc totals)
  - [ ] Invoice detail page (printable layout, action buttons: issue/pay/cancel/refund)
  - [ ] Record payment modal (amount, method, date, reference)
  - [ ] Invoice PDF preview component (embedded viewer or download link)

### 4.4 Expense Tracking
- [ ] `expenses` table: tenant_id, expense_category (fuel, maintenance, salary, tolls, parking, permits, insurance, utilities, office, other), amount, description, date, bus_id, driver_id, trip_id, receipt_url, paid_by, status (pending, approved, reimbursed), approved_by
- [ ] `POST /api/accounting/expenses` — record expense
- [ ] `GET /api/accounting/expenses` — list (filterable by category, date, bus)
- [ ] `PATCH /api/accounting/expenses/:id/approve` — approve
- [ ] `PATCH /api/accounting/expenses/:id/reimburse` — mark reimbursed
- [ ] Expense receipt upload (image file)
- **Frontend pages:**
  - [ ] Expenses list page (table filterable by category, date, bus; receipt thumbnail)
  - [ ] Expense entry form (category dropdown, amount, bus/driver/trip selectors, receipt upload)
  - [ ] Approve/Reimburse action buttons (role-protected, with confirmation)

### 4.5 Trip Profitability
- [ ] Profit calculation per trip: revenue (from passengers) - direct costs (fuel, driver allowance, tolls, maintenance)
- [ ] `GET /api/accounting/trip-profitability` — list all trips with profit
- [ ] `GET /api/accounting/trip-profitability/analytics` — avg profit per trip, per route, per bus
- [ ] Auto-journal entry when trip is completed (revenue + expense posting)
- **Frontend pages:**
  - [ ] Trip profitability list page (table: route, bus, revenue, costs, profit, margin %)
  - [ ] Profit analytics page (bar chart: profit by route/bus; KPI cards: avg profit, margin %)

### 4.6 Financial Reports
- [ ] Profit & Loss statement (date range filterable)
- [ ] Balance Sheet
- [ ] Accounts Receivable Aging
- [ ] Accounts Payable Aging
- [ ] Cash Flow Statement
- [ ] Expense by Category (pie chart + table)
- [ ] Revenue by Route / Bus / Period
- [ ] Export all reports to PDF and Excel
- [ ] Report scheduling (auto-generate and email monthly)
- **Frontend pages:**
  - [ ] Financial reports hub page (report type selector cards)
  - [ ] P&L report page (date range picker, income/expense sections, net total)
  - [ ] Balance Sheet page (assets / liabilities / equity sections)
  - [ ] AR / AP Aging report pages (table: customer/vendor, due amount, aging buckets)
  - [ ] Cash Flow report page (operating/investing/financing sections)
  - [ ] Expense by Category chart page (pie chart + drill-down table)
  - [ ] Revenue by Route/Bus chart page (bar chart + data table)
  - [ ] Export button (PDF/Excel dropdown) on every report page
  - [ ] Report schedule settings form (frequency, recipients, format)

### 4.7 Payroll (Finance Side)
- [ ] `payroll_batches` table: tenant_id, period_start, period_end, total_salaries, total_deductions, total_allowances, net_payable, status, approved_by, paid_at
- [ ] `payroll_items` table: payroll_batch_id, employee_id/driver_id, base_salary, allowances, deductions, overtime, net_pay
- [ ] `POST /api/accounting/payroll/batches` — create payroll batch
- [ ] `GET /api/accounting/payroll/batches` — list batches
- [ ] `GET /api/accounting/payroll/batches/:id` — batch detail
- [ ] `PATCH /api/accounting/payroll/batches/:id/approve`
- [ ] `PATCH /api/accounting/payroll/batches/:id/pay`
- [ ] Auto-journal entry for salary expense
- **Frontend pages:**
  - [ ] Payroll batches list page (period, employee count, total, status)
  - [ ] Batch detail page (per-employee breakdown table, totals row)
  - [ ] Create batch form (period picker, preview before finalize)
  - [ ] Approve/Pay action buttons (role-protected)

### 4.8 Bank & Payment Reconciliation
- [ ] `bank_accounts` table: tenant_id, bank_name, account_number, account_type, opening_balance, current_balance
- [ ] `bank_transactions` table: bank_account_id, date, description, reference, debit, credit, reconciled (boolean), matched_invoice_id, matched_expense_id
- [ ] `POST /api/accounting/bank-accounts` — create
- [ ] `GET /api/accounting/bank-accounts` — list
- [ ] `POST /api/accounting/bank-transactions` — import (manual or CSV upload)
- [ ] `POST /api/accounting/reconciliation` — match bank tx to invoice/expense
- **Frontend pages:**
  - [ ] Bank accounts list page (cards: bank name, account number, balance)
  - [ ] Bank account create form
  - [ ] Transactions page per account (table, CSV upload button)
  - [ ] Reconciliation page (split view: unmatched bank txs left, unmatched invoices/expenses right; match action)

---

## PHASE 5: HR & Employee Management (Non-Driver)

### 5.1 Employee Master
- [ ] `employees` table: tenant_id, user_id, employee_code, department (operations, finance, hr, fleet, maintenance, customer_service, executive, admin), designation, phone, email, join_date, contract_end_date, nationality, id_number, status
- [ ] `POST /api/hr/employees` — create
- [ ] `GET /api/hr/employees` — list
- [ ] `GET /api/hr/employees/:id` — detail
- [ ] `PATCH /api/hr/employees/:id` — update
- [ ] `DELETE /api/hr/employees/:id` — soft delete
- **Frontend pages:**
  - [ ] Employees list page (table with department filter, status badge, search)
  - [ ] Employee profile page (details, department, documents tab, attendance tab)
  - [ ] Employee create/edit form

### 5.2 Employee Attendance
- [ ] Same pattern as driver attendance (separate or unified table)
- [ ] `POST /api/hr/employee-attendance/check-in`
- [ ] `POST /api/hr/employee-attendance/check-out`
- [ ] `GET /api/hr/employee-attendance` — records
- [ ] Monthly attendance summary
- **Frontend pages:**
  - [ ] Employee attendance page (table filterable by employee, date range)
  - [ ] Check-in/out interface
  - [ ] Monthly summary card

### 5.3 Employee Payroll
- [ ] `employee_payroll` similar to driver payroll
- [ ] Salary structure (basic, housing, transport, other allowances)
- [ ] Deductions (insurance, loans, penalties)
- [ ] Payroll processing (monthly batch)
- **Frontend pages:**
  - [ ] Employee payroll list page (by period)
  - [ ] Salary structure form (per-employee allowance/deduction breakdown)
  - [ ] Batch payroll processing page

### 5.4 Employee Leaves
- [ ] Same pattern as driver leaves
- [ ] Leave balance per employee
- [ ] Approval workflow (employee → manager → HR)
- **Frontend pages:**
  - [ ] Employee leave list page (filterable by department, status)
  - [ ] Leave application form
  - [ ] Approval workflow UI (manager approves → HR approves)
  - [ ] Leave balance card per employee

### 5.5 Contracts & Documents
- [ ] `employee_contracts` table: employee_id, contract_type, start_date, end_date, salary, benefits, file_url, status
- [ ] `employee_documents` table: employee_id, document_type, number, expiry_date, file_url
- [ ] Contract expiry alerts
- [ ] Document expiry alerts
- **Frontend pages:**
  - [ ] Contracts tab on employee profile (list, upload, expiry badges)
  - [ ] Documents tab on employee profile (list by type, upload, expiry alerts)

---

## PHASE 6: Maintenance & Workshop

### 6.1 Maintenance Scheduling
- [ ] `maintenance_tasks` table: tenant_id, bus_id, task_type (oil_change, tire_replacement, brake_inspection, engine_service, ac_service, electrical, body_repair, general_service, other), description, priority (low, medium, high, critical), scheduled_date, scheduled_km, recurring_interval_days, recurring_interval_km, status (scheduled, in_progress, completed, cancelled), assigned_workshop, assigned_mechanic
- [ ] `POST /api/maintenance/tasks` — schedule maintenance
- [ ] `GET /api/maintenance/tasks` — list tasks (filterable by bus, status, priority)
- [ ] `GET /api/maintenance/tasks/:id` — task detail
- [ ] `PATCH /api/maintenance/tasks/:id` — update
- [ ] `POST /api/maintenance/tasks/:id/start` — begin work
- [ ] `POST /api/maintenance/tasks/:id/complete` — finish with notes and cost
- [ ] `POST /api/maintenance/tasks/:id/cancel` — cancel with reason
- [ ] Auto-generate maintenance task when bus reaches next_km_threshold
- [ ] Maintenance calendar view
- **Frontend pages:**
  - [ ] Maintenance tasks list page (table filterable by bus, status, priority; priority color badges)
  - [ ] Schedule maintenance form (bus selector, task type, priority, date/km, workshop)
  - [ ] Task detail page (timeline: scheduled → in_progress → completed)
  - [ ] Start/Complete/Cancel action buttons (with notes/cost modal on complete)
  - [ ] Maintenance calendar view (monthly, task blocks color-coded by priority)

### 6.2 Breakdown & Emergency Repair
- [ ] `breakdown_reports` table: tenant_id, bus_id, trip_id, reported_by, breakdown_type, description, location, severity, status (reported, dispatched, in_progress, resolved), resolution_notes, resolved_at, cost
- [ ] `POST /api/maintenance/breakdowns` — report breakdown
- [ ] `GET /api/maintenance/breakdowns` — list
- [ ] `PATCH /api/maintenance/breakdowns/:id/dispatch` — send mechanic
- [ ] `PATCH /api/maintenance/breakdowns/:id/resolve` — mark resolved
- [ ] Breakdown heat map (which routes/locations have most breakdowns)
- **Frontend pages:**
  - [ ] Breakdown reports list page (table with severity badge, bus, status)
  - [ ] Report breakdown form (bus selector, type, location map picker, description)
  - [ ] Dispatch mechanic button (triggers status change + assign modal)
  - [ ] Resolve modal (resolution notes, cost)
  - [ ] Breakdown heat map page (map with cluster markers by location)

### 6.3 Spare Parts Inventory
- [ ] `spare_parts` table: tenant_id, part_code, part_name, category, manufacturer, unit_of_measure, quantity_in_stock, reorder_level, unit_price, supplier_id, storage_location
- [ ] `inventory_transactions` table: spare_part_id, transaction_type (in, out), quantity, reference_type, reference_id, unit_price, total, date, performed_by
- [ ] `POST /api/maintenance/parts` — create part
- [ ] `GET /api/maintenance/parts` — list
- [ ] `PATCH /api/maintenance/parts/:id` — update
- [ ] `POST /api/maintenance/parts/:id/stock-in` — add stock
- [ ] `POST /api/maintenance/parts/:id/stock-out` — remove stock (link to maintenance task)
- [ ] Low stock alerts (when quantity < reorder_level)
- [ ] Parts usage history per bus
- **Frontend pages:**
  - [ ] Spare parts inventory page (table with qty, reorder level, low stock badge)
  - [ ] Part create/edit form
  - [ ] Stock-in modal (quantity, unit price, supplier, reference)
  - [ ] Stock-out modal (quantity, link to maintenance task, reference)
  - [ ] Parts usage history page per bus (table: part used, qty, date, task)

### 6.4 Maintenance Cost Tracking
- [ ] `maintenance_costs` table: maintenance_task_id, parts_cost, labor_cost, total_cost, paid_to, invoice_number, status
- [ ] Auto-calculate cost from parts used + labor hours
- [ ] `GET /api/maintenance/costs` — costs report (filterable by bus, date, type)
- [ ] `GET /api/maintenance/costs/by-bus` — total maintenance cost per bus (lifetime)
- [ ] Maintenance cost vs. bus age analytics
- **Frontend pages:**
  - [ ] Maintenance cost report page (date range, bus filter, total cost card)
  - [ ] Cost per bus chart (bar chart: total lifetime cost per bus)
  - [ ] Cost vs bus age scatter plot

### 6.5 Workshop Management
- [ ] `workshops` table: tenant_id, name, location, contact, supervisor, is_internal (boolean), services[]
- [ ] `GET /api/maintenance/workshops` — list
- [ ] `POST /api/maintenance/workshops` — create
- [ ] Work order generation (PDF) for external workshops
- **Frontend pages:**
  - [ ] Workshops list page (cards: name, location, internal/external badge)
  - [ ] Workshop create/edit form
  - [ ] Work order generation button (PDF download with workshop details + task list)

---

## PHASE 7: Booking & Customer Service

### 7.1 Customer / Passenger Master
- [ ] `customers` table: tenant_id, name, phone, email, id_number, nationality, address, is_company (boolean), company_name, notes
- [ ] `POST /api/bookings/customers` — create
- [ ] `GET /api/bookings/customers` — list / search
- [ ] `PATCH /api/bookings/customers/:id` — update
- **Frontend pages:**
  - [ ] Customers list / search page (search by name/phone/id, table results)
  - [ ] Customer profile page (details, booking history tab)
  - [ ] Customer create/edit form

### 7.2 Booking Management
- [ ] `bookings` table: tenant_id, customer_id, trip_id, booking_reference (auto), number_of_passengers, seat_numbers[], total_amount, paid_amount, balance, status (pending, confirmed, cancelled, completed, refunded), booking_date, payment_status, notes
- [ ] `booking_passengers` table: booking_id, passenger_name, id_number, seat_number, age, special_requirements
- [ ] `POST /api/bookings` — create booking
- [ ] `GET /api/bookings` — list (filterable by status, date, customer, trip)
- [ ] `GET /api/bookings/:id` — booking detail
- [ ] `PATCH /api/bookings/:id` — update
- [ ] `POST /api/bookings/:id/confirm` — confirm booking
- [ ] `POST /api/bookings/:id/cancel` — cancel
- [ ] `POST /api/bookings/:id/refund` — process refund
- [ ] `GET /api/bookings/:id/ticket` — generate ticket (PDF)
- [ ] Seat availability check per trip (seats filled vs bus capacity)
- [ ] Prevent overbooking (soft max + waitlist)
- **Frontend pages:**
  - [ ] Bookings list page (table filterable by status, date range, customer, trip)
  - [ ] Booking create form (customer search, trip selector with seat map, passenger list)
  - [ ] Booking detail page (customer info, passenger list, payment breakdown, status badge)
  - [ ] Seat selection UI (visual seat grid: occupied/available/selected)
  - [ ] Confirm/Cancel/Refund action buttons (with reason modal for cancel)
  - [ ] Ticket PDF preview / download button

### 7.3 Waitlist
- [ ] `booking_waitlist` table: tenant_id, trip_id, customer_id, number_of_passengers, request_date, status (waiting, offered, converted, expired)
- [ ] `POST /api/bookings/waitlist` — join waitlist
- [ ] `GET /api/bookings/waitlist` — view waitlist
- [ ] Auto-offer when seat becomes available (notify customer)
- [ ] Auto-expire unresponsive offers
- **Frontend pages:**
  - [ ] Waitlist page per trip (table: customer, requested seats, wait time, status)
  - [ ] "Join waitlist" button on trip with no availability

### 7.4 Booking Dashboard
- [ ] Today's bookings summary
- [ ] Upcoming trips with booking counts
- [ ] Cancellation rate
- [ ] Revenue from bookings (today, this week, this month)
- [ ] Customer search (find bookings by name / phone / reference)
- **Frontend pages:**
  - [ ] Booking dashboard page (summary cards, revenue trend, upcoming trips table)
  - [ ] Global customer search bar (finds bookings across all trips)

### 7.5 Customer Communication (Booking Related)
- [ ] Booking confirmation (auto)
- [ ] Trip reminder (24 hours before)
- [ ] Delay notification to all passengers on affected trip
- [ ] Cancellation notification
- [ ] Payment receipt
- **Frontend pages:**
  - [ ] Communication log tab on booking (sent messages, status: delivered/failed)
  - [ ] Manual send button (resend confirmation, send delay alert)

---

## PHASE 8: Notifications & Communication

### 8.1 Notification Engine
- [ ] `notifications` table: tenant_id, user_id, type, title, body, data (JSON), is_read, is_seen, created_at, read_at
- [ ] `POST /api/notifications` — create notification (internal)
- [ ] `GET /api/notifications` — list (paginated, unread first)
- [ ] `POST /api/notifications/:id/read` — mark as read
- [ ] `POST /api/notifications/mark-all-read` — mark all read
- [ ] `GET /api/notifications/unread-count` — badge count
- [ ] `DELETE /api/notifications/:id` — dismiss
- **Frontend pages:**
  - [ ] Notification center page (full list with read/unread, filter by type)
  - [ ] Notification bell dropdown (latest 5, mark-all-read button)
  - [ ] Notification preference settings page (which events to receive)

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

## PHASE 14: Hotel & Multi-Business Expansion (Future)

### 14.1 Hotel Management (Basic)
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

### 14.2 Multi-Business Profile
- [ ] A single tenant can have multiple business profiles (transport, hotel, tours)
- [ ] Module switching within same login
- **Frontend pages:**
  - [ ] Business profile switcher (dropdown in sidebar header)
  - [ ] Business profile management page (list, create, activate)

### 14.3 Customer Portal
- [ ] Customer-facing website
- [ ] Trip schedule browsing
- [ ] Online booking (seat selection)
- [ ] Ticket download
- [ ] Live bus tracking
- [ ] Booking history
- **Frontend pages:**
  - [ ] Customer portal homepage (trip search, route listing)
  - [ ] Trip schedule page (route selector, date picker, timetable)
  - [ ] Online booking flow (select trip → seat map → passenger info → confirm → pay)
  - [ ] Ticket download page (PDF preview + download)
  - [ ] Live bus tracking page (map with bus position for booked trip)
  - [ ] Booking history page (customer login required)

---

## PHASE 15: Payment & Billing

### 15.1 Payment Processing
- [ ] `payments` table: tenant_id, reference_type (invoice, booking, expense), reference_id, amount, payment_method (cash, bank_transfer, card, mada, stc_pay, apple_pay), payment_date, transaction_id, status, notes
- [ ] `POST /api/payments` — record payment
- [ ] `GET /api/payments` — list
- [ ] `GET /api/payments/:id` — detail
- [ ] `POST /api/payments/reconcile` — reconcile with bank statement
- [ ] Payment gateway integration (Mada, STC Pay, Apple Pay)
- [ ] Payment link generation (share via WhatsApp)
- **Frontend pages:**
  - [ ] Payments list page (table filterable by method, status, date)
  - [ ] Record payment form (reference type search, amount, method, date)
  - [ ] Payment detail modal
  - [ ] Reconciliation page (match payments to bank transactions)
  - [ ] Payment link generator (amount, reference, generate shareable link)

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

*End of document. This lifecycle covers all software features of the SEUM ERP platform across 16 phases and hundreds of individual implementable units.*
