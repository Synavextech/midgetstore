import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import database connection
import { supabase } from './utils/supabase.js'

// Import routes
import productRoutes from './routes/products.js'
import orderRoutes from './routes/orders.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import eventsRoutes from './routes/events.js'
import paymentRoutes from './routes/payments.js'
import cartRoutes from './routes/cart.js'

// Import middleware
import { errorHandler } from './middleware/errorHandler.js'
import { notFound } from './middleware/notFound.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// Logging middleware
app.use(morgan('combined'))

// Static file serving for locally hosted product images
const clientPublicPath = path.resolve(__dirname, '../../client/public')
app.use('/images', express.static(path.join(clientPublicPath, 'images')))
app.use(express.static(clientPublicPath))

// Serve favicon.ico
app.get('/favicon.ico', (req, res) => {
  res.status(204).end()
})

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Midget Micro Drive & Rides API Server - small rides, big excitement',
    version: '1.0.0',
    headOffice: 'Austin, Texas, United States',
    currency: 'USD',
    endpoints: {
      health: '/health',
      api: '/api',
      products: '/api/products',
      auth: '/api/auth',
      cart: '/api/cart',
      orders: '/api/orders'
    },
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Midget Micro Drive & Rides API is running',
    currency: 'USD',
    headOffice: 'Texas, USA',
    timestamp: new Date().toISOString()
  })
})

// API routes
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/events', eventsRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/cart', cartRoutes)

// Error handling middleware
app.use(notFound)
app.use(errorHandler)

// Database connection check
async function connectDatabase() {
  try {
    const { error: supabaseError } = await supabase.from('products').select('id').limit(1)
    if (supabaseError) {
      console.warn('⚠️  Supabase JS client notice:', supabaseError.message)
    } else {
      console.log('✅ Supabase JavaScript Client connected successfully')
    }
  } catch (error) {
    console.error('⚠️  Database connection warning:', error instanceof Error ? error.message : error)
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down server...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down server...')
  process.exit(0)
})

// Start server
async function startServer() {
  await connectDatabase()

  app.listen(PORT, () => {
    console.log(`🚀 Midget Micro Drive & Rides server is running on port ${PORT}`)
    console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`)
    console.log(`🗄️  Database: Connected to Supabase PostgreSQL (USD Store Catalog)`)
  })
}

startServer()

export default app