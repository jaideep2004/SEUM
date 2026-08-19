import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as customerController from '../controllers/customerController';

const router = Router();

const CUSTOMER_WRITE = ['super_admin', 'company_admin', 'operations_manager', 'customer_service'];
const CUSTOMER_READ = [...CUSTOMER_WRITE, 'fleet_manager'];

router.post('/', authenticate, requireRole(...CUSTOMER_WRITE), customerController.createCustomer);
router.get('/', authenticate, requireRole(...CUSTOMER_READ), customerController.listCustomers);
router.get('/:id', authenticate, requireRole(...CUSTOMER_READ), customerController.getCustomer);
router.get('/:id/bookings', authenticate, requireRole(...CUSTOMER_READ), customerController.getCustomerBookings);
router.patch('/:id', authenticate, requireRole(...CUSTOMER_WRITE), customerController.updateCustomer);
router.delete('/:id', authenticate, requireRole(...CUSTOMER_WRITE), customerController.deleteCustomer);

export default router;