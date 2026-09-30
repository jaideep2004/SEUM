import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { CAPABILITIES as CAP } from '../auth/roles';
import * as controller from '../controllers/communicationController';

const COMMS_READ = CAP.communicationsRead;
const COMMS_WRITE = CAP.communicationsWrite;

const router = Router();

// All routes require auth
router.use(authenticate);

// ── WhatsApp templates (L814) ──
router.get('/whatsapp/templates', requireRole(...COMMS_READ), controller.listWhatsappTemplates);
router.post('/whatsapp/templates', requireRole(...COMMS_WRITE), controller.createWhatsappTemplate);
router.get('/whatsapp/templates/:id', requireRole(...COMMS_READ), controller.getWhatsappTemplate);
router.patch('/whatsapp/templates/:id', requireRole(...COMMS_WRITE), controller.updateWhatsappTemplate);
router.put('/whatsapp/templates/:id', requireRole(...COMMS_WRITE), controller.updateWhatsappTemplate);
router.delete('/whatsapp/templates/:id', requireRole(...COMMS_WRITE), controller.deleteWhatsappTemplate);

// ── WhatsApp send (L813) ──
router.post('/whatsapp/send', requireRole(...COMMS_WRITE), controller.sendWhatsapp);

// ── Unified send (L826) ──
router.post('/send', requireRole(...COMMS_WRITE), controller.unifiedSend);

// ── Logs (L817) ──
router.get('/logs', requireRole(...COMMS_READ), controller.listLogs);

// ── Settings (L829) ──
router.get('/settings', requireRole(...COMMS_READ), controller.getSettings);
router.put('/settings', requireRole(...COMMS_WRITE), controller.updateSettings);
router.patch('/settings', requireRole(...COMMS_WRITE), controller.updateSettings);

// ── Customer preferences (L827) ──
router.get('/customers/:customerId/preferences', requireRole(...COMMS_READ), controller.getCustomerPreference);
router.put('/customers/:customerId/preferences', requireRole(...COMMS_WRITE), controller.updateCustomerPreference);
router.patch('/customers/:customerId/preferences', requireRole(...COMMS_WRITE), controller.updateCustomerPreference);

// ── Utility: preview variable substitution (L815) ──
router.post('/preview', requireRole(...COMMS_READ), controller.previewTemplate);

export default router;
