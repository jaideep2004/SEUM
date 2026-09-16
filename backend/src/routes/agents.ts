import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as agentController from '../controllers/agentController';

const router = Router();

// All authenticated users with booking/customer/trip access can list agents
const AGENT_READ = ['super_admin', 'company_admin', 'operations_manager', 'fleet_manager', 'customer_service', 'executive', 'finance_accountant'];

router.get('/', authenticate, requireRole(...AGENT_READ), agentController.listAgents);

export default router;
