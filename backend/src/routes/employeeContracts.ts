import { Router } from 'express';
import multer from 'multer';
import { authenticate, requireRole } from '../middleware/auth';
import * as contractController from '../controllers/employeeContractController';

const router = Router();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

const HR_WRITE = ['super_admin', 'company_admin', 'hr_manager'];
const HR_READ = [...HR_WRITE, 'operations_manager', 'finance_accountant'];

// Contracts
router.post('/contracts', authenticate, requireRole(...HR_WRITE), upload.single('file'), contractController.createContract);
router.get('/contracts', authenticate, requireRole(...HR_READ), contractController.listContracts);
router.get('/contracts/:id', authenticate, requireRole(...HR_READ), contractController.getContract);
router.patch('/contracts/:id', authenticate, requireRole(...HR_WRITE), upload.single('file'), contractController.updateContract);
router.delete('/contracts/:id', authenticate, requireRole(...HR_WRITE), contractController.deleteContract);

// Documents
router.post('/employee-documents', authenticate, requireRole(...HR_WRITE), upload.single('file'), contractController.createDocument);
router.get('/employee-documents', authenticate, requireRole(...HR_READ), contractController.listDocuments);
router.patch('/employee-documents/:id', authenticate, requireRole(...HR_WRITE), upload.single('file'), contractController.updateDocument);
router.delete('/employee-documents/:id', authenticate, requireRole(...HR_WRITE), contractController.deleteDocument);

// Expiry alerts
router.get('/expiry-alerts', authenticate, requireRole(...HR_READ), contractController.expiryAlerts);

export default router;