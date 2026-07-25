import { Router } from 'express';
import multer from 'multer';
import * as driverController from '../controllers/driverController';
import { authenticate, requireRole } from '../middleware/auth';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post('/', authenticate, requireRole('super_admin', 'company_admin'), driverController.createDriver);
router.get('/', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), driverController.listDrivers);
router.get('/:id', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), driverController.getDriver);
router.patch('/:id', authenticate, requireRole('super_admin', 'company_admin'), driverController.updateDriver);
router.delete('/:id', authenticate, requireRole('super_admin', 'company_admin'), driverController.deleteDriver);

router.post('/:id/photo', authenticate, requireRole('super_admin', 'company_admin'), upload.single('photo'), driverController.uploadPhoto);

router.post('/:id/documents', authenticate, requireRole('super_admin', 'company_admin'), upload.single('file'), driverController.createDocument);
router.get('/:id/documents', authenticate, requireRole('super_admin', 'company_admin', 'operations_manager'), driverController.listDocuments);
router.delete('/:id/documents/:docId', authenticate, requireRole('super_admin', 'company_admin'), driverController.deleteDocument);

router.get('/expiring/licenses', authenticate, requireRole('super_admin', 'company_admin'), driverController.getExpiringLicenses);
router.get('/expiring/medical', authenticate, requireRole('super_admin', 'company_admin'), driverController.getExpiringMedical);

export default router;
