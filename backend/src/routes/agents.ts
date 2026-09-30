import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as agentController from '../controllers/agentController';
import { CAPABILITIES as CAP } from '../auth/roles';

const router = Router();

// All authenticated users with booking/customer/trip access can list agents
const AGENT_READ = CAP.agentsRead;

router.get('/', authenticate, requireRole(...AGENT_READ), agentController.listAgents);

export default router;
