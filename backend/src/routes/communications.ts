import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as controller from '../controllers/communicationController';

const router = Router();

// All routes require auth
router.use(authenticate);

// ── WhatsApp templates (L814) ──
router.get('/whatsapp/templates', controller.listWhatsappTemplates);
router.post('/whatsapp/templates', controller.createWhatsappTemplate);
router.get('/whatsapp/templates/:id', controller.getWhatsappTemplate);
router.patch('/whatsapp/templates/:id', controller.updateWhatsappTemplate);
router.put('/whatsapp/templates/:id', controller.updateWhatsappTemplate);
router.delete('/whatsapp/templates/:id', controller.deleteWhatsappTemplate);

// ── WhatsApp send (L813) ──
router.post('/whatsapp/send', controller.sendWhatsapp);

// ── Unified send (L826) ──
router.post('/send', controller.unifiedSend);

// ── Logs (L817) ──
router.get('/logs', controller.listLogs);

// ── Settings (L829) ──
router.get('/settings', controller.getSettings);
router.put('/settings', controller.updateSettings);
router.patch('/settings', controller.updateSettings);

// ── Customer preferences (L827) ──
router.get('/customers/:customerId/preferences', controller.getCustomerPreference);
router.put('/customers/:customerId/preferences', controller.updateCustomerPreference);
router.patch('/customers/:customerId/preferences', controller.updateCustomerPreference);

// ── Utility: preview variable substitution (L815) ──
router.post('/preview', controller.previewTemplate);

export default router;
