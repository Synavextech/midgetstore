import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { CheckCircle, Package, Home, Loader2, AlertCircle } from 'lucide-react'
import { paymentApi, orderApi } from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'

interface LocationState {
  orderNumber?: string
  total?: number
  paymentMethod?: string
}

const OrderSuccessPage = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { setAuthenticatedUser } = useAuth()
  const { clearCart } = useCart()

  const state = (location.state as LocationState) || {}
  const [orderNumber, setOrderNumber] = useState<string>(state.orderNumber || '')
  const [paymentMethod, setPaymentMethod] = useState<string>(state.paymentMethod || 'STRIPE')
  const [total, setTotal] = useState<number | null>(state.total || null)

  const [loadingPayPal, setLoadingPayPal] = useState(false)
  const [payPalError, setPayPalError] = useState<string | null>(null)

  useEffect(() => {
    const payPalToken = searchParams.get('token')
    const pendingData = localStorage.getItem('pending_paypal_order')

    if (payPalToken && pendingData && !orderNumber) {
      const processPayPalReturn = async () => {
        setLoadingPayPal(true)
        setPayPalError(null)

        try {
          const parsed = JSON.parse(pendingData)
          // 1. Capture the PayPal payment
          const captureRes = await paymentApi.capturePayPalPayment(payPalToken)
          if (!captureRes.data || !captureRes.data.paymentId) {
            throw new Error(captureRes.error || 'Failed to capture PayPal payment')
          }

          // 2. Finalize and settle order in database
          const createRes = await orderApi.createOrder({
            ...parsed.orderData,
            paymentId: captureRes.data.paymentId,
            paymentStatus: 'COMPLETED'
          })

          if (createRes.data) {
            setOrderNumber(createRes.data.orderNumber)
            setPaymentMethod('PAYPAL')
            setTotal(parsed.total)

            // Auto-login if guest account was registered
            if ((createRes as any).token && (createRes as any).user) {
              setAuthenticatedUser((createRes as any).user, (createRes as any).token)
            }

            // Clear cart & cleanup pending state
            clearCart()
            localStorage.removeItem('pending_paypal_order')
          } else {
            throw new Error(createRes.error || 'Failed to record settled order')
          }
        } catch (err: any) {
          console.error('PayPal return error:', err)
          setPayPalError(err.message || 'Payment capture failed. Please contact support.')
        } finally {
          setLoadingPayPal(false)
        }
      }

      processPayPalReturn()
    }
  }, [searchParams, orderNumber, setAuthenticatedUser])

  if (loadingPayPal) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Finalizing PayPal Payment...</h2>
          <p className="text-gray-600 text-sm">Please do not refresh or close this window while we secure your order.</p>
        </div>
      </div>
    )
  }

  if (payPalError) {
    return (
      <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Error</h2>
          <p className="text-red-600 text-sm mb-6">{payPalError}</p>
          <div className="space-y-3">
            <Link
              to="/checkout"
              className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-md transition duration-200"
            >
              Return to Checkout
            </Link>
            <Link
              to="/"
              className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition duration-200"
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const displayOrderNumber = orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`
  const formattedTotal = total ? `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null

  return (
    <div className="pt-20 min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-gray-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-inner">
          <CheckCircle className="w-12 h-12" />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-6">
          Thank you for shopping with Midget Micro Drive & Rides! Your order has been placed and is being prepared for express dispatch from our Texas Headquarters.
        </p>

        <div className="bg-gray-50 rounded-xl p-5 mb-8 text-left border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-500 font-medium">Order Reference:</span>
            <span className="text-sm font-bold text-gray-900 font-mono">{displayOrderNumber}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-500 font-medium">Payment Method:</span>
            <span className="text-sm font-semibold text-gray-800">
              {paymentMethod === 'STRIPE' ? 'Credit / Debit Card' : paymentMethod === 'PAYPAL' ? 'PayPal' : paymentMethod}
            </span>
          </div>
          {formattedTotal && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Amount:</span>
              <span className="text-sm font-bold text-primary-600">{formattedTotal}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 font-medium">Estimated Delivery:</span>
            <span className="text-sm font-medium text-gray-700">2 - 4 Business Days</span>
          </div>
        </div>

        <div className="space-y-3">
          <Link
            to="/"
            className="w-full flex items-center justify-center px-6 py-3.5 border border-transparent text-base font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-md transition duration-200"
          >
            <Home className="w-5 h-5 mr-2" />
            Continue Shopping
          </Link>
          <Link
            to="/cart"
            className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition duration-200"
          >
            <Package className="w-4 h-4 mr-2 text-gray-500" />
            View Cart
          </Link>
        </div>
      </div>
    </div>
  )
}

export default OrderSuccessPage
