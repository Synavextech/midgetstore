import express from 'express'
import {
  getProducts,
  getProduct,
  trackProductView,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController.js'
import { protect, authorize } from '../middleware/auth.js'

const router = express.Router()

// Public routes
router.get('/', getProducts)
router.get('/:id', getProduct)
router.post('/:id/view', trackProductView)

// Protected Admin routes
router.post('/', protect, authorize('ADMIN'), createProduct)
router.put('/:id', protect, authorize('ADMIN'), updateProduct)
router.delete('/:id', protect, authorize('ADMIN'), deleteProduct)

export default router