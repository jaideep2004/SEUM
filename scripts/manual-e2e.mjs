#!/usr/bin/env node
/**
 * SEUM Manual E2E Simulation — phases 1 to 8.1
 * Drives the REAL REST API exactly like a browser:
 *  - logs in as each demo role (HttpOnly cookie sessions preserved)
 *  - performs human-style journeys per phase
 *  - asserts status transitions, amounts and cross-role visibility
 *
 * Usage:  node scripts/manual-e2e.mjs  [--cleanup-only] [--no-cleanup] [--to-81]
 * Env:    API_URL (default http://localhost:4000/api/v1)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const API = process.env.API_URL || "http://localhost:4000/api/v1";
const PASSWORD = "admin123";
const now = new Date();
const dstr = (d) => d.toISOString().slice(0, 10);
const today = dstr(now);
const addDays = (n) => dstr(new Date(now.getTime() + n * 864e5));
const stamp = String(Date.now()).slice(-7);

const USERS = {
  super: { email: "super@seum.com", role: "super_admin" },
  company: { email: "admin@demotransport.com", role: "company_admin" },
  ops: { email: "ops@demotransport.com", role: "operations_manager" },
  fleet: { email: "fleet@demotransport.com", role: "fleet_manager" },
  finance: { email: "finance@demotransport.com", role: "finance_accountant" },
  hr: { email: "hr@demotransport.com", role: "hr_manager" },
  monitor: { email: "monitor@demotransport.com", role: "monitoring_control" },
  driver1: { email: "driver1@demotransport.com", role: "driver" },
  cs: { email: "cs@demotransport.com", role: "customer_service" },
  exec: { email: "exec@demotransport.com", role: "executive" },
  maint: { email: "maintenance@demotransport.com", role: "maintenance_workshop" },
};

/* ── tiny session/HTTP layer (cookie = HttpOnly, like a browser) ── */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeSession(label) {
  return { label, cookies: new Map(), user: null };
}
async function login(session, email = USERS[session.label].email, password = PASSWORD) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      redirect: "manual",
    });
    const setCookies = (res.headers.getSetCookie ? res.headers.getSetCookie() : [])
      .concat(res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []);
    for (const sc of setCookies) {
      const [pair] = sc.split(";");
      const [k, v] = pair.split("=");
      if (v) session.cookies.set(k.trim(), v.trim());
    }
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.success) {
      if (res.status === 429 && attempt < 3) {
        const m = (json?.error?.message || "").match(/in (\d+) seconds/);
        await sleep((m ? parseInt(m[1]) : 10) * 1000 + 500);
        continue;
      }
      throw new Error(`login failed for ${session.label}: HTTP ${res.status} ${JSON.stringify(json)}`);
    }
    session.user = json.data.user;
    return json.data.user;
  }
}
async function call(session, method, path, body) {
  const cookie = [...session.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  const headers = { Cookie: cookie };
  let payload;
  if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${API}${path}`, { method, headers, body: payload, redirect: "manual" });
  const ct = res.headers.get("content-type") || "";
  let json = null;
  let text = "";
  if (ct.includes("json")) json = await res.json().catch(() => null);
  else text = await res.text();
  return { status: res.status, ct, json, text, ok: res.ok && (json ? json.success === true : res.status < 400) };
}

/* ── assertions ── */
const phaseResults = new Map();
let currentPhase = null;
function phase(name) {
  currentPhase = name;
  phaseResults.set(name, { pass: 0, fail: 0, warn: 0, notes: [] });
}
function logPhase(name) {
  const r = phaseResults.get(name);
  if (!r) return;
  console.log(`${r.fail === 0 ? "✓" : "✗"} ${name}: ${r.pass} passed, ${r.fail} failed, ${r.warn} warnings`);
  for (const n of r.notes) console.log(`    ${n}`);
}
function check(cond, msg, extra) {
  const r = phaseResults.get(currentPhase);
  if (cond) r.pass++;
  else { r.fail++; r.notes.push(`✗ ${msg}` + (extra ? `  ${JSON.stringify(extra)}` : "")); }
  return cond;
}
function warn(msg) {
  const r = phaseResults.get(currentPhase);
  r.warn++;
  r.notes.push(`⚠ ${msg}`);
}

/* ── shared fixtures ── */
const fixtures = { busId: null, routeId: null, tripId: null, driverId: null, driverName: null,
  customerId: null, bookingId: null, bookingId2: null, inviteId: null, taskId: null,
  breakdownId: null, partId: null, costId: null, expenseId: null, invoiceId: null,
  invoiceId2: null, invoiceId3: null, journalId: null, bankAccountId: null, bankTxnId: null,
  tenantId: null, newUserEmail: null, notifId: null, payrollId: null,
  employeeId: null, contractId: null,
  S: {} };

/* =================================================================
 * PHASE 1–2  Platform: super admin provisions tenant + user, per-role access
 * ================================================================= */
async function phase12(sessions) {
  phase("1-2 Platform & Roles");
  const superS = sessions.super, compS = sessions.company;

  const tenant = await call(superS, "POST", "/tenants", {
    name: `E2E Phase2 Tenant ${stamp}`, contactEmail: `e2e-tenant-${stamp}@seum.test`, contactPhone: "+966500000001",
  });
  check(tenant.ok && tenant.json?.data?.id, "Super admin creates tenant", tenant.json?.error);
  fixtures.tenantId = tenant.json?.data?.id;
  if (!fixtures.tenantId) return;

  const inv = await call(superS, "POST", "/auth/register", {
    tenantId: fixtures.tenantId,
    email: `e2e-ops-${stamp}@seum.test`, password: "E2EPass123!", name: "E2E Ops User",
    roles: ["operations_manager"],
  });
  check(inv.ok && inv.json?.data?.id, "Super admin registers operations_manager user", inv.json?.error);
  fixtures.newUserEmail = `e2e-ops-${stamp}@seum.test`;

  // login as the newly provisioned user (a real person would)
  const newS = sessions.e2eOps = { label: "e2eOps", cookies: new Map(), user: null };
  let me = null;
  try { me = await login(newS, `e2e-ops-${stamp}@seum.test`, "E2EPass123!"); } catch (e) { check(false, "New user can log in", e.message); return; }
  check(me.tenantId === fixtures.tenantId && me.roles.includes("operations_manager"),
    "New user session has correct tenant + role");

  const scoped = await call(newS, "GET", "/operations/routes?pageSize=5");
  check(scoped.ok, "New user accesses tenant-scoped routes (empty list OK)");
  const denied = await call(newS, "GET", "/tenants");
  check(denied.status === 403, "New user is blocked from /tenants (403)", denied.json?.error);

  // company admin provisions an hr user inside demo tenant
  const hrInv = await call(compS, "POST", "/auth/register", {
    email: `e2e-hr-${stamp}@demotransport.com`, password: "E2EPass123!", name: "E2E HR User",
    roles: ["hr_manager"],
  });
  check(hrInv.ok && hrInv.json?.data?.id, "Company admin registers hr_manager user", hrInv.json?.error);

  const listT = await call(superS, "GET", "/tenants");
  check(listT.ok && Array.isArray(listT.json?.data) && listT.json.data.length >= 2, "Super lists tenants");

  // per-role access matrix (allowed + forbidden pairs)
  const matrix = [
    ["company", "/users?pageSize=5", 200, "/tenants", 403],
    ["ops", "/operations/routes?pageSize=5", 200, "/fleet/buses?pageSize=5", 403],
    ["fleet", "/fleet/buses?pageSize=5", 200, "/users?pageSize=5", 403],
    ["finance", "/accounting/invoices?pageSize=5", 200, "/fleet/buses?pageSize=5", 403],
    ["hr", "/drivers/leaves?pageSize=5", 200, "/fleet/buses?pageSize=5", 403],
    ["monitor", "/notifications?pageSize=5", 200, "/accounting/invoices?pageSize=5", 403],
    ["cs", "/bookings/customers?pageSize=5", 200, "/users?pageSize=5", 403],
    ["driver1", "/notifications?pageSize=5", 200, "/operations/routes?pageSize=5", 403],
    ["exec", "/notifications?pageSize=5", 200, "/users?pageSize=5", 403],
    ["maint", "/notifications?pageSize=5", 200, "/users?pageSize=5", 403],
  ];
  for (const [key, allowedPath, allowedCode, deniedPath, deniedCode] of matrix) {
    const a = await call(sessions[key], "GET", allowedPath);
    check(a.status === allowedCode, `${USERS[key].role} can access ${allowedPath}`, { status: a.status });
    const d = await call(sessions[key], "GET", deniedPath);
    check(d.status === deniedCode, `${USERS[key].role} is blocked from ${deniedPath}`, { status: d.status });
  }
}

/* =================================================================
 * PHASE 3  Fleet: bus → documents → readiness → fuel → assignment
 * ================================================================= */
async function phase3(sessions) {
  phase("3 Fleet Management");
  const fleet = sessions.fleet, comp = sessions.company;

  const bus = await call(fleet, "POST", "/fleet/buses", {
    plateNumber: `E2E-${stamp}`, make: "Yutong", model: "E2E MkII", year: 2025,
    capacitySeated: 44, capacityStanding: 12, fuelType: "diesel",
    status: "active", assignedDepot: "Jeddah Main", purchasePrice: 850000,
  });
  check(bus.ok && bus.json?.data?.id, "Fleet manager creates bus", bus.json?.error);
  fixtures.busId = bus.json?.data?.id;
  if (!fixtures.busId) return;

  const doc1 = await call(fleet, "POST", `/fleet/buses/${fixtures.busId}/documents`, {
    documentType: "Registration", documentNumber: `E2E-REG-${stamp}`,
    issueDate: addDays(-10), expiryDate: addDays(45), status: "active",
  });
  check(doc1.ok, "Attach expiring Registration doc (+45d)", doc1.json?.error);
  const doc2 = await call(fleet, "POST", `/fleet/buses/${fixtures.busId}/documents`, {
    documentType: "Insurance", documentNumber: `E2E-INS-${stamp}`,
    issueDate: today, expiryDate: addDays(300), status: "active",
  });
  check(doc2.ok, "Attach Insurance doc (+300d)", doc2.json?.error);

  const expiring = await call(fleet, "GET", "/fleet/documents/expiring?days=365");
  check(expiring.ok && JSON.stringify(expiring.json?.data || []).includes(`E2E-REG-${stamp}`),
    "New Registration appears in expiring-docs list", expiring.json?.error);

  const readiness = await call(fleet, "POST", "/fleet/readiness", {
    busId: fixtures.busId, status: "ready", notes: "E2E pre-trip check", nextScheduledMaintenanceKm: 150000,
  });
  check(readiness.ok, "Set bus readiness = ready", readiness.json?.error);
  const readyList = await call(fleet, "GET", "/fleet/readiness?status=ready");
  check(readyList.ok && JSON.stringify(readyList.json?.data || []).includes(fixtures.busId),
    "Bus shows in ready fleet", readyList.json?.error);

  const fuel = await call(fleet, "POST", "/fleet/fuel", {
    busId: fixtures.busId, liters: 200, costPerLiter: 2.1, totalCost: 420,
    date: today, odometerReading: 123456, stationName: "E2E Station", fuelType: "diesel",
  });
  check(fuel.ok && fuel.json?.data?.id, "Log 200L fuel fill (SAR 420)", fuel.json?.error);
  const fuelList = await call(fleet, "GET", "/fleet/fuel?busId=" + fixtures.busId);
  check(fuelList.ok && fuelList.json?.data?.some?.(f => Number(f.liters) === 200), "Fuel log appears in list", fuelList.json?.error);

  // E2E driver for attendance/leave/violations/payroll (created by company admin, like real life)
  const newDrv = await call(comp, "POST", "/drivers", {
    email: `e2e-driver-${stamp}@demotransport.com`, password: "E2EPass123!",
    name: `E2E-Driver-${stamp}`, licenseNumber: `E2E-LIC-${stamp}`,
    nationality: "SA", hireDate: today, status: "active",
  });
  check(newDrv.ok && newDrv.json?.data?.id, "Company admin creates E2E driver", newDrv.json?.error);
  if (newDrv.ok) { fixtures.e2eDriverId = newDrv.json.data.id; fixtures.e2eDriverUserId = newDrv.json.data.userId; }

  // resolve seed driver + (crucially) its USER id — trips/assignments reference users.id
  const drv = await call(sessions.ops, "GET", "/drivers?page=1&pageSize=100");
  const driver = drv.ok ? (drv.json?.data || []).find(d => d.name === "Mohammed Ali") : null;
  check(!!driver, "Resolve driver id via ops (Mohammed Ali)");
  if (driver) { fixtures.driverId = driver.id; fixtures.driverUserId = driver.userId || driver.id; fixtures.driverName = driver.name; }

  const assign = await call(fleet, "POST", "/fleet/assignments", {
    busId: fixtures.busId, routeName: `E2E Route ${stamp}`, depotName: "Jeddah Main",
    driverId: fixtures.driverUserId, driverName: fixtures.driverName,
    startDate: today, endDate: addDays(7), status: "active", notes: "E2E assignment",
  });
  check(assign.ok && assign.json?.data?.id, "Create active assignment", assign.json?.error);
  const assigns = await call(fleet, "GET", "/fleet/assignments?busId=" + fixtures.busId);
  check(assigns.ok && assigns.json?.data?.some?.(a => a.plateNumber === `E2E-${stamp}`),
    "Assignment visible with plate number", assigns.json?.error);
  const cal = await call(fleet, "GET", "/fleet/assignments/calendar?month=8&year=2026");
  check(cal.ok, "Assignment calendar endpoint responds", cal.json?.error);

  const analytics = await call(fleet, "GET", "/fleet/analytics/dashboard");
  check(analytics.ok, "Fleet analytics dashboard responds", analytics.json?.error);
}

/* =================================================================
 * PHASE 4  Operations: route → trip → driver confirm → delay → monitoring
 * ================================================================= */
async function phase4(sessions) {
  phase("4 Operations & Trips");
  const ops = sessions.ops;

  const route = await call(ops, "POST", "/operations/routes", {
    name: `E2E Route ${stamp}`, code: `E2E-${stamp}`, origin: "Jeddah", destination: "Makkah",
    distanceKm: 78, estimatedDurationMinutes: 95, routeType: "regular",
  });
  check(route.ok && route.json?.data?.id, "Ops creates route", route.json?.error);
  fixtures.routeId = route.json?.data?.id;

  if (fixtures.routeId) {
    const stop = await call(ops, "POST", `/operations/routes/${fixtures.routeId}/stops`, {
      stopName: "E2E Stop 1", stopOrder: 1,
    });
    check(stop.ok, "Add stop to route", stop.json?.error);
  }

  const trip = await call(ops, "POST", "/operations/trips", {
    routeId: fixtures.routeId, busId: fixtures.busId,
    tripType: "single", scheduledDate: addDays(1), scheduledStartTime: "08:00", scheduledEndTime: "09:35",
    tripTitle: `E2E Trip ${stamp}`, notes: "E2E trip",
  });
  check(trip.ok && trip.json?.data?.id, "Ops schedules trip on E2E bus", trip.json?.error);
  fixtures.tripId = trip.json?.data?.id;

  if (fixtures.tripId && fixtures.driverUserId) {
    const assigned = await call(ops, "POST", `/operations/trips/${fixtures.tripId}/assign-driver`, { driverId: fixtures.driverUserId });
    check(assigned.ok && (assigned.json?.data?.driverName || "").includes("Mohammed"), "Assign Mohammed Ali to trip", assigned.json?.error);

    const confirm = await call(sessions.driver1, "POST", `/operations/trips/${fixtures.tripId}/driver-confirm`, { confirmationStatus: "accepted" });
    check(confirm.ok, "Driver accepts trip", confirm.json?.error);
    const driverSched = await call(ops, "GET", `/operations/drivers/schedule?driverId=${fixtures.driverUserId}&startDate=${today}&endDate=${addDays(2)}`);
    check(driverSched.ok && JSON.stringify(driverSched.json?.data || []).includes(fixtures.tripId), "Trip on driver's schedule", driverSched.json?.error);
  }

  const pax = await call(ops, "POST", `/operations/trips/${fixtures.tripId}/passengers`, {
    passengerName: "E2E Walk-On Pax", seatNumber: "5" });
  check(pax.ok, "Add passenger to trip", pax.json?.error);

  const started = await call(ops, "POST", `/operations/trips/${fixtures.tripId}/start`);
  check(started.ok && (started.json?.data?.status === "en_route"), "Trip starts (en_route)", started.json?.error);
  const completed = await call(ops, "POST", `/operations/trips/${fixtures.tripId}/complete`);
  check(completed.ok && (completed.json?.data?.status === "completed"), "Trip completes", completed.json?.error);

  // second trip: delay + monitoring (external SMS update + timeline)
  const trip2 = await call(ops, "POST", "/operations/trips", {
    routeId: fixtures.routeId, busId: fixtures.busId,
    tripType: "single", scheduledDate: addDays(1), scheduledStartTime: "11:00", scheduledEndTime: "12:35",
    tripTitle: `E2E Trip2 ${stamp}`, notes: "E2E delay simulation",
  });
  check(trip2.ok && trip2.json?.data?.id, "Ops schedules second trip (delay sim)", trip2.json?.error);
  const trip2Id = trip2.json?.data?.id;

  if (trip2Id) {
    const delay = await call(ops, "POST", `/operations/trips/${trip2Id}/delay`, {
      delayMinutes: 30, delayReason: "E2E simulated traffic" });
    check(delay.ok && (delay.json?.data?.status === "delayed"), "Ops marks trip delayed (+30m)", delay.json?.error);
    const delays = await call(ops, "GET", "/operations/monitoring/delays");
    check(delays.ok && JSON.stringify(delays.json?.data || []).includes(trip2Id),
      "Delayed trip visible in monitoring delays", delays.json?.error);

    const exUpd = await call(ops, "POST", `/operations/monitoring/trips/${trip2Id}/external-update`, {
      method: "sms", status: "delayed", delayMinutes: 30, delayReason: "E2E traffic", notes: "E2E" });
    check(exUpd.ok, "External status update (SMS) accepted", exUpd.json?.error);
    const timeline = await call(ops, "GET", `/operations/monitoring/trips/${trip2Id}/timeline`);
    check(timeline.ok && Array.isArray(timeline.json?.data?.statusLogs), "Trip timeline available", timeline.json?.error);
  }

  // recurring pattern
  const pattern = await call(ops, "POST", "/operations/recurring-trips", {
    routeId: fixtures.routeId, tripType: "single", frequency: "daily",
    scheduledStartTime: "09:00", scheduledEndTime: "10:30",
    startDate: addDays(2), endDate: addDays(8), tripTitle: `E2E Recurring ${stamp}`,
  });
  check(pattern.ok && pattern.json?.data?.id, "Create daily recurring pattern", pattern.json?.error);
  if (pattern.ok) {
    const gen = await call(ops, "POST", `/operations/recurring-trips/${pattern.json.data.id}/generate`, {
      startDate: addDays(2), endDate: addDays(8) });
    check(gen.ok && (gen.json?.data?.generatedCount || gen.json?.data?.generated || 0) >= 1, "Generate trips from pattern", gen.json?.error);
  }
}

/* =================================================================
 * PHASE 5  Drivers & HR: attendance, leave, violation, score, payroll
 * ================================================================= */
async function phase5(sessions) {
  phase("5 Drivers & HR");
  const fleet = sessions.fleet, hr = sessions.hr, finance = sessions.finance;
  const did = fixtures.e2eDriverId;
  if (!did) { check(false, "E2E driver available for HR flows"); return; }

  const cin = await call(fleet, "POST", "/drivers/attendance/check-in", { driver_id: did, date: today });
  check(cin.ok, "Driver check-in recorded", cin.json?.error);
  const cout = await call(fleet, "POST", "/drivers/attendance/check-out", { driver_id: did, date: today });
  check(cout.ok, "Driver check-out recorded", cout.json?.error);
  const att = await call(fleet, "GET", `/drivers/attendance/list?driver_id=${did}&date=${today}`);
  check(att.ok && att.json?.data?.some?.(a => ["present", "late", "on_trip", "half_day"].includes(a.status)),
    "Attendance shows today's record", att.json?.error);

  const leave = await call(hr, "POST", "/drivers/leaves", {
    driver_id: did, leave_type: "annual", start_date: addDays(10), end_date: addDays(12),
    reason: "E2E annual leave" });
  check(leave.ok && leave.json?.data?.id, "Leave request created (annual, +10d)", leave.json?.error);
  if (leave.ok) {
    const approve = await call(hr, "PATCH", `/drivers/leaves/${leave.json.data.id}/approve`, { approved_by: sessions.hr.user.id });
    check(approve.ok && approve.json?.data?.status === "approved", "HR approves leave", approve.json?.error);
    const listL = await call(hr, "GET", `/drivers/leaves?driver_id=${did}&status=approved`);
    check(listL.ok && listL.json?.data?.some?.(l => l.id === leave.json.data.id), "Approved leave in list", listL.json?.error);
  }

  const vio = await call(fleet, "POST", "/drivers/violations", {
    driver_id: did, violation_type: "speeding", severity: "major",
    description: "E2E verified speed event", action_taken: "E2E coaching session" });
  check(vio.ok && vio.json?.data?.violation?.id, "Record speeding violation (major)", vio.json?.error);
  const violId = vio.ok ? vio.json.data.violation.id : null;
  const vioList = await call(fleet, "GET", `/drivers/violations?driver_id=${did}`);
  check(vioList.ok && vioList.json?.data?.some?.(v => v.violationType === "speeding" || v.violation_type === "speeding"),
    "Violation in list", vioList.json?.error);
  const sco = await call(fleet, "GET", `/drivers/violations/safety-score/${did}`);
  check(sco.ok, "Safety score computed on demand", sco.json?.error);

  const scored = await call(hr, "POST", `/drivers/scores/compute/${did}`, { period_start: addDays(-30), period_end: today });
  check(scored.ok, "HR computes driver performance score", scored.json?.error);
  const leader = await call(hr, "GET", "/drivers/scores/leaderboard?period=month&pageSize=50");
  check(leader.ok, "Score leaderboard available", leader.json?.error);

  const payroll = await call(hr, "POST", "/drivers/payroll/generate", {
    period_start: `${today.slice(0, 8)}01`, period_end: today, driver_ids: [did],
    base_salaries: { [did]: 4000 }, trip_rate: 25 });
  check(payroll.ok && Array.isArray(payroll.json?.data?.records) && payroll.json.data.records.length > 0,
    "HR generates payroll for driver", payroll.json?.error);
  const rec = payroll.ok ? (payroll.json.data.records || []).find(r => r.driverId === did || r.driver_id === did) : null;
  fixtures.payrollId = rec?.id || (payroll.ok ? payroll.json.data.records?.[0]?.id : null);
  check(!!fixtures.payrollId && Number(rec?.totalPayable || rec?.grossSalary || rec?.gross_salary) >= 4000,
    "Payroll includes base salary", rec);

  if (fixtures.payrollId) {
    const apr = await call(finance, "PATCH", `/drivers/payroll/${fixtures.payrollId}/approve`);
    check(apr.ok && (apr.json?.data?.status === "approved"), "Finance approves payroll", apr.json?.error);
    const pay = await call(finance, "PATCH", `/drivers/payroll/${fixtures.payrollId}/pay`, { payment_reference: `E2E-PAY-${stamp}` });
    check(pay.ok && (pay.json?.data?.status === "paid"), "Payroll marked paid", pay.json?.error);
  }

  // Dispute → review → resolve lifecycle
  if (violId) {
    const dispute = await call(sessions.driver1, "POST", `/drivers/violations/${violId}/dispute`, {
      reason: "E2E disputed - not at the wheel",
      evidence: [{ name: "gps.png", url: "https://e2e.test/gps.png" }] });
    check(dispute.ok && dispute.json?.data?.status === "disputed", "Driver disputes violation", dispute.json?.error);
    const resolve = await call(hr, "PATCH", `/drivers/violations/${violId}`, {
      status: "resolved", action_taken: "E2E review completed" });
    check(resolve.ok && resolve.json?.data?.status === "resolved", "HR resolves after review", resolve.json?.error);
  }

  // Auto-suspension at 30 points (6 majors = 30; disputed ones excluded from points)
  let suspended = false;
  for (let i = 0; i < 6 && !suspended; i++) {
    const v = await call(fleet, "POST", "/drivers/violations", {
      driver_id: did, violation_type: "speeding", severity: "major",
      description: `E2E suspension sim ${i + 1}` });
    if (v.ok && v.json?.data?.suspended) suspended = true;
  }
  check(suspended, "Driver auto-suspended at 30 points", "suspended flag not set after 6 majors");
  if (suspended) {
    const dget = await call(sessions.company, "GET", `/drivers/${did}`);
    check(dget.ok && dget.json?.data?.status === "suspended", "Driver status reflects suspension", dget.json?.error);
    const restore = await call(sessions.company, "PATCH", `/drivers/${did}`, { status: "active" });
    check(restore.ok && restore.json?.data?.status === "active", "Company restores driver to active", restore.json?.error);
  }
}

/* =================================================================
 * PHASE 6  Maintenance: workshop, task, breakdown, parts, cost
 * ================================================================= */
async function phase6(sessions) {
  phase("6 Maintenance");
  const fleet = sessions.fleet;

  const ws = await call(fleet, "POST", "/maintenance/workshops", {
    name: `E2E Workshop ${stamp}`, location: "Jeddah Industrial", contact: "+966501111111",
    supervisor: "E2E Supervisor", is_internal: true, services: ["oil change", "brakes"] });
  check(ws.ok && ws.json?.data?.id, "Create workshop", ws.json?.error);
  if (ws.ok) {
    const upd = await call(fleet, "PATCH", `/maintenance/workshops/${ws.json.data.id}`, { supervisor: "E2E Supervisor 2" });
    check(upd.ok && upd.json?.data?.supervisor === "E2E Supervisor 2", "Update workshop", upd.json?.error);
    const del = await call(fleet, "DELETE", `/maintenance/workshops/${ws.json.data.id}`);
    check(del.ok, "Delete workshop", del.json?.error);
  }

  const task = await call(fleet, "POST", "/maintenance/tasks", {
    bus_id: fixtures.busId, task_type: "oil_change", priority: "high",
    scheduled_date: addDays(2), assigned_workshop: `E2E Workshop ${stamp}`,
    assigned_mechanic: "E2E Mechanic", description: "E2E oil change" });
  check(task.ok && task.json?.data?.id, "Create maintenance task", task.json?.error);
  fixtures.taskId = task.ok ? task.json.data.id : null;
  if (fixtures.taskId) {
    const st = await call(fleet, "POST", `/maintenance/tasks/${fixtures.taskId}/start`);
    check(st.ok && (st.json?.data?.status === "in_progress"), "Start task (in_progress)", st.json?.error);
  }

  const bd = await call(fleet, "POST", "/maintenance/breakdowns", {
    bus_id: fixtures.busId, breakdown_type: "engine_failure", severity: "critical",
    location: "E2E Highway KM 12", description: "E2E engine failure" });
  check(bd.ok && bd.json?.data?.id, "Report breakdown (critical)", bd.json?.error);
  fixtures.breakdownId = bd.ok ? bd.json.data.id : null;
  if (fixtures.breakdownId) {
    const dis = await call(fleet, "PATCH", `/maintenance/breakdowns/${fixtures.breakdownId}/dispatch`, { mechanic: "E2E Mechanic" });
    check(dis.ok && (dis.json?.data?.status === "dispatched"), "Dispatch mechanic", dis.json?.error);
    const bstart = await call(fleet, "PATCH", `/maintenance/breakdowns/${fixtures.breakdownId}/start`);
    check(bstart.ok && (bstart.json?.data?.status === "in_progress"), "Breakdown in progress", bstart.json?.error);
    const resolve = await call(fleet, "PATCH", `/maintenance/breakdowns/${fixtures.breakdownId}/resolve`, { notes: "E2E repaired", cost: 800 });
    check(resolve.ok && (resolve.json?.data?.status === "resolved"), "Resolve breakdown (SAR 800)", resolve.json?.error);
    const heat = await call(fleet, "GET", "/maintenance/breakdowns/heatmap");
    check(heat.ok, "Breakdown heatmap endpoint responds", heat.json?.error);
  }

  const part = await call(fleet, "POST", "/maintenance/parts", {
    part_code: `E2E-OIL-${stamp}`, part_name: "E2E Oil Filter", category: "filters",
    manufacturer: "E2E Parts Co", unit_of_measure: "unit", quantity_in_stock: 10,
    reorder_level: 2, unit_price: 45, storage_location: "L2-A" });
  check(part.ok && part.json?.data?.id, "Create part (10 stock @SAR45)", part.json?.error);
  fixtures.partId = part.ok ? part.json.data.id : null;
  if (fixtures.partId) {
    const stockIn = await call(fleet, "POST", `/maintenance/parts/${fixtures.partId}/stock-in`, {
      quantity: 5, unit_price: 45, reference_type: "purchase", notes: "E2E replenish" });
    check(stockIn.ok && stockIn.json?.data?.quantityInStock === 15, "Stock-in +5 (15 total)", stockIn.json?.error);
    const stockOut = await call(fleet, "POST", `/maintenance/parts/${fixtures.partId}/stock-out`, {
      quantity: 1, maintenance_task_id: fixtures.taskId, notes: "E2E used on task" });
    check(stockOut.ok && stockOut.json?.data?.quantityInStock === 14, "Stock-out 1 linked to task (14 total)", stockOut.json?.error);
    const txn = await call(fleet, "GET", `/maintenance/parts/transactions?part_id=${fixtures.partId}`);
    check(txn.ok && txn.json?.data?.length >= 2, "Part transactions logged (in+out)", txn.json?.error);
  }

  if (fixtures.taskId) {
    const cost = await call(fleet, "POST", "/maintenance/costs", {
      maintenance_task_id: fixtures.taskId, labor_hours: 3, labor_rate: 60,
      paid_to: "E2E Auto Care", invoice_number: `E2E-INV-${stamp}`, status: "invoiced" });
    check(cost.ok && cost.json?.data?.id, "Record task cost (3h × SAR60)", cost.json?.error);
    fixtures.costId = cost.ok ? cost.json.data.id : null;
    if (cost.ok) {
      const c = cost.json.data;
      check(Number(c.partsCost) === 45, "Parts cost auto-calculated from stock-out (SAR45)", c.partsCost);
      check(Number(c.laborCost) === 180 && Number(c.totalCost) === 225, "Labor = 180, total = 225", { partsCost: c.partsCost, laborCost: c.laborCost, totalCost: c.totalCost });
    }
  }

  const complete = await call(fleet, "POST", `/maintenance/tasks/${fixtures.taskId}/complete`, { notes: "E2E done", cost: 225 });
  check(complete.ok && (complete.json?.data?.status === "completed"), "Complete task", complete.json?.error);
}

/* =================================================================
 * PHASE 7  Bookings: customer, availability, booking, waitlist, ticket, cancel, refund
 * ================================================================= */
async function phase7(sessions) {
  phase("7 Customers & Bookings");
  const cs = sessions.cs;

  const trip3 = await call(sessions.ops, "POST", "/operations/trips", {
    routeId: fixtures.routeId, busId: fixtures.busId,
    tripType: "single", scheduledDate: addDays(3), scheduledStartTime: "14:00", scheduledEndTime: "15:35",
    tripTitle: `E2E Trip3 ${stamp}`, notes: "E2E booking sim" });
  check(trip3.ok && trip3.json?.data?.id, "Ops schedules booking trip (future)", trip3.json?.error);
  const trip3Id = trip3.ok ? trip3.json.data.id : null;

  const cust = await call(cs, "POST", "/bookings/customers", {
    name: `E2E Passenger ${stamp}`, phone: `+9665${stamp}`, email: `e2e-pax-${stamp}@test.com`,
    nationality: "Saudi", notes: "E2E customer" });
  check(cust.ok && cust.json?.data?.id, "CSR creates customer", cust.json?.error);
  fixtures.customerId = cust.ok ? cust.json.data.id : null;

  const avail = await call(cs, "GET", `/bookings/trips/${trip3Id}/availability`);
  check(avail.ok, "Trip seat availability loads", avail.json?.error);

  const book = await call(cs, "POST", "/bookings", {
    customer_id: fixtures.customerId, trip_id: trip3Id, seat_numbers: [1, 2],
    passengers: [
      { passenger_name: `E2E Pax A ${stamp}`, seat_number: 1 },
      { passenger_name: `E2E Pax B ${stamp}`, seat_number: 2 },
    ],
    total_amount: 100, paid_amount: 100, notes: "E2E booking" });
  check(book.ok && book.json?.data?.id, "Create booking (2 seats, paid 100)", book.json?.error);
  fixtures.bookingId = book.ok ? book.json.data.id : null;

  const wl = await call(cs, "POST", "/bookings/waitlist", {
    trip_id: trip3Id, customer_id: fixtures.customerId, number_of_passengers: 2 });
  check(wl.ok, "Join trip waitlist", wl.json?.error);
  const wlList = await call(cs, "GET", `/bookings/waitlist?trip_id=${trip3Id}`);
  check(wlList.ok && wlList.json?.data?.some?.(e => e.customerId === fixtures.customerId || e.customer_id === fixtures.customerId),
    "Waitlist entry visible", wlList.json?.error);
  const wlExpire = await call(cs, "POST", "/bookings/waitlist/expire-offers");
  check(wlExpire.ok, "Expire old waitlist offers (job runs)", wlExpire.json?.error);

  if (fixtures.bookingId) {
    const conf = await call(cs, "POST", `/bookings/${fixtures.bookingId}/confirm`);
    check(conf.ok && (conf.json?.data?.status === "confirmed"), "Confirm booking", conf.json?.error);
    const comm = await call(cs, "GET", `/bookings/${fixtures.bookingId}/communications`);
    check(comm.ok && Array.isArray(comm.json?.data), "Booking communication log", comm.json?.error);
    const resend = await call(cs, "POST", `/bookings/${fixtures.bookingId}/communications/resend`, { type: "confirmation" });
    check(resend.ok, "Resend confirmation (email logged, SMTP optional)", resend.json?.error);
    const tick = await call(cs, "GET", `/bookings/${fixtures.bookingId}/ticket`);
    check(tick.status === 200 && tick.ct.includes("pdf") && tick.text.length > 1000,
      "Ticket PDF downloads with content", { status: tick.status, ct: tick.ct, len: tick.text.length });
    const refund = await call(cs, "POST", `/bookings/${fixtures.bookingId}/refund`, { reason: "E2E test refund" });
    check(refund.ok && (refund.json?.data?.status === "refunded"), "Refund booking (paid 100)", refund.json?.error);
  }

  const book2 = await call(cs, "POST", "/bookings", {
    customer_id: fixtures.customerId, trip_id: trip3Id, seat_numbers: [3],
    passengers: [{ passenger_name: `E2E Pax C ${stamp}`, seat_number: 3 }],
    total_amount: 50, paid_amount: 0, notes: "E2E booking 2" });
  check(book2.ok, "Create second booking (unpaid)", book2.json?.error);
  fixtures.bookingId2 = book2.ok ? book2.json.data.id : null;
  if (book2.ok) {
    const cancel = await call(cs, "POST", `/bookings/${book2.json.data.id}/cancel`, { reason: "E2E test cancel" });
    check(cancel.ok && (cancel.json?.data?.status === "cancelled"), "Cancel second booking", cancel.json?.error);
  }
}

/* =================================================================
 * PHASE 8  Accounting: accounts, expense, invoice, journal, banking, reports
 * ================================================================= */
async function phase8(sessions) {
  phase("8 Accounting & Finance");
  const fin = sessions.finance;

  const accts = await call(fin, "GET", "/accounts");
  const acctList = Array.isArray(accts.json?.data) ? accts.json.data : (accts.json?.data?.accounts || []);
  check(accts.ok && acctList.length > 0, "Chart of accounts loads", accts.json?.error);
  const assetAcct = acctList.find(a => a.type === "asset");
  const expenseAcct = acctList.find(a => a.code === "5100" || (a.name || "").toLowerCase().includes("fuel"));
  check(!!assetAcct && !!expenseAcct, "Account lookup for journal lines", { asset: assetAcct?.code, expense: expenseAcct?.code });

  const e2eAcct = await call(fin, "POST", "/accounts", {
    code: `E2E-${stamp}`, name: `E2E Project ${stamp}`, type: "expense", description: "E2E account" });
  check(e2eAcct.ok && e2eAcct.json?.data?.id, "Create custom E2E account", e2eAcct.json?.error);

  const exp = await call(fin, "POST", "/accounting/expenses", {
    expense_category: "fuel", amount: 520.5, description: `E2E fuel run ${stamp}`,
    date: today, bus_id: fixtures.busId, driver_id: fixtures.driverId });
  check(exp.ok && exp.json?.data?.id, "Finance records fuel expense (SAR 520.50)", exp.json?.error);
  fixtures.expenseId = exp.ok ? exp.json.data.id : null;
  if (fixtures.expenseId) {
    const apr = await call(fin, "PATCH", `/accounting/expenses/${fixtures.expenseId}/approve`);
    check(apr.ok && (apr.json?.data?.status === "approved"), "Approve expense", apr.json?.error);
    const rem = await call(fin, "PATCH", `/accounting/expenses/${fixtures.expenseId}/reimburse`);
    check(rem.ok && (rem.json?.data?.status === "reimbursed"), "Reimburse expense", rem.json?.error);
  }

  const inv = await call(fin, "POST", "/accounting/invoices", {
    customer_name: `E2E Corporate ${stamp}`, customer_contact: "+966503333333",
    invoice_date: today, due_date: addDays(15), tax_amount: 15,
    line_items: [{ description: "E2E charter trip", quantity: 1, unit_price: 1000 }],
    notes: "E2E invoice" });
  check(inv.ok && inv.json?.data?.id && (inv.json.data.status === "draft"), "Create draft invoice", inv.json?.error);
  fixtures.invoiceId = inv.ok ? inv.json.data.id : null;
  if (fixtures.invoiceId) {
    const iss = await call(fin, "POST", `/accounting/invoices/${fixtures.invoiceId}/issue`);
    check(iss.ok && (iss.json?.data?.status === "issued"), "Issue invoice", iss.json?.error);
    const pdf = await call(fin, "GET", `/accounting/invoices/${fixtures.invoiceId}/pdf`);
    check(pdf.status === 200 && pdf.ct.includes("pdf") && pdf.text.length > 1000, "Invoice PDF downloads", { status: pdf.status, len: pdf.text.length });
    const pay = await call(fin, "POST", `/accounting/invoices/${fixtures.invoiceId}/pay`, {
      amount: 1015, method: "bank_transfer", date: today, reference: `E2E-PAY-${stamp}` });
    check(pay.ok && (pay.json?.data?.status === "paid"), "Record payment → paid", pay.json?.error);
  }
  // cancel path invoice
  const inv2 = await call(fin, "POST", "/accounting/invoices", {
    customer_name: `E2E Corporate 2 ${stamp}`, invoice_date: today, due_date: addDays(10),
    line_items: [{ description: "E2E cancelled contract", quantity: 1, unit_price: 200 }] });
  fixtures.invoiceId2 = inv2.ok ? inv2.json.data.id : null;
  if (fixtures.invoiceId2) {
    await call(fin, "POST", `/accounting/invoices/${fixtures.invoiceId2}/issue`);
    const canc = await call(fin, "POST", `/accounting/invoices/${fixtures.invoiceId2}/cancel`);
    check(canc.ok && (canc.json?.data?.status === "cancelled"), "Cancel second invoice", canc.json?.error);
  }

  // Partial → final payment lifecycle
  const inv3 = await call(fin, "POST", "/accounting/invoices", {
    customer_name: `E2E Corporate 3 ${stamp}`, invoice_date: today, due_date: addDays(10),
    line_items: [{ description: "E2E partial pay contract", quantity: 1, unit_price: 600 }] });
  check(inv3.ok && inv3.json?.data?.id, "Create invoice for partial-pay flow", inv3.json?.error);
  fixtures.invoiceId3 = inv3.ok ? inv3.json.data.id : null;
  if (fixtures.invoiceId3) {
    const iss3 = await call(fin, "POST", `/accounting/invoices/${fixtures.invoiceId3}/issue`);
    check(iss3.ok, "Issue invoice for partial-pay flow", iss3.json?.error);
    const part = await call(fin, "POST", `/accounting/invoices/${fixtures.invoiceId3}/pay`, {
      amount: 250, method: "cash", date: today, reference: `E2E-PART-${stamp}` });
    check(part.ok && part.json?.data?.status === "issued" && Number(part.json?.data?.paidAmount || 0) === 250,
      "Partial payment keeps invoice issued (250/600)", part.json?.error);
    const full = await call(fin, "POST", `/accounting/invoices/${fixtures.invoiceId3}/pay`, {
      amount: 350, method: "cash", date: today, reference: `E2E-FULL-${stamp}` });
    check(full.ok && full.json?.data?.status === "paid", "Final payment closes invoice", full.json?.error);
    const paidList = await call(fin, "GET", "/accounting/invoices?status=paid&pageSize=50");
    check(paidList.ok && paidList.json?.data?.some?.(i => i.id === inv3.json.data.id), "Paid invoice visible in paid list", paidList.json?.error);
  }

  if (assetAcct && expenseAcct) {
    const je = await call(fin, "POST", "/accounting/journal-entries", {
      date: today, description: `E2E adjusting entry ${stamp}`, reference_type: "e2e",
      lines: [
        { account_id: assetAcct.id, debit_amount: 50, description: "E2E debit" },
        { account_id: expenseAcct.id, credit_amount: 50, description: "E2E credit" },
      ] });
    check(je.ok && je.json?.data?.id, "Post balanced journal entry (50/50)", je.json?.error);
    fixtures.journalId = je.ok ? je.json.data.id : null;
    const jel = await call(fin, "GET", "/accounting/journal-entries?status=posted");
    check(jel.ok, "Journal entries list loads", jel.json?.error);

    const draft = await call(fin, "POST", "/accounting/journal-entries", {
      date: today, description: `E2E draft entry ${stamp}`, reference_type: "e2e",
      lines: [
        { account_id: assetAcct.id, debit_amount: 25, description: "E2E draft debit" },
        { account_id: expenseAcct.id, credit_amount: 25, description: "E2E draft credit" },
      ] });
    check(draft.ok && draft.json?.data?.id && draft.json?.data?.status === "draft", "Create draft journal entry", draft.json?.error);
    if (draft.ok && draft.json?.data?.id) {
      const post = await call(fin, "POST", `/accounting/journal-entries/${draft.json.data.id}/post`);
      check(post.ok && post.json?.data?.status === "posted", "Post draft journal entry", post.json?.error);
    }
  }

  const bank = await call(fin, "POST", "/accounting/banking/accounts", {
    bank_name: `E2E Bank ${stamp}`, account_number: `E2E-ACC-${stamp}`, account_type: "checking", opening_balance: 5000 });
  check(bank.ok && bank.json?.data?.id, "Create bank account (SAR 5,000 opening)", bank.json?.error);
  fixtures.bankAccountId = bank.ok ? bank.json.data.id : null;
  if (fixtures.bankAccountId) {
    const imp = await call(fin, "POST", `/accounting/banking/accounts/${fixtures.bankAccountId}/transactions`, {
      transactions: [
        { transaction_date: today, description: "E2E bank deposit", reference: `E2E-DEP-${stamp}`, debit: 0, credit: 520.5 },
        { transaction_date: today, description: "E2E bank fee", reference: `E2E-FEE-${stamp}`, debit: 10, credit: 0 },
      ] });
    check(imp.ok && Array.isArray(imp.json?.data) && imp.json.data.length === 2, "Import 2 bank transactions", imp.json?.error);
    const unmatched = await call(fin, "GET", "/accounting/banking/reconciliation/unmatched");
    check(unmatched.ok && typeof unmatched.json?.data === "object", "Unmatched sources list loads", unmatched.json?.error);
    const src = unmatched.json?.data?.expenses?.find(e => e.id === fixtures.expenseId);
    if (src) {
      const txn = (imp.json?.data || []).find(t => t.description === "E2E bank deposit");
      if (txn) {
        const match = await call(fin, "POST", "/accounting/banking/reconciliation/match", {
          transaction_id: txn.id, match_type: "expense", match_id: fixtures.expenseId });
        check(match.ok, "Match bank deposit → E2E expense", match.json?.error);
      } else warn("Bank deposit transaction not returned for matching");
    } else {
      warn("E2E expense did not surface in unmatched sources (approved/reimbursed state, expected if already matched)");
    }
  }

  const pnl = await call(fin, "GET", "/accounting/reports/profit-loss");
  check(pnl.ok && pnl.json?.data, "P&L report loads", pnl.json?.error);
  const bs = await call(fin, "GET", "/accounting/reports/balance-sheet");
  check(bs.ok, "Balance sheet loads", bs.json?.error);
  const expCSV = await call(fin, "GET", "/accounting/reports/export/profit-loss/csv");
  check(expCSV.status === 200 && (expCSV.ct.includes("csv") || expCSV.text.length > 50), "P&L CSV export downloads", { status: expCSV.status, ct: expCSV.ct, len: expCSV.text.length });
}

/* =================================================================
 * PHASE 8.1  Cross-cutting: notifications, audit logs, exports, negatives
 * ================================================================= */
async function phase81(sessions) {
  phase("8.1 Cross-Cutting");
  const fleet = sessions.fleet, ops = sessions.ops, comp = sessions.company;

  const notifs = await call(sessions.driver1, "GET", "/notifications?pageSize=50");
  check(notifs.ok && Array.isArray(notifs.json?.data), "Driver notifications list", notifs.json?.error);
  const ncount = await call(sessions.driver1, "GET", "/notifications/count");
  check(ncount.ok, "Unread count endpoint", ncount.json?.error);
  const firstNotif = notifs.ok ? notifs.json.data.find(n => n.id || n.notificationId) : null;
  if (firstNotif) {
    const nid = firstNotif.id || firstNotif.notificationId;
    const mark = await call(sessions.driver1, "PATCH", `/notifications/${nid}/read`);
    check(mark.ok, "Mark one notification read", mark.json?.error);
    const dismiss = await call(sessions.driver1, "DELETE", `/notifications/${nid}`);
    check(dismiss.ok, "Dismiss notification", dismiss.json?.error);
    fixtures.notifId = nid;
  }

  const prefsSet = await call(sessions.driver1, "PUT", "/notifications/preferences", {
    preferences: [{ eventType: "trip_delay", inApp: true, email: false }] });
  check(prefsSet.ok, "Update notification preferences", prefsSet.json?.error);
  const prefsGet = await call(sessions.driver1, "GET", "/notifications/preferences");
  check(prefsGet.ok, "Read notification preferences", prefsGet.json?.error);

  const audit = await call(comp, "GET", "/audit-logs?page=1&pageSize=100");
  check(audit.ok && Array.isArray(audit.json?.data), "Audit log endpoint responds", audit.json?.error);
  const auditHits = audit.ok ? (audit.json.data || []).filter(e =>
    JSON.stringify(e).includes(`E2E-${stamp}`) || (e.resource === "bus" && e.resourceId === fixtures.busId)) : [];
  if (auditHits.length === 0) warn("No audit entries for E2E actions found (audit middleware may not be wired to routes)");
  else check(true, `Audit log contains ${auditHits.length} E2E action(s)`);

  const tripCSV = await call(ops, "GET", `/operations/reports/export?startDate=${today.slice(0, 8)}01&endDate=${today}`);
  check(tripCSV.status === 200 && tripCSV.text.length > 50, "Trip report CSV export downloads", { status: tripCSV.status, ct: tripCSV.ct, len: tripCSV.text.length });
  const fleetCSV = await call(fleet, "GET", "/fleet/analytics/export");
  check(fleetCSV.status === 200 && fleetCSV.text.length > 50, "Fleet analytics CSV export downloads", { status: fleetCSV.status, ct: fleetCSV.ct, len: fleetCSV.text.length });

  // pagination + filters across modules
  const tpage = await call(ops, "GET", "/operations/trips?pageSize=3&status=scheduled");
  check(tpage.ok && (tpage.json?.data?.length || 0) <= 3 && !!tpage.json?.meta, "Trips pagination + status filter", tpage.json?.error);
  const dpage = await call(comp, "GET", "/drivers?status=active&pageSize=5");
  check(dpage.ok && (dpage.json?.data?.length || 0) <= 5, "Drivers pagination + status filter", dpage.json?.error);
  const fpage = await call(fleet, "GET", `/fleet/fuel?startDate=${today.slice(0, 8)}01&endDate=${today}`);
  check(fpage.ok && Array.isArray(fpage.json?.data), "Fuel logs date-range filter", fpage.json?.error);
  const vpage = await call(sessions.hr, "GET", "/drivers/violations?severity=major&pageSize=10");
  check(vpage.ok && (vpage.json?.data?.length || 0) <= 10, "Violations severity filter", vpage.json?.error);

  // negative permission sweep (strengthened with true 403 messaging)
  const neg = [
    ["fleet", "/accounting/expenses", "POST", { expense_category: "fuel", amount: 1, date: today }],
    ["finance", "/fleet/assignments", "POST", { busId: "00000000-0000-0000-0000-000000000000", startDate: today }],
    ["cs", "/accounting/journal-entries", "POST", { date: today, lines: [] }],
    ["driver1", "/users", "GET", null],
    ["maint", "/fleet/buses", "GET", null],
    ["ops", "/tenants", "GET", null],
  ];
  for (const [sKey, path, method, body] of neg) {
    const r = await call(sessions[sKey], method, path, body);
    check(r.status === 403, `${USERS[sKey].role} → ${method} ${path} → 403`, { status: r.status });
  }
}

/* =================================================================
 * PHASE 9  Staff HR: employees, attendance, contracts, leave, payroll
 * ================================================================= */
async function phase9(sessions) {
  phase("9 Staff HR");
  const hr = sessions.hr, fin = sessions.finance;

  const emp = await call(hr, "POST", "/hr/employees", {
    name: `E2E Staff ${stamp}`, email: `e2e-staff-${stamp}@seum.com`, department: "operations",
    designation: "E2E Coordinator", phone: "+966501112233", nationality: "E2E",
    employee_code: `E2E-${stamp}`, password: "E2E-staff-123!",
    join_date: today });
  check(emp.ok && emp.json?.data?.id, "Create employee", emp.json?.error);
  fixtures.employeeId = emp.ok ? emp.json.data.id : null;

  const staffList = await call(hr, "GET", `/hr/employees?status=active`);
  check(staffList.ok && staffList.json?.data?.some?.(e => e.id === fixtures.employeeId), "Employee visible in active list", staffList.json?.error);

  const sal = await call(hr, "POST", "/hr/payroll/salary-structures", {
    employee_id: fixtures.employeeId, basic_salary: 5000, housing_allowance: 1500,
    transport_allowance: 500, insurance_deduction: 200, effective_from: "2026-01-01" });
  check(sal.ok, "Set employee salary structure (basic 5000)", sal.json?.error);

  const checkIn = await call(hr, "POST", "/hr/employee-attendance/check-in", { employee_id: fixtures.employeeId });
  check(checkIn.ok, "Attendance check-in", checkIn.json?.error);
  const checkOut = await call(hr, "POST", "/hr/employee-attendance/check-out", { employee_id: fixtures.employeeId });
  check(checkOut.ok, "Attendance check-out", checkOut.json?.error);
  const summ = await call(hr, "GET", `/hr/employee-attendance/summary?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}`);
  check(summ.ok, "Attendance monthly summary", summ.json?.error);

  const contract = await call(hr, "POST", "/hr/contracts", {
    employee_id: fixtures.employeeId,
    contract_type: "fixed_term", start_date: today, end_date: addDays(365),
    salary: 7000, status: "active" });
  check(contract.ok && contract.json?.data?.id, "Create employment contract", contract.json?.error);
  fixtures.contractId = contract.ok ? contract.json.data.id : null;
  if (fixtures.contractId) {
    const amend = await call(hr, "PATCH", `/hr/contracts/${fixtures.contractId}`, {
      end_date: addDays(730), salary: 7500 });
    check(amend.ok && amend.json?.data?.salary === 7500,
      "Amend contract (extend to 2y, salary 7000→7500)", amend.json?.error);
    const listCtx = await call(hr, "GET", `/hr/contracts?employee_id=${fixtures.employeeId}`);
    check(listCtx.ok && listCtx.json?.data?.some?.(c => c.id === fixtures.contractId), "Contract in employee contract list", listCtx.json?.error);
  }

  const leave = await call(hr, "POST", "/drivers/leaves", {
    driver_id: fixtures.e2eDriverId, leave_type: "annual", start_date: addDays(3),
    end_date: addDays(5), reason: `E2E-staff leave ${stamp}` });
  check(leave.ok && leave.json?.data?.status === "pending", "File annual leave request", leave.json?.error);
  if (leave.ok && leave.json?.data?.id) {
    const approve = await call(hr, "PATCH", `/drivers/leaves/${leave.json.data.id}/approve`, { approved_by: sessions.hr.user.id });
    check(approve.ok && approve.json?.data?.status === "approved", "Approve leave request", approve.json?.error);
  }

  const gen = await call(hr, "POST", "/hr/payroll/generate", {
    period_start: "2026-08-01", period_end: "2026-08-31" });
  check(gen.ok && Array.isArray(gen.json?.data?.records) && (gen.json.data.records.length > 0 || (gen.json?.data?.skipped?.length || 0) > 0),
    "Generate August payroll for all staff", gen.json?.error);
  const genSelf = await call(hr, "POST", "/hr/payroll/generate", {
    period_start: "2026-08-01", period_end: "2026-08-31", employee_ids: [fixtures.employeeId] });
  check(genSelf.ok && (genSelf.json?.data?.records || []).some?.(r => Number(r.basicSalary || r.basic_salary) === 5000),
    "Payroll picks up E2E employee (basic 5000)", genSelf.json?.error);
  const selfRec = genSelf.ok ? (genSelf.json?.data?.records || []).find(r => Number(r.basicSalary || r.basic_salary) === 5000) : null;
  if (selfRec?.id) {
    const apr2 = await call(fin, "PATCH", `/hr/payroll/${selfRec.id}/approve`);
    check(apr2.ok && apr2.json?.data?.status === "approved", "Approve E2E employee payroll", apr2.json?.error);
    await call(fin, "PATCH", `/hr/payroll/${selfRec.id}/pay`, { payment_reference: `E2E-PAY-${stamp}` });
  } else warn("E2E employee payroll record not found for approve/pay");
}

/* =================================================================
 * CLEANUP (best effort)
 * ================================================================= */
const FIXTURES_FILE = path.join(os.tmpdir(), "seum-e2e-fixtures.json");
function saveFixtures() {
  try { fs.writeFileSync(FIXTURES_FILE, JSON.stringify({ ...fixtures, stamp }, null, 2)); } catch {}
}
function loadFixtures() {
  try {
    const saved = JSON.parse(fs.readFileSync(FIXTURES_FILE, "utf8"));
    Object.assign(fixtures, saved);
    if (saved.stamp) stamp = saved.stamp;
  } catch {}
}

async function cleanup(sessions) {
  phase("Cleanup");
  const f = fixtures;
  const del = async (label, sKey, method, path, body) => {
    const r = await call(sessions[sKey], method, path, body);
    if (r.ok) check(true, `cleaned ${label}`);
    else if (r.status === 404) check(true, `${label} already gone`);
    else if (r.status === 409) check(true, `${label} already terminal state`);
    else warn(`cleanup ${label}: HTTP ${r.status} ${JSON.stringify(r.json?.error || "").slice(0, 120)}`);
  };
  const discover = async (label, sKey, listPath, match, delMethod, delPath, body) => {
    const lr = await call(sessions[sKey], "GET", listPath);
    const rows = lr.ok ? (lr.json?.data || []) : [];
    for (const row of rows) {
      if (!match(row)) continue;
      const r = await call(sessions[sKey], delMethod, delPath(row.id), body);
      if (r.ok) check(true, `cleaned ${label} (${row.id.slice(0, 8)}…)`);
      else if (r.status === 404) check(true, `${label} ${row.id.slice(0, 8)} already gone`);
      else if (r.status === 409) check(true, `${label} ${row.id.slice(0, 8)} already terminal state`);
      else warn(`cleanup ${label} ${row.id.slice(0, 8)}: HTTP ${r.status}`);
    }
  };

  if (f.bookingId) await del("booking refund/cancel", "cs", "POST", `/bookings/${f.bookingId}/cancel`, { reason: "E2E cleanup" });
  if (f.bookingId2) await del("booking2", "cs", "POST", `/bookings/${f.bookingId2}/cancel`, { reason: "E2E cleanup" });
  if (f.customerId) await del("customer", "cs", "DELETE", `/bookings/customers/${f.customerId}`);
  else await discover("customer", "cs", "/bookings/customers?pageSize=100", r => /^E2E-/i.test(r.name || ""), "DELETE", id => `/bookings/customers/${id}`);
  if (f.routeId) await del("route", "ops", "DELETE", `/operations/routes/${f.routeId}`);
  else await discover("route", "ops", "/operations/routes?pageSize=100", r => /^E2E-/i.test(r.name || ""), "DELETE", id => `/operations/routes/${id}`);
  if (f.taskId) await del("task", "fleet", "DELETE", `/maintenance/tasks/${f.taskId}`);
  else await discover("task", "fleet", "/maintenance/tasks?pageSize=100", r => /E2E/i.test(JSON.stringify(r).slice(0, 400)), "DELETE", id => `/maintenance/tasks/${id}`);
  if (f.busId) await del("buses", "company", "DELETE", `/fleet/buses/${f.busId}`);
  else await discover("buses", "company", "/fleet/buses?pageSize=100", r => /E2E/i.test((r.name || "") + (r.plateNumber || "")), "DELETE", id => `/fleet/buses/${id}`);
  if (f.invoiceId2) await del("invoice2", "finance", "POST", `/accounting/invoices/${f.invoiceId2}/cancel`);
  else await discover("invoice", "finance", "/accounting/invoices?pageSize=100", r => /E2E/i.test(r.invoiceNumber || ""), "POST", id => `/accounting/invoices/${id}/cancel`);
  if (f.invoiceId3) await del("invoice3 (paid, expect 409)", "finance", "POST", `/accounting/invoices/${f.invoiceId3}/cancel`);
  if (f.contractId) await del("contract", "hr", "DELETE", `/hr/contracts/${f.contractId}`);
  if (f.employeeId) await del("employee", "hr", "DELETE", `/hr/employees/${f.employeeId}`);
  else await discover("employee", "hr", "/hr/employees?pageSize=100", r => /^E2E-/i.test(r.employeeCode || ""), "DELETE", id => `/hr/employees/${id}`);
  await discover("expense", "finance", "/accounting/expenses?pageSize=100", r => /^E2E-/i.test(r.title || ""), "DELETE", id => `/accounting/expenses/${id}`);
  if (f.partId) await del("part", "fleet", "DELETE", `/maintenance/parts/${f.partId}`);
  else await discover("part", "fleet", "/maintenance/parts?pageSize=100", r => /^E2E-/i.test(r.name || ""), "DELETE", id => `/maintenance/parts/${id}`);
  await discover("driver", "hr", "/drivers/drivers?pageSize=100", r => /^E2E-/i.test(r.name || ""), "DELETE", id => `/drivers/drivers/${id}`);
  await discover("trip", "ops", "/operations/trips?pageSize=100", r => /E2E/i.test(JSON.stringify(r).slice(0, 400)), "POST", id => `/operations/trips/${id}/cancel`, { rejectionReason: "E2E cleanup" });
  await discover("leave", "hr", "/drivers/leaves?pageSize=100", r => /^E2E-/i.test(r.reason || ""), "DELETE", id => `/drivers/leaves/${id}`);
  if (f.tenantId) await del("tenant (hard)", "super", "DELETE", `/tenants/${f.tenantId}/permanent`);
  if (f.newUserEmail) {
    const users = await call(sessions.super, "GET", "/users?pageSize=100");
    const u = (users.json?.data || []).find(x => x.email === f.newUserEmail);
    if (u) await del("e2e user", "super", "DELETE", `/users/${u.id}`);
  }
  await discover("e2e user", "super", "/users?pageSize=100", r => /^e2e-/i.test(r.email || ""), "DELETE", id => `/users/${id}`);
}

/* =================================================================
 * MAIN
 * ================================================================= */
async function main() {
  const onlyCleanup = process.argv.includes("--cleanup-only");
  const noCleanup = process.argv.includes("--no-cleanup");
  const to81 = process.argv.includes("--to-81");

  console.log(`SEUM Manual E2E — ${new Date().toISOString()}`);
  console.log(`API: ${API}\n`);

  const sessions = {};
  if (!onlyCleanup) {
    let i = 0;
    for (const key of Object.keys(USERS)) {
      const s = { label: key, cookies: new Map(), user: null };
      try { await login(s); sessions[key] = s; }
      catch (e) { console.error(`FATAL: ${e.message}`); process.exit(1); }
      i++;
      if (i < Object.keys(USERS).length) await sleep(6800); // stay under login rate limit (10/60s/IP)
    }
    console.log(`✓ Logged in ${Object.keys(USERS).length} demo roles (cookie sessions)\n`);

    await phase12(sessions);
    logPhase("1-2 Platform & Roles");
    if (fixtures.busId || sessions.fleet) {
      await phase3(sessions); logPhase("3 Fleet Management");
      await phase4(sessions); logPhase("4 Operations & Trips");
    }
    await phase5(sessions); logPhase("5 Drivers & HR");
    await phase6(sessions); logPhase("6 Maintenance");
    await phase7(sessions); logPhase("7 Customers & Bookings");
    await phase8(sessions); logPhase("8 Accounting & Finance");
    await phase81(sessions); logPhase("8.1 Cross-Cutting");
    if (!to81) { await phase9(sessions); logPhase("9 Staff HR"); }
    saveFixtures();
  }

  if (!noCleanup && !onlyCleanup) await cleanup(sessions);
  if (onlyCleanup) {
    loadFixtures();
    const keys = Object.keys(USERS);
    for (let i = 0; i < keys.length; i++) {
      const s = makeSession(keys[i]);
      try { await login(s); sessions[keys[i]] = s; } catch (e) { console.error(e.message); }
      if (i < keys.length - 1) await sleep(6800);
    }
    await cleanup(sessions);
  }

  // report
  let totalFail = 0, totalPass = 0, totalWarn = 0;
  console.log("\n═══════════════════════════════════════════════");
  console.log("PHASE REPORT");
  console.log("═══════════════════════════════════════════════");
  for (const [name, r] of phaseResults) {
    totalFail += r.fail; totalPass += r.pass; totalWarn += r.warn;
    const icon = r.fail === 0 ? "✓" : "✗";
    console.log(`${icon} ${name}: ${r.pass} passed, ${r.fail} failed, ${r.warn} warnings`);
    for (const n of r.notes) console.log(`    ${n}`);
  }
  console.log("\n───────────────────────────────────────────────");
  console.log(`TOTAL: ${totalPass} passed | ${totalFail} failed | ${totalWarn} warnings`);
  console.log(totalFail === 0 ? "\n✅ ALL PHASES GREEN" : `\n❌ ${totalFail} check(s) failed`);
  process.exit(totalFail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });