import { Request, Response } from 'express'
import { databaseService } from '../services/databaseService.js'

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const {
      shippingAddressId,
      billingAddressId,
      shippingAddress: shippingAddressInput,
      paymentMethod = 'STRIPE',
      notes,
      items: bodyItems
    } = req.body

    // Determine order items (either from request body or user's database cart)
    let candidateItems: Array<{ productId: string; quantity: number }> = []

    if (Array.isArray(bodyItems) && bodyItems.length > 0) {
      candidateItems = bodyItems.map((item: any) => ({
        productId: item.productId || item.product?.id || item.id,
        quantity: Number(item.quantity) || 1
      }))
    } else {
      const cart = await databaseService.findOrCreateCart(userId)
      if (cart.items && cart.items.length > 0) {
        candidateItems = cart.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        }))
      }
    }

    if (!candidateItems.length) {
      return res.status(400).json({
        success: false,
        error: 'Order items are required'
      })
    }

    // Process shipping address if passed as object
    let finalShippingAddressId = shippingAddressId
    if (!finalShippingAddressId && shippingAddressInput) {
      try {
        const createdAddr = await databaseService.createAddress({
          userId,
          type: 'SHIPPING',
          firstName: shippingAddressInput.firstName,
          lastName: shippingAddressInput.lastName,
          company: shippingAddressInput.company,
          address1: shippingAddressInput.address1,
          address2: shippingAddressInput.address2,
          city: shippingAddressInput.city,
          state: shippingAddressInput.state,
          postalCode: shippingAddressInput.postalCode,
          country: shippingAddressInput.country || 'United States',
          phone: shippingAddressInput.phone,
          isDefault: true
        })
        finalShippingAddressId = createdAddr.id
      } catch (addrErr) {
        console.warn('Could not auto-create address:', addrErr)
      }
    }

    // Calculate totals and validate products
    let subtotal = 0
    const orderItems: Array<{ productId: string; quantity: number; price: number }> = []

    for (const item of candidateItems) {
      const product = await databaseService.findProductById(item.productId)

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          error: `Product ${item.productId} is no longer available`
        })
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for ${product.name}`
        })
      }

      const itemTotal = Number(product.price) * item.quantity
      subtotal += itemTotal
      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: Number(product.price)
      })
    }

    // USD Calculations: Free shipping over $500, else $25 flat rate, 5% sales tax
    const shipping = subtotal >= 500 ? 0 : 25
    const tax = Math.round(subtotal * 0.05 * 100) / 100
    const total = Math.round((subtotal + tax + shipping) * 100) / 100

    // Create order in Supabase
    const order = await databaseService.createOrder({
      userId,
      total,
      subtotal,
      tax,
      shipping,
      paymentMethod,
      shippingAddressId: finalShippingAddressId,
      billingAddressId,
      notes,
      items: orderItems
    })

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    })
  } catch (error) {
    console.error('Error creating order:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Get user's orders
// @route   GET /api/orders
// @access  Private
export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { status, limit = '10', page = '1' } = req.query

    const limitNum = parseInt(limit as string) || 10
    const offset = (parseInt(page as string) - 1) * limitNum

    const [orders, totalOrders] = await Promise.all([
      databaseService.findOrders({
        userId,
        status: status as string,
        limit: limitNum,
        offset
      }),
      databaseService.getOrderCount({
        userId,
        status: status as string
      })
    ])

    res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        currentPage: parseInt(page as string) || 1,
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders
      }
    })
  } catch (error) {
    console.error('Error fetching orders:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
export const getOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    const order = await databaseService.findOrderById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }

    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this order'
      })
    }

    res.status(200).json({
      success: true,
      data: order
    })
  } catch (error) {
    console.error('Error fetching order:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Update order status (Admin only)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body
    const orderId = req.params.id

    // Check if user is admin
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    const updatedOrder = await databaseService.updateOrderStatus(orderId, status)

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    })
  } catch (error) {
    console.error('Error updating order status:', error)
    if (error instanceof Error && 'code' in error && error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private
export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const orderId = req.params.id

    const order = await databaseService.findOrderById(orderId)

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      })
    }

    if (order.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this order'
      })
    }

    // Check if order can be cancelled
    if (!['PENDING', 'PROCESSING'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        error: 'Order cannot be cancelled at this stage'
      })
    }

    const updatedOrder = await databaseService.updateOrderStatus(orderId, 'CANCELLED')

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: updatedOrder
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}

// @desc    Get order statistics (Admin only)
// @route   GET /api/orders/stats
// @access  Private/Admin
export const getOrderStats = async (req: Request, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      recentOrders
    ] = await Promise.all([
      databaseService.getOrderCount(),
      databaseService.getOrderCount({ status: 'PENDING' }),
      databaseService.getOrderCount({ status: 'DELIVERED' }),
      databaseService.getTotalRevenue(),
      databaseService.findOrders({ limit: 5 })
    ])

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalRevenue,
        recentOrders
      }
    })
  } catch (error) {
    console.error('Error fetching order statistics:', error)
    res.status(500).json({
      success: false,
      error: 'Server Error'
    })
  }
}