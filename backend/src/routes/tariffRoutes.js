import express from 'express';
import {
  getTariffs,
  getActiveTariffs,
  createTariff,
  updateTariff,
  deleteTariff
} from '../controllers/tariffController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getTariffs);
router.get('/active', getActiveTariffs);
router.post('/', authorize('admin'), createTariff);
router.put('/:id', authorize('admin'), updateTariff);
router.delete('/:id', authorize('admin'), deleteTariff);

export default router;
