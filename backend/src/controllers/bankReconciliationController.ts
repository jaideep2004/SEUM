import { Request, Response } from 'express';
import * as bankService from '../services/bankReconciliationService';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

export const csvUpload = upload.single('file');

export async function createAccount(req: Request, res: Response) {
  try {
    const { bank_name, account_number, account_type, opening_balance } = req.body;
    if (!bank_name || !account_number) {
      return res.status(400).json({ success: false, error: 'bank_name and account_number are required' });
    }
    const data = await bankService.createAccount(req.user!.tenantId, { bank_name, account_number, account_type, opening_balance: opening_balance ? parseFloat(opening_balance) : undefined }, req.user!.userId);
    res.status(201).json({ success: true, data });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
}

export async function listAccounts(req: Request, res: Response) {
  try {
    const data = await bankService.listAccounts(req.user!.tenantId);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getAccount(req: Request, res: Response) {
  try {
    const data = await bankService.getAccount(req.user!.tenantId, req.params.id);
    res.json({ success: true, data });
  } catch (err: any) { res.status(404).json({ success: false, error: err.message }); }
}

export async function updateAccount(req: Request, res: Response) {
  try {
    const { bank_name, account_type } = req.body;
    const data = await bankService.updateAccount(req.user!.tenantId, req.params.id, { bank_name, account_type });
    res.json({ success: true, data });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
}

export async function importTransactions(req: Request, res: Response) {
  try {
    let txs: any[];
    if (req.file) {
      // CSV upload
      const csv = req.file.buffer.toString('utf-8');
      const lines = csv.split('\n').filter(l => l.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      txs = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: any = {};
        headers.forEach((h, i) => row[h] = vals[i]);
        return {
          transaction_date: row.date || row.transaction_date,
          description: row.description || '',
          reference: row.reference || '',
          debit: parseFloat(row.debit) || 0,
          credit: parseFloat(row.credit) || 0,
        };
      }).filter(t => t.transaction_date);
    } else {
      txs = req.body.transactions || req.body;
      if (!Array.isArray(txs)) txs = [txs];
    }

    const { accountId } = req.params;
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId required' });
    if (txs.length === 0) return res.status(400).json({ success: false, error: 'No transactions to import' });

    const data = await bankService.importTransactions(req.user!.tenantId, accountId, txs);
    res.status(201).json({ success: true, data, count: data.length });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
}

export async function listTransactions(req: Request, res: Response) {
  try {
    const { reconciled } = req.query;
    const data = await bankService.listTransactions(
      req.user!.tenantId, req.params.accountId,
      reconciled !== undefined ? reconciled === 'true' : undefined,
    );
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function getUnmatched(req: Request, res: Response) {
  try {
    const data = await bankService.getUnmatchedSources(req.user!.tenantId);
    res.json({ success: true, data });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
}

export async function matchTransaction(req: Request, res: Response) {
  try {
    const { transaction_id, match_type, match_id } = req.body;
    if (!transaction_id || !match_type || !match_id) {
      return res.status(400).json({ success: false, error: 'transaction_id, match_type, and match_id required' });
    }
    const data = await bankService.matchTransaction(req.user!.tenantId, transaction_id, match_type, match_id);
    res.json({ success: true, data });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
}

export async function unmatchTransaction(req: Request, res: Response) {
  try {
    const data = await bankService.unmatchTransaction(req.user!.tenantId, req.params.id);
    res.json({ success: true, data });
  } catch (err: any) { res.status(400).json({ success: false, error: err.message }); }
}
