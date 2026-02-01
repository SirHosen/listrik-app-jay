import express from 'express';
import {
  getMeterReadings,
  createMeterReading,
  updateMeterReading,
  deleteMeterReading,
  getLastMeterReading
} from '../controllers/meterReadingController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getMeterReadings);
router.get('/last/:customerId', authorize('admin'), getLastMeterReading);
router.post('/', authorize('admin'), createMeterReading);
router.put('/:id', authorize('admin'), updateMeterReading);
router.delete('/:id', authorize('admin'), deleteMeterReading);

export default router;
