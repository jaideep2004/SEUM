import { query, queryOne } from '../db';

jest.mock('../db', () => ({ query: jest.fn(), queryOne: jest.fn() }));

const mockQ = query as jest.Mock;
const mockQ1 = queryOne as jest.Mock;

beforeEach(() => { jest.resetAllMocks(); });

describe('cleanupOldAuditLogs', () => {
  it('deletes logs older than retention days', async () => {
    mockQ.mockResolvedValue([{ id: 'aud-1' }]);
    const { cleanupOldAuditLogs } = require('../services/auditCleanupService');
    const r = await cleanupOldAuditLogs(90);
    expect(r.deletedCount).toBe(1);
  });

  it('returns zero when no old logs', async () => {
    mockQ.mockResolvedValue([]);
    const { cleanupOldAuditLogs } = require('../services/auditCleanupService');
    const r = await cleanupOldAuditLogs(90);
    expect(r.deletedCount).toBe(0);
  });
});
