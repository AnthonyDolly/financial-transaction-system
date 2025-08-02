import { Router } from 'express';
import { SeedController } from '../controllers/seedController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate(), SeedController.executeSeed);

export default router;
