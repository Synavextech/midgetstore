import { Link, useLocation } from 'react-router-dom'
import { CheckCircle, Package, Home } from 'lucide-react'

interface LocationState {
  orderNumber?: string
  total?: number
  paymentMethod?: string
}

const OrderSuccessPage = () => {
  const location = useLocation()
  const state = (location.state as LocationState) || {}
  const orderNumber = state.orderNumber || `ORD-${Math.floor(100000 + Math.random() * 900000)}`
  const paymentMethod = state.paymentMethod || 'STRIPE'
  const total = state.total ? `$${state.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : null

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
            <span className="text-sm font-bold text-gray-900 font-mono">{orderNumber}</span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-gray-500 font-medium">Payment Method:</span>
            <span className="text-sm font-semibold text-gray-800">{paymentMethod}</span>
          </div>
          {total && (
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500 font-medium">Total Amount:</span>
              <span className="text-sm font-bold text-primary-600">{total}</span>
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
