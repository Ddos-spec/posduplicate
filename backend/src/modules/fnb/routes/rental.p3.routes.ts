import { Router } from 'express';
import { authMiddleware } from '../../../middlewares/auth.middleware';
import { tenantMiddleware } from '../../../middlewares/tenant.middleware';
import { requireCapability } from '../../../middlewares/capability.middleware';
import { getRentalItemAvailability, getRentalItems, putRentalItem } from '../controllers/rental-item.p3.controller';
import {
  getRentalBookings,
  patchRentalBookingStatus,
  postRentalBooking,
  postRentalDepositHold,
  postRentalDepositRelease,
} from '../controllers/rental-booking.p3.controller';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/items', requireCapability('revenue.rental.read'), getRentalItems);
router.put('/items', requireCapability('revenue.rental.manage'), putRentalItem);
router.get('/items/:itemId/availability', requireCapability('revenue.rental.read'), getRentalItemAvailability);
router.get('/bookings', requireCapability('revenue.rental.read'), getRentalBookings);
router.post('/bookings', requireCapability('revenue.rental.manage'), postRentalBooking);
router.patch('/bookings/:id/status', requireCapability('revenue.rental.manage'), patchRentalBookingStatus);
router.post('/bookings/:id/deposit/hold', requireCapability('revenue.rental.manage'), postRentalDepositHold);
router.post('/bookings/:id/deposit/release', requireCapability('revenue.rental.manage'), postRentalDepositRelease);

export default router;
