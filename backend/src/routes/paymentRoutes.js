import express from 'express';
import {
  getPayments,
  createPayment,
  verifyPayment,
  getPaymentStatistics
} from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getPayments);
router.get('/statistics', authorize('admin'), getPaymentStatistics);
router.post('/', createPayment);
router.put('/:id/verify', authorize('admin'), verifyPayment);

export default router;
