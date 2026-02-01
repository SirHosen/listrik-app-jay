import express from 'express';
import {
  getBills,
  getBill,
  generateBill,
  generateBulkBills,
  updateBillStatus,
  deleteBill
} from '../controllers/billController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getBills);
router.post('/generate', authorize('admin'), generateBill);
router.post('/generate-bulk', authorize('admin'), generateBulkBills);
router.get('/:id', getBill);
router.put('/:id/status', authorize('admin'), updateBillStatus);
router.delete('/:id', authorize('admin'), deleteBill);

export default router;
