import { Router } from 'express';
import multer from 'multer';
import * as driverController from '../controllers/driverController';
import { CAPABILITIES as CAP } from '../auth/roles';
import { authenticate, requireRole } from '../middleware/auth';

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.post('/', authenticate, requireRole(...CAP.driverProfileWrite), driverController.createDriver);
router.get('/', authenticate, requireRole(...CAP.driverProfileRead), driverController.listDrivers);
router.get('/:id', authenticate, requireRole(...CAP.driverProfileRead), driverController.getDriver);
router.patch('/:id', authenticate, requireRole(...CAP.driverProfileWrite), driverController.updateDriver);
router.delete('/:id', authenticate, requireRole(...CAP.driverProfileWrite), driverController.deleteDriver);

router.post('/:id/photo', authenticate, requireRole(...CAP.driverProfileWrite), upload.single('photo'), driverController.uploadPhoto);

router.post('/:id/documents', authenticate, requireRole(...CAP.driverProfileWrite), upload.single('file'), driverController.createDocument);
router.get('/:id/documents', authenticate, requireRole(...CAP.driverProfileRead), driverController.listDocuments);
router.delete('/:id/documents/:docId', authenticate, requireRole(...CAP.driverProfileWrite), driverController.deleteDocument);

router.get('/expiring/licenses', authenticate, requireRole(...CAP.driverProfileRead), driverController.getExpiringLicenses);
router.get('/expiring/medical', authenticate, requireRole(...CAP.driverProfileRead), driverController.getExpiringMedical);

export default router;
