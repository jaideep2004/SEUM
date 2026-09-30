# SEUM — Project Overview for Client

**What is SEUM?** A complete management system for your transport company — buses, trips, drivers, bookings, staff, maintenance, accounts, and customer messages, all in one place, usable from office computers and mobile phones.

**Who uses it?** Company admin, operations manager (trips), fleet manager (buses), drivers, HR, accountant, customer-service staff (bookings), and executives (reports). Each person logs in and sees only their own section.

**Date:** September 2026

---

## 1. Project status — what is built and what comes next

### ✅ Built, tested and ready (Phases 0–8)

**Phase 0 — System foundation**
- Secure login for every staff member, each with their own role and permissions
- Company setup, subscription plans, full activity log (who changed what and when)

**Phase 1 — Fleet (your buses)**
- Register every bus: plate number, make, model, capacity, depot
- Vehicle documents (registration, insurance, inspection) with automatic expiry warnings (30 / 14 / 7 days)
- Fuel logging per bus + fuel efficiency reports (catches abnormal consumption)
- Bus readiness board: green = ready, yellow = in maintenance, red = out of service — trips cannot be assigned to non-ready buses

**Phase 2 — Trips & operations**
- Routes with stops (e.g. Jeddah → Makkah shuttle), distance and timing
- Two trip types: **Single trip** (one route, one date) and **Round trip** (multi-stop Umrah/Hajj journey across several days, e.g. Jeddah → Madinah → Makkah → return)
- Driver assignment with driver accept/reject, delay reporting, trip calendar
- Recurring trips (e.g. daily shuttle) with **automatic trip generation every week**
- Trip form ordered as you requested: Trip Type → Vehicle Type → Program Info → Flights → Hotels → Route Info, with Route Type per leg (Arrival / Departure / Intercity / Intracity) and Flight Type per flight
- Maintenance cost shown per bus with charts

**Phase 3 — Drivers**
- Driver files: license, passport, medical fitness, photo, documents with expiry alerts
- Daily attendance (check-in / check-out), leave requests with manager approval
- Violations record, automatic safety score (A/B/C/D), performance leaderboard
- Monthly payroll: auto-calculated from trips + overtime, approve → pay → payslip

**Phase 4 — Accounting**
- Chart of accounts, double-entry journal entries
- Customer invoices (PDF, professional layout) → issue → record payment (full or partial) → cancel/refund
- Expense tracking with receipt photos and approve → reimburse flow
- Profit per trip (revenue minus fuel, maintenance, tolls) with charts
- Reports: Profit & Loss, Balance Sheet, cash flow, expenses by category, revenue by route/bus — all exportable to PDF/CSV
- Bank accounts + bank statement import + reconciliation (match bank lines to invoices/expenses)

**Phase 5 — HR (office staff)**
- Employee records, departments, attendance, monthly payroll batches
- Leave applications with manager → HR approval chain and balances
- Contracts and documents with expiry alerts

**Phase 6 — Maintenance & workshop**
- Internal/external workshops, repair scheduling with priority and calendar
- Breakdown reporting (engine, tire, electrical…) → dispatch mechanic → resolve with cost
- Spare-parts stock (in/out, low-stock warnings), cost tracked per task and per bus

**Phase 7 — Bookings & customers**
- Customer database (individuals + companies/agents)
- Bookings with seat map, confirmation, cancellation, refund, printable ticket (PDF)
- Supervisor approval flow: new request → review price → approve/reject → planning → assign bus & driver
- Bulk booking upload from Excel (template + per-row error report, fail-safe)
- Agent linking: agent picker connected to company (Accounts) profiles
- Waitlist when a trip is full

**Phase 8 — Notifications & messages**
- In-app notifications for everyone (delays, assignments, expiring documents, payroll…)
- Personal notification preferences per user
- WhatsApp / SMS / email sending system: message templates with auto-filled names/dates, send screen with preview, full message log with delivery status, automatic rules (e.g. "trip delayed → message all passengers")
- ⚠️ The system is ready, but the actual sending accounts must be purchased by you (Section 2, items 1–3)

### ▶ Next and upcoming phases

| # | Phase | What you will get |
|---|---|---|
| 9 | Live GPS tracking | Live map with every bus as a moving dot, trip playback, depot/geofence alerts, overspeed warnings |
| 10 | Safety camera events | Automatic alerts (harsh braking, fatigue, phone use) from bus cameras + incident file per event |
| 11 | Control room | One big live screen for dispatchers: map + alerts + trip status |
| 12 | Management dashboards | Executive KPIs, auto-generated daily/weekly/monthly PDF reports by email |
| 13 | Hajj & Umrah | Seasons, pilgrim groups, auto **Program Numbers** (`PRG-2026-0001…`) with sequential route numbers, Mina/Arafat/Muzdalifah movement plans, Nusuk sync |
| 14 | Customer websites | Public booking website + company (B2B) portal — **this is where online revenue starts** |
| 15 | Online payments + ZATCA | Card/Mada/STC Pay/Apple Pay checkout, payment links on WhatsApp, Saudi ZATCA e-invoicing |
| 16 | Settings & admin | Company settings, user management, customizable forms, backups |
| 17 | Hotel / other businesses | Future expansion |

**In short:** the full office system (Phases 0–8) is built and tested. What remains is live tracking, Hajj module, customer websites, and online payments.

---

## 2. What you (the client) need to purchase or provide

The system is ready, but some outside services require **your own accounts** — we cannot buy these for you since they need your company documents and phone numbers. **You don't need to buy anything right now** — development continues without these. We will ask for each item a few weeks before it is needed.

### Messaging (needed before go-live)

**Item 1 — WhatsApp Business messaging account (most important, start early)**
- *What:* an official business account that lets the system send tickets, alerts, and payment links on WhatsApp. Providers: Twilio, WATI, or direct Meta connection — we will help you compare and choose.
- *What you provide:* your Commercial Registration (CR), company national address, and one dedicated phone number for the business (best a new number never used on WhatsApp before).
- *Steps:* (1) open provider account → (2) verify your business with Meta (3–7 days) → (3) connect the phone number → (4) we prepare the message templates (booking confirmation, delay alert, payment link…) and submit them for Meta approval (a few more days) → (5) we connect the system and test with your own phone.
- *Cost type:* monthly subscription + small fee per message. You pay the provider directly.
- ⚠️ **Total lead time is typically 1–3 weeks — this is the one item to start earliest.**

**Item 2 — SMS provider account (backup channel)**
- *What:* sends text messages when WhatsApp is unavailable (e.g. driver alerts, OTP codes).
- *What you provide:* company documents; mobile operators usually require registering your company sender name (the name shown as sender, e.g. "SEUM-TRANS").
- *Cost type:* pay per message. You pay the provider directly.

**Item 3 — Email sending service (e.g. Resend, SendGrid, or Amazon SES)**
- *What:* reliably delivers invoices, tickets, and reports by email (currently only a test mailbox is connected).
- *What you provide:* 10 minutes of access to whoever manages your website domain, so we can add 2–3 verification records (this proves to Gmail/Hotmail that the mail is really from you and not spam).
- *Cost type:* free tier is usually enough to start; paid plans grow with volume.

### Maps, payments, government (needed for specific phases)

**Item 4 — Maps key (Google Maps or Mapbox) — needed when Phase 9 starts**
- *What:* a key that lets the live map load in the system.
- *What you provide:* a Google Cloud or Mapbox account (we create the key and lock it to your website so nobody else can use it). Google asks for a bank card but includes free monthly usage that is enough for a fleet dashboard.
- *Cost type:* free allowance, then pay-per-use only if you exceed it.

**Item 5 — Online payment gateway merchant account (e.g. Moyasar, Tap, or PayTabs) — needed before Phase 15**
- *What:* lets customers pay online by Mada, STC Pay, Apple Pay, and cards on your booking website.
- *What you provide:* CR, IBAN letter from your bank, owner ID. The gateway company reviews and activates your account (test mode first, then live).
- *Cost type:* small percentage per transaction, settled to your bank. You contract the gateway directly.
- ⚠️ Bank/gateway onboarding can take 2–4 weeks — start as soon as Phase 14 (websites) begins.

**Item 6 — ZATCA e-invoicing registration — needed before Phase 15**
- *What:* Saudi legal requirement: every invoice must carry a QR code and be reported to ZATCA (Fatoora portal).
- *What you provide:* your VAT registration number; your accountant obtains the digital certificates from the ZATCA portal (first a test certificate, then the production one) and shares them with us to install in the system.
- *Cost type:* no ZATCA fee itself; your accountant may charge for the registration work.

**Item 7 — Nusuk / official Hajj platform access — only if system must sync with Nusuk, before Phase 13**
- *What:* official credentials so pilgrim data can sync with the Ministry platform.
- *What you provide:* coordination with your Hajj affairs contact / authorized access.
- *Cost type:* depends on the official channel.

### Hardware (bought from device suppliers, not from us)

**Item 8 — GPS tracking device + SIM card for each bus — needed before Phase 9 testing**
- *What:* a small device wired into each bus that reports its location every few seconds, plus a SIM with a data plan.
- *What you provide:* purchase per bus, professional installation (auto-electrician), and the device login details to share with us. We will give you the exact compatible device models and a SIM data estimate first.
- *Cost type:* one-time device + installation cost per bus, plus a small monthly SIM data fee per bus.

**Item 9 — Bus cameras (CCTV/MDVR) — only if you want automatic safety alerts, before Phase 10**
- *What:* cameras + recorder in each bus that detect speeding, fatigue, phone use, harsh braking.
- *What you provide:* same as item 8 — purchase, installation, and access details.
- *Cost type:* one-time hardware + installation per bus. Skip entirely if you don't need camera-based alerts.

### Website address (needed before Phase 14)

**Item 10 — Domain name + security certificate (SSL), e.g. www.yourcompany.com**
- *What:* your website address. Also required so WhatsApp and the payment gateway can securely reach your server. (The server itself already exists.)
- *What you provide:* buy the domain from any seller (GoDaddy, Namecheap, local provider) and give us access — we connect it to the server and install the certificate (free certificates are fine).
- *Cost type:* small yearly domain fee.

---

## 3. Who does what

| Task | Us (development team) | You (client) |
|---|---|---|
| Build and test the system | ✅ | — |
| Compare providers and recommend | ✅ | — |
| Install, connect, and test every account in the system | ✅ | — |
| Prepare WhatsApp message templates | ✅ | Approve the wording |
| Provide company documents, phone number, bank details | — | ✅ |
| Pay providers / suppliers directly | — | ✅ |
| Buy + install bus devices and cameras | — | ✅ (we give specs) |
| ZATCA registration via your accountant | guide | ✅ |

## 4. When will we ask for each item?

1. **Now → Phase 9 start:** maps key (item 4) + GPS device specs (item 8) so devices can be ordered and installed during development.
2. **Phase 13:** Nusuk access (item 7), only if needed.
3. **Phase 14 start:** domain (item 10) + begin payment gateway onboarding (item 5).
4. **Pre-go-live (with Phases 14–15):** WhatsApp (item 1 — start earliest), SMS (item 2), email (item 3), ZATCA certificates (item 6). Final delivery testing of all channels.

## 5. Common questions

**Do we need to buy anything now?**
No. Development of Phases 9–13 continues with the test setup. The first thing we'll need is the maps key + GPS device order when Phase 9 starts.

**What happens if we delay WhatsApp approval?**
Only the WhatsApp channel waits — the system, app notifications, SMS, and email all work independently. But since approval takes 1–3 weeks, tell us as soon as you've chosen a provider.

**Can we skip the cameras?**
Yes. Camera alerts (Phase 10) are optional. Everything else — including GPS tracking — works without cameras.

**Who pays the providers?**
You, directly. We never resell these services; we only connect and configure them.

**Are our data and customer info shared with providers?**
Only what each message needs (e.g. the passenger's phone number and trip time for a delay alert). No database access is ever given to outside companies.

---

**Next step:** we proceed with Phase 9 (live GPS tracking software). No purchase is needed from your side at this moment — we will send you the compatible GPS device models and maps-key instructions when Phase 9 begins.
