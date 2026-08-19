# SEUM Client Demo — Full Walkthrough (Phase 0 → 8.1)

> Your cue-sheet for the client meeting. Every act = one role login + one phase.
> Sidebar items with a **green tick** = fully complete and working. Anything unticked is a
> placeholder / future phase — do NOT click it on the demo (list at the bottom).

---

## 0. Pre-Demo Checklist (15 min before)

- [ ] Backend running: `cd backend && npm run dev` (or `npm start`)
- [ ] Frontend running: `cd apps/web && npm run dev`
- [ ] DB seeded once: `cd backend && npm run seed` (keeps Super Admin + Demo Transport Co + demo users + buses)
- [ ] Open `http://localhost:3000/login` in a fresh/incognito window
- [ ] Printer available (optional) — we demo the **Work Order PDF** download
- [ ] Have this sheet + demo credentials table open

## 1. Demo Credentials (password for ALL = `admin123`)

| Role | Email | Name |
|---|---|---|
| Super Admin | `super@seum.com` | Super Admin |
| Company Admin | `admin@demotransport.com` | Ahmed Al-Rashid |
| Operations | `ops@demotransport.com` | Omar Hassan |
| Fleet Manager | `fleet@demotransport.com` | Khalid Nasser |
| Finance | `finance@demotransport.com` | Layla Ibrahim |
| HR | `hr@demotransport.com` | Nadia Yusuf |
| Monitoring | `monitor@demotransport.com` | Fahad Al-Saud |
| Customer Service | `cs@demotransport.com` | Sara Khalid |
| Maintenance | `maintenance@demotransport.com` | Yousef Mansour |
| Drivers | `driver1@demotransport.com`, `driver2@demotransport.com` | Mohammed Ali, Ahmed Farouk |

> Client note to give: *"Every role has its own dashboard — what you see depends on who you are."*

---

## ACT 1 — Phase 0: Platform & Multi-Tenant Foundation
**Login as:** `super@seum.com` / `admin123`

1. **Login** → lands on Super Admin Dashboard. Point at KPIs (companies, active users).
   - All 4 role dashboards are now **live**: Super (`/dashboard`), Company (`/dashboard/company`),
     Operations (`/dashboard/operations`), Fleet (`/dashboard/fleet`) — every KPI, chart and list
     reads from the API (real tenants, trips, buses, revenue, fuel, leaderboard, audit logs).
2. **Companies** (`/dashboard/companies`) — list of tenants (SEUM Platform, Demo Transport Co).
   Say: *"One platform, many companies — every company gets its own isolated dataset."*
3. **Plans** (`/dashboard/plans`) — starter/professional/enterprise with price & limits.
4. **Subscriptions** (`/dashboard/subscriptions`) — plan assigned to each company, renewal date.
5. **Users** (`/dashboard/users`) — the star moment:
   - Click **Add New User** → pick tenant, name, email, password, roles → Create.
   - Click the **pencil (✏️)** on a user → change name / email / roles / Active-Deactivated → Save.
   - (Shows: *users can be managed later, not just created*)
6. **Audit Logs** (`/dashboard/audit-logs`) — every action recorded (who, what, when).
7. **Archived** (`/dashboard/archived`) — soft-deleted records, restorable.

**Handoff line:** *"Now let's switch to the company side — the client's own world."*

---

## ACT 1.5 — Company Admin Dashboard
**Login as:** `admin@demotransport.com` / `admin123`

1. **Login** → lands on the Company Admin Dashboard (`/dashboard/company`) — the owner-level view:
   - **KPI row 1:** Today's Trips, Active Buses, Delayed Trips, Today's Revenue (live from monitoring + bookings APIs).
   - **KPI row 2:** Employees, Maintenance Due, Incidents (breakdowns), Alerts (notification inbox count).
   - **Fleet donut:** Active / Maintenance / Retired / Sold split off total fleet.
   - **Revenue chart:** last ~14 days of booking revenue, `SAR this week` in header.
   - **Fuel summary:** total litres, total cost, avg km/L efficiency.
   - **Recent Alerts:** delayed trips (+minutes) and documents expiring within 30 days — click **View All** → Delays page.
   - **Top Performing Drivers:** live driver-score leaderboard (month period).
2. **Users** (`/dashboard/users`) — same add/edit/activate controls as Super Admin, but scoped to this company:
   - Add User → roles limited to what a company can assign (Super Admin role not offered).
   - Pencil (✏️) → edit name / email / roles / Active-Deactivated → Save.
3. **Handoff:** *"The boss sees everything at a glance — now let's zoom into fleet operations."*

---

## ACT 2 — Phase 1: Fleet Management
**Login as:** `fleet@demotransport.com` / `admin123`

1. **Fleet Dashboard** (`/dashboard/fleet`) — active/maintenance/retired counts, readiness gauge.
2. **Vehicles** (`/dashboard/fleet/vehicles`) — add a bus (plate, make, model, seats, fuel, depot) →
   it appears instantly in the list.
3. **Documents** (`/dashboard/fleet/documents`) — insurance/registration/licence records per bus.
4. **Readiness** (`/dashboard/fleet/readiness`) — each bus readiness status & checklist.
5. **Fuel** (`/dashboard/fleet/fuel`) — log a refuel (odometer, litres, cost) → auto mpg.
   Then **Fuel Analytics** (`/dashboard/fleet/fuel/analytics`) — cost per km charts.
6. **Assignments** (`/dashboard/fleet/assignments`) — assign bus↔driver↔trip;
   **Calendar** (`/dashboard/fleet/assignments/calendar`) — drag-free monthly view.
7. **Analytics** (`/dashboard/fleet/analytics`) — utilisation %, distance, cost trends.

**Handoff line:** *"The fleet is now digital. Next — the trips business itself."*

---

## ACT 3 — Phase 2: Trips & Operations
**Login as:** `ops@demotransport.com` / `admin123`

1. **Routes** (`/dashboard/routes`) — define Riyadh→Jeddah etc. with distance & duration.
2. **Trips** (`/dashboard/trips`) — create trip (route, bus, driver, date/time) →
   approve → see the **timeline card** (Scheduled → En Route → Completed).
3. Kick the trip: **Start** (blue) — **Delay** (amber, reason modal) — **Complete** (green).
   For bonus effect: mark one trip Delayed, then show **Delays page** (`/dashboard/delays`) or the
   **Monitoring dashboard** (`/dashboard/monitoring`) picking up the delay.
4. **Recurring Trips** (`/dashboard/recurring-trips`) — daily/weekly pattern generation.
5. **Schedules** (`/dashboard/schedules`) — the ops calendar view.
6. Ops dashboard (`/dashboard/operations`) — KPIs: today's trips, completed %, delayed.

**Handoff line:** *"Trips are live. Who drives them? The driver module."*

---

## ACT 4 — Phase 3: Driver Management
**Login as:** `ops@demotransport.com` (or fleet manager to show both can work it)

1. **Drivers** (`/dashboard/drivers`) — add driver, licence, phone, rate.
2. **Attendance** (`/dashboard/drivers/attendance`) — punch in/out, OT flagging.
3. **Leaves** (`/dashboard/drivers/leaves`) — create leave → approve (status change visible).
4. **Violations** (`/dashboard/drivers/violations`) — log incident (speeding etc.), severity.
5. **Scores** (`/dashboard/drivers/scores`) — auto score from violations/scores/attendance.
6. **Payroll** (`/dashboard/drivers/payroll`) — **Generate payroll** for period →
   auto allowance from completed trips (per-trip rate), overtime beyond 30 trips.

---

## ACT 5 — Phase 4: Accounting & Finance
**Login as:** `finance@demotransport.com` / `admin123`

1. **Chart of Accounts** (`/dashboard/accounts`) — double-entry chart (assets, revenue, AR...).
2. **Journal Entries** (`/dashboard/accounting/journal-entries`) — show that completed trips
   **auto-post** revenue + AR entries (completing the trip earlier made this happen — wow moment).
3. **Invoices** (`/dashboard/accounting/invoices`) — create invoice, mark paid.
4. **Expenses** (`/dashboard/accounting/expenses`) — fuel/maintenance/trip expenses.
5. **Trip Profitability** (`/dashboard/accounting/trip-profitability`) — revenue vs cost per trip.
6. **Financial Reports** (`/dashboard/accounting/reports`) — P&L, balance sheet, trial balance.
7. **Payroll** (`/dashboard/accounting/payroll`) — finance-side payroll cycle.
8. **Bank Accounts** (`/dashboard/accounting/bank-accounts`) — bank + reconciliation view.

---

## ACT 6 — Phase 5: HR (Non-Driver Staff)
**Login as:** `hr@demotransport.com` / `admin123`

1. **Employees** (`/dashboard/hr/employees`) — add employee, department, role.
2. **Attendance** (`/dashboard/hr/attendance`) — clock in/out records.
3. **Payroll** (`/dashboard/hr/payroll`) — generate employee payroll.
4. **Leaves** (`/dashboard/hr/leaves`) — request / approve cycle.
5. **Contracts** (`/docs` — employee contracts exist in backend too, e.g. contracts route).

---

## ACT 7 — Phase 6: Maintenance & Workshop
**Login as:** `maintenance@demotransport.com` (or company admin)

1. **Maintenance** (`/dashboard/maintenance`) — schedule task per bus (type, priority,
   recurrence by days/km) → Start → **Complete with cost + notes** modal.
2. **Breakdowns** (`/dashboard/maintenance/breakdowns`) — emergency repair log, status flow.
3. **Spare Parts** (`/dashboard/maintenance/parts`) — inventory, low-stock warning.
4. **Workshops** (`/dashboard/maintenance/workshops`) — **Download Work Order PDF** (print it!)
   — workshop details, pending/completed work, signature block.
5. **Cost Tracking** (`/dashboard/maintenance/costs`) — maintenance spend per bus / period.

---

## ACT 8 — Phase 7: Bookings & Customer Service
**Login as:** `cs@demotransport.com` / `admin123`

1. **Customers** (`/dashboard/customers`) — add passenger (name, phone, email, ID).
2. **Bookings** (`/dashboard/bookings`) — create booking against a trip (seat count, fare,
   status Pending → Confirmed) → auto **confirmation email/sms log**.
3. Back on ops side (optional): **Booking Dashboard** at `backend` (booking-dashboard test covers
   pending/confirmed/refunded KPIs).

---

## ACT 9 — Phase 8: Notifications Engine
**Login as:** ops or company admin

1. **Notifications** (`/dashboard/notifications`) — in-app notification centre.
2. **Preferences** (`/dashboard/notifications/preferences`) — per-event toggles.
3. Show the **communication log**: a booking reminder/delay alert that fired automatically
   (reminder job runs hourly for trips departing in ~24h; emails logged even if SMTP unset).
4. Mention: cancellation notifications, payment receipts, delay alerts — all logged + resendable.

---

## ACT 10 — Close: What's Next (Roadmap)

Say: *"Everything from the platform down to notifications is done — Phases 1–8.1.
Next we build:"*

- **Phase 9** — Real-time GPS, live tracking, geofencing (needs hardware/GPS feed)
- **Phase 10** — AI safety events & dashcams (ADAS/DMS integration)
- **Phase 11** — Control room with live map + video playback
- **Phase 12** — Executive dashboards & scheduled report exports
- **Phase 13** — Hajj & Umrah (pilgrim groups, Nusuk integration)

---

## ⚠️ Do-Not-Click During Demo (placeholders / future phases)

`/dashboard/fleet/insurance`, `/dashboard/fleet/gps`, `/dashboard/fleet/mileage`,
`/dashboard/finance`, `/dashboard/live-trips`, `/dashboard/alerts`, `/dashboard/geofencing`,
`/dashboard/speed`, `/dashboard/trip-planning`, `/dashboard/pilgrim-groups`,
`/dashboard/modules`, `/dashboard/support`, `/dashboard/health`, `/dashboard/integrations`,
`/dashboard/reports`, `/dashboard/settings`, `/dashboard/company/reports`,
`/dashboard/company/settings`, `/dashboard/ops-reports`, `/dashboard/fleet/reports`.

---

## Demo Troubleshooting

| Symptom | Fix |
|---|---|
| Login fails | Run `npm run seed` once; credentials above |
| Reminder job error in API logs (`time without time zone >= text`) | Fix already applied (`::time` cast) — hard-restart backend |
| Green ticks missing | Sidebar ticks come from `completedPages` in `apps/web/app/dashboard/layout.tsx` |
| No email shown | SMTP not configured — emails are logged to API console instead (by design, mention it) |