import { Request, Response, NextFunction } from 'express'
import { databaseService } from '../services/databaseService.js'
import { emailService } from '../utils/emailService.js'

// @desc    Get all products
// @route   GET /api/products
// @access  Public
export const getProducts = async (req: Request, res: Response) => {
  try {
    const { category, search, limit = '20', page = '1' } = req.query

    // Parse pagination parameters
    const limitNum = parseInt(limit as string)
    const pageNum = parseInt(page as string)
    const offset = (pageNum - 1) * limitNum

    // Get products from database
    const products = await databaseService.findProducts({
      category: category as string,
      search: search as string,
      limit: limitNum,
      offset
    })

    // Get total count for pagination
    const totalProducts = await databaseService.getProductCount({
      category: category as string,
      search: search as string
    })

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalProducts / limitNum),
        totalProducts
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Get single product (and logs view event)
// @route   GET /api/products/:id
// @access  Public
export const getProduct = async (req: Request, res: Response) => {
  try {
    const product = await databaseService.findProductById(req.params.id)

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      })
    }

    // Record product view and emit real-time activity stream
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress
    const userAgent = req.headers['user-agent'] as string
    const referrer = (req.headers['referer'] || req.headers['referrer']) as string
    const user = req.user

    databaseService.recordProductView({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productPrice: product.price,
      userId: user?.id || null,
      userEmail: user?.email || null,
      userName: user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email) : null,
      ipAddress: ip,
      userAgent,
      referrer,
      storeLocation: product.storeLocation || 'Shenzhen Technology & Electric Mobility Hub, China'
    }).catch(err => console.warn('Product view log notice:', err))

    emailService.sendItemViewedNotification({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productPrice: product.price,
      userEmail: user?.email,
      userName: user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email) : undefined,
      ipAddress: ip,
      userAgent,
      referrer,
      storeLocation: product.storeLocation || 'Shenzhen Technology & Electric Mobility Hub, China'
    }).catch(err => console.warn('Product view activity notice:', err))

    res.status(200).json({
      success: true,
      data: product
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Explicitly track client product view beacon (Public)
// @route   POST /api/products/:id/view
// @access  Public
export const trackProductView = async (req: Request, res: Response) => {
  try {
    const product = await databaseService.findProductById(req.params.id)
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' })
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress
    const userAgent = req.headers['user-agent'] as string
    const referrer = (req.body?.referrer || req.headers['referer'] || req.headers['referrer']) as string
    const user = req.user

    const visit = await databaseService.recordProductView({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productPrice: product.price,
      userId: user?.id || req.body?.userId || null,
      userEmail: user?.email || req.body?.userEmail || null,
      userName: user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email) : req.body?.userName || null,
      ipAddress: ip,
      userAgent,
      referrer,
      storeLocation: product.storeLocation || 'Shenzhen Technology & Electric Mobility Hub, China'
    })

    emailService.sendItemViewedNotification({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productPrice: product.price,
      userEmail: user?.email || req.body?.userEmail,
      userName: user ? (`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email) : req.body?.userName,
      ipAddress: ip,
      userAgent,
      referrer,
      storeLocation: product.storeLocation || 'Shenzhen Technology & Electric Mobility Hub, China'
    }).catch(err => console.warn('Product view activity notice:', err))

    res.status(200).json({ success: true, data: visit })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to record visit' })
  }
}

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req: Request, res: Response) => {
  try {
    const productData = req.body

    const newProduct = await databaseService.createProduct(productData)

    res.status(201).json({
      success: true,
      data: newProduct
    })
  } catch (error) {
    console.error('Error creating product:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id
    const updateData = req.body

    const updatedProduct = await databaseService.updateProduct(productId, updateData)

    res.status(200).json({
      success: true,
      data: updatedProduct
    })
  } catch (error) {
    console.error('Error updating product:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      })
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id

    await databaseService.deleteProduct(productId)

    res.status(200).json({
      success: true,
      data: {}
    })
  } catch (error) {
    console.error('Error deleting product:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      })
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}