import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const TID = 't1', UID = 'u1';

beforeEach(() => { jest.resetAllMocks(); });

describe('createNotification', () => {
  it('creates notification from input object', async () => {
    mockQ.mockResolvedValue([]);
    const { createNotification } = require('../services/notificationService');
    await expect(createNotification({ tenantId: TID, userId: UID, type: 'invoice_paid', title: 'Test', message: 'Hello' })).resolves.not.toThrow();
  });
});

describe('createDocumentExpiryNotifications', () => {
  it('creates notifications for expiring docs', async () => {
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
});
