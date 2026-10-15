import express from 'express'
import {
  createOrder,
  getOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats
} from '../controllers/orderController.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// All order routes require authentication
router.use(protect)

// Customer order routes
router.post('/', createOrder)
router.get('/', getOrders)
router.get('/stats', authorize('ADMIN'), getOrderStats)
router.get('/:id', getOrder)
router.put('/:id/cancel', cancelOrder)

// Admin order management
router.put('/:id/status', authorize('ADMIN'), updateOrderStatus)

export default router