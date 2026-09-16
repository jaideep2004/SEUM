# SEUM — Project Overview for Client

**What is SEUM?** A complete management system for your transport company — buses, trips, drivers, bookings, staff, maintenance, accounts, and customer messages, all in one place.

**Date:** September 2026

---

## 1. Project status — all phases in simple words

| # | Phase (what it covers) | Status |
|---|---|---|
| 0 | System foundation — login, security, company setup | ✅ Done |
| 1 | Fleet — buses, vehicle documents, fuel tracking | ✅ Done |
| 2 | Trips & operations — routes, scheduling, trip monitoring | ✅ Done |
| 3 | Drivers — profiles, attendance, leave, violations, scores, salary | ✅ Done |
| 4 | Accounting — invoices, expenses, bank accounts, financial reports | ✅ Done |
| 5 | HR — employees, attendance, payroll, leave, contracts | ✅ Done |
| 6 | Maintenance — workshops, repair tasks, breakdowns, spare parts, costs | ✅ Done |
| 7 | Bookings — customers, reservations, approvals, Excel import, agents | ✅ Done |
| 8 | Notifications & messages — app alerts, WhatsApp/SMS/email system ready | ✅ Done (system ready — provider accounts needed at go-live, see below) |
| 9 | Live GPS bus tracking on map | ▶ Next |
| 10 | Safety camera events (speeding, fatigue alerts) | Upcoming |
| 11 | Control room screen | Upcoming |
| 12 | Management reports & dashboards | Upcoming |
| 13 | Hajj & Umrah — trip programs, program numbers, pilgrim groups | Upcoming |
| 14 | Customer websites — online booking for public & companies | Later (this is where online revenue starts) |
| 15 | Online payments (Mada, STC Pay, Apple Pay) + ZATCA e-invoicing | Later |
| 16 | Settings & admin controls | Later |
| 17 | Hotel / other business expansion | Future |

**In short:** the full office system (Phases 0–8) is built and tested. What remains is live tracking, Hajj module, customer websites, and online payments.

---

## 2. What you (the client) need to purchase or provide

The system is ready, but some outside services require **your own accounts** — we cannot buy these for you since they need your company documents and phone numbers. **You don't need to buy anything right now** — development continues without these. We will ask for each item a few weeks before it is needed.

| # | What to get | Why | When needed |
|---|---|---|---|
| 1 | **WhatsApp Business messaging account** (via Twilio, WATI, or Meta directly) + a phone number for the business | So the system can send trip alerts, tickets, and payment links on WhatsApp | Before go-live. ⚠️ Start early — Meta approval of message templates takes several days |
| 2 | **SMS provider account** (e.g. Twilio, Vonage, or a Saudi SMS provider) | Backup channel for alerts when WhatsApp is unavailable | Before go-live |
| 3 | **Email sending service** (e.g. Resend, SendGrid, or Amazon SES — free tier is usually enough to start) | So invoices, tickets, and alerts send reliably (currently only test email) | Before go-live |
| 4 | **Maps key** (Google Maps or Mapbox) | To show live bus positions on the map | When Phase 9 (GPS tracking) build starts |
| 5 | **Online payment gateway merchant account** (e.g. Moyasar, Tap, or PayTabs — must support Mada, STC Pay, Apple Pay) | To accept online card payments on the customer website | Before Phase 15. Bank merchant onboarding takes time — start early |
| 6 | **ZATCA e-invoicing registration** — your VAT number + digital certificates from the ZATCA portal (your accountant will know this) | Saudi legal requirement for electronic invoices | Before Phase 15 |
| 7 | **Nusuk / official Hajj platform access** (only if the system must sync with Nusuk) | For pilgrim data sync in the Hajj module | Before Phase 13, if required |
| 8 | **GPS tracking device + SIM card for each bus** (hardware purchase + installation in vehicles) | Without devices in the buses, there is nothing to show on the live map | Before Phase 9 testing |
| 9 | **Bus cameras (CCTV/MDVR)** — only if you want automatic safety alerts (speeding, fatigue, phone use) | Camera events feed the safety module | Before Phase 10, if wanted |
| 10 | **Website domain name + security certificate (SSL)** — e.g. www.yourcompany.com | Needed for the customer booking websites, and so WhatsApp/payment notifications can reach your server | Before Phase 14 (server already exists) |

---

## 3. Important notes

- **Message templates (WhatsApp):** WhatsApp requires every automatic message to be pre-approved. Once you choose a provider (item 1), we will prepare the templates and submit them — approval takes a few days, which is why this should start early.
- **Costs:** each provider charges its own fees (monthly subscription and/or per-message charges). We will help you compare options before you buy — you pay the providers directly.
- **Hardware (items 8–9)** is completely separate from the software cost and is bought from device suppliers, not from us.

**Next step:** we proceed with Phase 9 (live GPS tracking software). No purchase is needed from your side at this moment.
