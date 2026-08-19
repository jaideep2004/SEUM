import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));
jest.mock('../services/emailService', () => ({ sendEmailAsync: jest.fn(), sendEmail: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;
const TID = 't1', UID = 'u1';

beforeEach(() => { jest.resetAllMocks(); });

describe('createNotification', () => {
  it('creates notification from input object', async () => {
    mockQ.mockResolvedValue([]);
    const { createNotification } = require('../services/notificationService');
    await expect(createNotification({ tenantId: TID, userId: UID, type: 'invoice_paid', title: 'Test', message: 'Hello' })).resolves.not.toThrow();
  });

  it('stores data payload as JSON', async () => {
    mockQ.mockResolvedValue([]);
    const { createNotification } = require('../services/notificationService');
    const ok = await createNotification({
      tenantId: TID, userId: UID, type: 'trip_delayed', title: 'Delayed',
      data: { delayMinutes: 45, reason: 'Traffic' }, resourceId: 'tr1',
    });
    expect(ok).toBe(true);
    const insert = mockQ.mock.calls.find((c) => c[0] && c[0].includes('INSERT INTO notifications'));
    expect(insert).toBeTruthy();
    expect(JSON.parse(insert[1][6])).toEqual({ delayMinutes: 45, reason: 'Traffic' });
  });

  it('skips creation when in-app preference is disabled', async () => {
    mockQ1.mockResolvedValue({ in_app: false, email: true });
    mockQ.mockResolvedValue([]);
    const { createNotification } = require('../services/notificationService');
    const ok = await createNotification({ tenantId: TID, userId: UID, type: 'trip_delayed', title: 'Delayed' });
    expect(ok).toBe(false);
    const inserts = mockQ.mock.calls.filter((c) => c[0] && c[0].includes('INSERT INTO notifications'));
    expect(inserts).toHaveLength(0);
  });

  it('defaults to allowed when no preference row exists', async () => {
    mockQ1.mockResolvedValue(null);
    mockQ.mockResolvedValue([]);
    const { createNotification } = require('../services/notificationService');
    expect(await createNotification({ tenantId: TID, userId: UID, type: 'trip_assigned', title: 'Assigned' })).toBe(true);
  });
});

describe('notification preferences', () => {
  it('returns catalog with stored overrides', async () => {
    mockQ.mockResolvedValue([{ event_type: 'trip_assigned', in_app: false, email: true }]);
    const { getNotificationPreferences } = require('../services/notificationService');
    const prefs = await getNotificationPreferences(TID, UID);
    expect(prefs.length).toBeGreaterThan(3);
    const ta = prefs.find((p: any) => p.eventType === 'trip_assigned');
    expect(ta.inApp).toBe(false);
    expect(ta.email).toBe(true);
    expect(ta.sendsEmail).toBe(true);
    const noEmail = prefs.find((p: any) => p.eventType === 'booking_new');
    expect(noEmail.sendsEmail).toBe(false);
  });

  it('upserts preferences and returns updated list', async () => {
    mockQ1.mockResolvedValue(null);
    mockQ.mockResolvedValue([]);
    const { updateNotificationPreferences, NOTIFICATION_EVENTS } = require('../services/notificationService');
    await updateNotificationPreferences(TID, UID, [{ eventType: 'trip_assigned', inApp: false, email: false }]);
    const upsert = mockQ.mock.calls.find((c) => c[0] && c[0].includes('ON CONFLICT'));
    expect(upsert).toBeTruthy();
    expect(upsert[1][2]).toBe('trip_assigned');
    expect(upsert[1][3]).toBe(false);
    expect(NOTIFICATION_EVENTS.length).toBeGreaterThan(5);
  });
});

describe('createDocumentExpiryNotifications', () => {
  it('creates notifications for expiring docs', async () => {
    mockQ1.mockResolvedValue(null);
    mockQ
      .mockResolvedValueOnce([{ id: 'doc-1', bus_id: 'b-1', plate_number: 'BUS1', document_type: 'insurance', expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), tenant_id: TID, status: 'active' }])
      .mockResolvedValueOnce([{ id: UID }])
      .mockResolvedValue([]);
    const { createDocumentExpiryNotifications } = require('../services/notificationService');
    const count = await createDocumentExpiryNotifications(TID);
    expect(count).toBe(1);
  });

  it('returns 0 when no expiring docs', async () => {
    mockQ.mockResolvedValue([]);
    const { createDocumentExpiryNotifications } = require('../services/notificationService');
    const count = await createDocumentExpiryNotifications(TID);
    expect(count).toBe(0);
  });

  it('skips email when email preference is disabled', async () => {
    mockQ1.mockResolvedValue({ in_app: true, email: false });
    const { sendEmailAsync } = require('../services/emailService');
    mockQ
      .mockResolvedValueOnce([{ id: 'doc-1', bus_id: 'b-1', plate_number: 'BUS1', document_type: 'insurance', expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10), tenant_id: TID, status: 'active' }])
      .mockResolvedValueOnce([{ id: UID, email: 'mgr@example.com', name: 'Mgr' }])
      .mockResolvedValue([]);
    const { createDocumentExpiryNotifications } = require('../services/notificationService');
    await createDocumentExpiryNotifications(TID);
    expect(sendEmailAsync).not.toHaveBeenCalled();
  });
});