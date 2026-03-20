import express from 'express';

// Controllers
import {
  createCheckoutSession,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  getMyOrders,
  cancelOrder,
   getOrderBySessionId,
  addOrderItemReview,
  updateOrderItemReview

} from '../controllers/order.controller.js';

// Auth
import { requireAuth as protect, requireRole } from '../middlewares/auth.js';

const router = express.Router();

// --- Public & Customer-Facing ---

router.post('/create-checkout-session', protect, requireRole('Admin', 'Employee', 'Customer'), express.json(), createCheckoutSession);

// ✅ Make the session lookup PUBLIC so success page works without login
router.get('/session/:sessionId', getOrderBySessionId);

// User’s own orders (requires auth)
router.get('/myorders', protect, getMyOrders);

// Cancel own order (requires auth)
router.put('/:id/cancel', protect, cancelOrder);

// Review order items (requires auth)
router.post('/:orderId/reviews', protect, express.json(), addOrderItemReview);
router.put('/:orderId/reviews', protect, express.json(), updateOrderItemReview);


// --- Admin-only ---
router.get('/', protect, requireRole('Admin'), getAllOrders);
router.get('/:id', protect, requireRole('Admin'), getOrderById);
router.put('/:id/status', protect, requireRole('Admin'), express.json(), updateOrderStatus);

export default router;
