import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import {
  getDashboard,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus,
  getUsers,
  updateUserStatus,
  getAnalytics
} from '../controllers/adminController.js'
import { protect, authorize } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure Multer storage for product uploads with dual-write into client/public/images and dist/images
const clientImagesDir = path.resolve(__dirname, '../../../client/public/images')
const distImagesDir = path.resolve(__dirname, '../../../dist/images')

if (!fs.existsSync(clientImagesDir)) {
  fs.mkdirSync(clientImagesDir, { recursive: true })
}
if (!fs.existsSync(distImagesDir)) {
  fs.mkdirSync(distImagesDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, clientImagesDir)
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')
    cb(null, `prod_${Date.now()}_${safeName}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed.'))
    }
  }
})

// All admin routes require authentication and ADMIN role
router.use(protect, authorize('ADMIN'))

// File upload endpoint for admin catalog items
router.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No image uploaded' })
  }

  // Dual-write sync: copy uploaded file to dist/images for immediate live serving
  try {
    if (!fs.existsSync(distImagesDir)) {
      fs.mkdirSync(distImagesDir, { recursive: true })
    }
    const distTarget = path.join(distImagesDir, req.file.filename)
    fs.copyFileSync(req.file.path, distTarget)
  } catch (syncErr) {
    console.warn('Notice: Could not sync image to dist/images:', syncErr)
  }

  const publicUrl = `/images/${req.file.filename}`
  res.status(200).json({
    success: true,
    data: {
      url: publicUrl,
      filename: req.file.filename
    }
  })
})

// Dashboard and analytics
router.get('/dashboard', getDashboard)
router.get('/analytics', getAnalytics)

// Product management
router.get('/products', getProducts)
router.post('/products', createProduct)
router.put('/products/:id', updateProduct)
router.delete('/products/:id', deleteProduct)

// Order management
router.get('/orders', getOrders)
router.put('/orders/:id/status', updateOrderStatus)

// User management
router.get('/users', getUsers)
router.put('/users/:id/status', updateUserStatus)

export default router