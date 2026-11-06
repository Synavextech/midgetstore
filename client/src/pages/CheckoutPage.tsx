import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import { CreditCard, Truck, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { orderApi, paymentApi } from '../services/api'
import { ALL_COUNTRIES, POPULAR_COUNTRIES, getCountryCode } from '../utils/countries'

// Initialize Stripe with Live Publishable Key
const stripePublishableKey =
  (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY ||
  'pk_live_51TmGHyBwxUQmXC9Magb4FXJbEPQ2EvNKaxNIzg2KlGeMliHNmNLx0hv0ACB6anDy2gFkU8tkZfRnatOJCdTzCwh500CV1Xf3BK'

const stripePromise = loadStripe(stripePublishableKey)

// Initialize PayPal with Live / Configured Client ID from .env
const defaultPayPalClientId =
  (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID ||
  'AeZPJVk6Zp1zLPnNtCcOdXvQFQi-iLkWnSdbB7c0vYwyOpQMG845TpUz6MZSJd-TXLfHgFfiBrLEWxpt'

// Helper to dynamically load PayPal JavaScript SDK with debit/credit card button enabled
const loadPayPalSdkScript = (clientId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).paypal?.Buttons) {
      return resolve((window as any).paypal)
    }

    const scriptId = 'paypal-sdk-script'
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existingScript) {
      if ((window as any).paypal?.Buttons) {
        return resolve((window as any).paypal)
      }
      existingScript.addEventListener('load', () => resolve((window as any).paypal))
      existingScript.addEventListener('error', (e) => reject(e))
      return
    }

    const script = document.createElement('script')
    script.id = scriptId
    // enable-funding=card forces the Debit/Credit Card button to render alongside PayPal button
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&enable-funding=card&components=buttons`
    script.async = true
    script.onload = () => {
      if ((window as any).paypal) {
        resolve((window as any).paypal)
      } else {
        reject(new Error('PayPal SDK failed to initialize window.paypal'))
      }
    }
    script.onerror = (err) => reject(err)
    document.head.appendChild(script)
  })
}

const ArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className || 'w-4 h-4'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7" />
    <path d="M19 12H5" />
  </svg>
)

interface ShippingFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address1: string
  address2: string
  city: string
  state: string
  zipCode: string
  country: string
}

const CheckoutForm: React.FC = () => {
  const navigate = useNavigate()
  const stripe = useStripe()
  const elements = useElements()

  const { items, totalPrice, clearCart } = useCart()
  const { user, isAuthenticated, setAuthenticatedUser } = useAuth()

  // Account creation for guest shoppers
  const [createAccount, setCreateAccount] = useState(false)
  const [accountPassword, setAccountPassword] = useState('')

  // Supported payment methods: Stripe and PayPal
  const [paymentMethod, setPaymentMethod] = useState<'STRIPE' | 'PAYPAL'>('STRIPE')
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  // PayPal JavaScript SDK State and Refs
  const [isSdkLoading, setIsSdkLoading] = useState(false)
  const [paypalClientId, setPaypalClientId] = useState<string>(defaultPayPalClientId)
  const paypalContainerRef = useRef<HTMLDivElement>(null)
  const paypalButtonsInstanceRef = useRef<any>(null)

  const [shippingData, setShippingData] = useState<ShippingFormData>({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address1: '',
    address2: '',
    city: '',
    state: 'TX',
    zipCode: '',
    country: 'United States'
  })

  // Format price in USD
  const formatPrice = (price: number) => {
    return `$${(price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // 100% Free Express Shipping on all store orders
  const shippingCost = 0
  const estimatedTax = totalPrice * 0.05
  const grandTotal = totalPrice + shippingCost + estimatedTax

  // Keep fresh references for asynchronous PayPal SDK callbacks
  const shippingDataRef = useRef(shippingData)
  shippingDataRef.current = shippingData

  const grandTotalRef = useRef(grandTotal)
  grandTotalRef.current = grandTotal

  const totalPriceRef = useRef(totalPrice)
  totalPriceRef.current = totalPrice

  const estimatedTaxRef = useRef(estimatedTax)
  estimatedTaxRef.current = estimatedTax

  const itemsRef = useRef(items)
  itemsRef.current = items

  const createAccountRef = useRef(createAccount)
  createAccountRef.current = createAccount

  const accountPasswordRef = useRef(accountPassword)
  accountPasswordRef.current = accountPassword

  const isAuthenticatedRef = useRef(isAuthenticated)
  isAuthenticatedRef.current = isAuthenticated

  // Auto-fetch PayPal public configuration from backend
  useEffect(() => {
    paymentApi.getPayPalConfig().then(res => {
      if (res.success && res.data?.clientId) {
        setPaypalClientId(res.data.clientId)
      }
    }).catch(err => {
      console.warn('Could not fetch PayPal config from backend, using default/env:', err)
    })
  }, [])

  // Render PayPal SDK Buttons (supporting both PayPal Balance and Direct Card Payment)
  useEffect(() => {
    if (paymentMethod !== 'PAYPAL') {
      if (paypalButtonsInstanceRef.current) {
        try {
          paypalButtonsInstanceRef.current.close?.()
        } catch (e) {
          // ignore
        }
        paypalButtonsInstanceRef.current = null
      }
      return
    }

    let isMounted = true
    setIsSdkLoading(true)

    loadPayPalSdkScript(paypalClientId)
      .then((paypal) => {
        if (!isMounted) return
        setIsSdkLoading(false)

        if (!paypalContainerRef.current) return
        paypalContainerRef.current.innerHTML = ''

        if (paypal && paypal.Buttons) {
          try {
            const buttons = paypal.Buttons({
              style: {
                layout: 'vertical',
                color: 'gold',
                shape: 'rect',
                label: 'paypal',
                height: 48,
                tagline: false
              },
              createOrder: async () => {
                const currentShipping = shippingDataRef.current
                if (
                  !currentShipping.firstName ||
                  !currentShipping.lastName ||
                  !currentShipping.email ||
                  !currentShipping.address1 ||
                  !currentShipping.city ||
                  !currentShipping.zipCode
                ) {
                  const errorMsg = 'Please fill in all required shipping address fields (First Name, Last Name, Email, Address, City, ZIP Code) before completing payment.'
                  setErrorMessage(errorMsg)
                  setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
                  throw new Error(errorMsg)
                }

                if (!isAuthenticatedRef.current && createAccountRef.current && (!accountPasswordRef.current || accountPasswordRef.current.length < 6)) {
                  const errorMsg = 'Please provide an account password with at least 6 characters.'
                  setErrorMessage(errorMsg)
                  setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
                  throw new Error(errorMsg)
                }

                setErrorMessage(null)
                const currentTotal = grandTotalRef.current

                const res = await paymentApi.createPayPalOrder(currentTotal, {
                  email: currentShipping.email,
                  firstName: currentShipping.firstName,
                  lastName: currentShipping.lastName,
                  phone: currentShipping.phone,
                  address: currentShipping
                })

                if (!res.success || !res.data?.orderId) {
                  const msg = res.error || 'Failed to initialize PayPal order'
                  setErrorMessage(msg)
                  throw new Error(msg)
                }

                return res.data.orderId
              },
              onApprove: async (data: any) => {
                setIsProcessing(true)
                setProcessingStep('Authorizing and capturing PayPal payment in USD...')

                try {
                  const orderId = data.orderId
                  const captureRes = await paymentApi.capturePayPalPayment(orderId)

                  if (!captureRes.success || !captureRes.data) {
                    throw new Error(captureRes.error || 'Failed to capture PayPal payment')
                  }

                  const paymentRecordId = captureRes.data.paymentId || orderId
                  setProcessingStep('Securing your order in our database...')

                  const currentShipping = shippingDataRef.current
                  const currentItems = itemsRef.current
                  const currentTotal = grandTotalRef.current
                  const currentSubtotal = totalPriceRef.current
                  const currentEstimatedTax = estimatedTaxRef.current
                  const willCreateAccount = createAccountRef.current
                  const pwd = accountPasswordRef.current

                  const orderPayload = {
                    items: currentItems.map(i => ({ productId: i.productId, quantity: i.quantity })),
                    paymentMethod: 'PAYPAL' as const,
                    paymentId: paymentRecordId,
                    paymentStatus: 'COMPLETED' as const,
                    shippingAddress: {
                      firstName: currentShipping.firstName,
                      lastName: currentShipping.lastName,
                      email: currentShipping.email,
                      phone: currentShipping.phone,
                      address1: currentShipping.address1,
                      address2: currentShipping.address2,
                      city: currentShipping.city,
                      state: currentShipping.state,
                      postalCode: currentShipping.zipCode,
                      country: currentShipping.country
                    },
                    createAccount: willCreateAccount,
                    password: willCreateAccount ? pwd : undefined,
                    notes: `Nanshan, Shenzhen, Guangdong Province, China Warehouse Express Delivery to ${currentShipping.city}, ${currentShipping.state} (${currentShipping.zipCode}). Paid & Settled via PAYPAL SDK (${orderId})`
                  }

                  const orderRes = await orderApi.createOrder(orderPayload)
                  if (!orderRes.success || !orderRes.data) {
                    throw new Error(orderRes.error || 'Payment was captured, but failed to log order in database. Please contact support.')
                  }

                  if (willCreateAccount && (orderRes as any).token && (orderRes as any).user) {
                    setAuthenticatedUser((orderRes as any).user, (orderRes as any).token)
                  }

                  const confirmedOrderNumber = orderRes.data.orderNumber || `MMR-${Math.floor(100000 + Math.random() * 900000)}`
                  const formattedOrderDate = new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                  const fullAddressString = `${currentShipping.address1}${currentShipping.address2 ? `, ${currentShipping.address2}` : ''}, ${currentShipping.city}, ${currentShipping.state} ${currentShipping.zipCode}, ${currentShipping.country}`

                  const receiptData = {
                    date: formattedOrderDate,
                    orderDate: formattedOrderDate,
                    orderNumber: confirmedOrderNumber,
                    transactionId: paymentRecordId || `TXN-${Date.now()}`,
                    userName: `${currentShipping.firstName} ${currentShipping.lastName}`.trim() || 'Valued Customer',
                    address: fullAddressString,
                    paymentSource: 'PayPal (Balance / Cards)',
                    initialCharge: formatPrice(currentSubtotal),
                    finalCost: formatPrice(currentTotal),
                    totalRefund: '$0.00',
                    refundTrans: 'N/A',
                    shippingCost: '$0.00 (Free Express Shipping)',
                    tax: `$${currentEstimatedTax.toFixed(2)}`,
                    items: currentItems.map(i => ({
                      name: i.product.name,
                      quantity: i.quantity,
                      price: formatPrice(i.product.price),
                      total: formatPrice(i.quantity * i.product.price)
                    }))
                  }

                  localStorage.setItem('latest_order_receipt', JSON.stringify(receiptData))
                  localStorage.setItem(`receipt_${confirmedOrderNumber}`, JSON.stringify(receiptData))

                  clearCart()

                  navigate('/order-success', {
                    state: {
                      orderNumber: confirmedOrderNumber,
                      paymentMethod: 'PAYPAL',
                      total: currentTotal,
                      receipt: receiptData
                    }
                  })
                } catch (err: any) {
                  console.error('PayPal onApprove capture error:', err)
                  setErrorMessage(err.message || 'Payment approval failed. Please try again.')
                  setIsProcessing(false)
                }
              },
              onError: (err: any) => {
                console.error('PayPal Buttons error:', err)
                setErrorMessage('PayPal transaction could not be processed. Please try again.')
                setIsProcessing(false)
              },
              onCancel: () => {
                setIsProcessing(false)
              }
            })

            paypalButtonsInstanceRef.current = buttons
            buttons.render(paypalContainerRef.current)
          } catch (renderErr) {
            console.error('Error rendering PayPal Buttons:', renderErr)
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return
        console.error('Failed to load PayPal JS SDK:', err)
        setIsSdkLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [paymentMethod, paypalClientId])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (errorMessage) setErrorMessage(null)
    setShippingData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handlePayment = async () => {
    if (!shippingData.firstName || !shippingData.lastName || !shippingData.email || !shippingData.address1 || !shippingData.city || !shippingData.zipCode) {
      setErrorMessage('Please fill in all required shipping address fields (First Name, Last Name, Email, Address, City, ZIP Code).')
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }

    if (!isAuthenticated && createAccount && (!accountPassword || accountPassword.length < 6)) {
      setErrorMessage('Please provide an account password with at least 6 characters.')
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
      return
    }

    setErrorMessage(null)
    setIsProcessing(true)

    try {
      let paymentRecordId = ''

      if (paymentMethod === 'STRIPE') {
        if (!stripe || !elements) {
          throw new Error('Payment gateway is still initializing. Please wait a few seconds and try again.')
        }

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          throw new Error('Card payment form is not ready. Please refresh the page.')
        }

        setProcessingStep('Initializing secure transaction with Stripe...')
        const intentRes = await paymentApi.createStripePaymentIntent(grandTotal)
        if (!intentRes.success || !intentRes.data?.clientSecret) {
          throw new Error(intentRes.error || 'Failed to create payment intent with Stripe.')
        }

        const clientSecret = intentRes.data.clientSecret

        setProcessingStep('Authorizing payment with your financial institution...')
        const confirmResult = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: `${shippingData.firstName} ${shippingData.lastName}`.trim(),
              email: shippingData.email,
              phone: shippingData.phone || undefined,
              address: {
                line1: shippingData.address1,
                line2: shippingData.address2 || undefined,
                city: shippingData.city,
                state: shippingData.state,
                postal_code: shippingData.zipCode,
                country: getCountryCode(shippingData.country)
              }
            }
          }
        })

        if (confirmResult.error) {
          throw new Error(confirmResult.error.message || 'Payment authorization was declined. Please verify card details.')
        }

        if (!confirmResult.paymentIntent || confirmResult.paymentIntent.status !== 'succeeded') {
          throw new Error(`Payment could not be completed. Status: ${confirmResult.paymentIntent?.status || 'unconfirmed'}`)
        }

        paymentRecordId = confirmResult.paymentIntent.id
      } else if (paymentMethod === 'PAYPAL') {
        setProcessingStep('Connecting to PayPal secure portal...')
        const ppRes = await paymentApi.createPayPalOrder(grandTotal, {
          email: shippingData.email,
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          phone: shippingData.phone,
          address: shippingData
        })
        if (!ppRes.success || !ppRes.data?.orderId) {
          throw new Error(ppRes.error || 'Failed to connect to PayPal.')
        }

        const ppOrderId = ppRes.data.orderId
        const approveUrl = ppRes.data.approveUrl

        if (approveUrl) {
          // Prepare complete order payload for database persistence upon capture
          const orderPayload = {
            items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
            paymentMethod: 'PAYPAL',
            shippingAddress: {
              firstName: shippingData.firstName,
              lastName: shippingData.lastName,
              email: shippingData.email,
              phone: shippingData.phone,
              address1: shippingData.address1,
              address2: shippingData.address2,
              city: shippingData.city,
              state: shippingData.state,
              postalCode: shippingData.zipCode,
              country: shippingData.country
            },
            createAccount,
            password: createAccount ? accountPassword : undefined,
            notes: `Nanshan, Shenzhen, Guangdong Province, China Warehouse Express Delivery to ${shippingData.city}, ${shippingData.state} (${shippingData.zipCode}). Paid & Settled via PAYPAL (${ppOrderId})`
          }

          // Store pending order details so it can be completed after returning from PayPal
          localStorage.setItem('pending_paypal_order', JSON.stringify({
            ppOrderId,
            grandTotal,
            subtotal: totalPrice,
            shippingCost,
            tax: estimatedTax,
            shippingData,
            createAccount,
            accountPassword,
            items: items.map(i => ({
              productId: i.productId,
              name: i.product.name,
              quantity: i.quantity,
              price: i.product.price
            })),
            orderData: orderPayload
          }))
          // Redirect to PayPal's secure approval page
          window.location.href = approveUrl
          return
        }

        // If direct capture available without approval redirect
        const captureRes = await paymentApi.capturePayPalPayment(ppOrderId)
        if (!captureRes.success) {
          throw new Error(captureRes.error || 'PayPal capture failed.')
        }
        paymentRecordId = captureRes.data?.paymentId || ppOrderId
      }

      setProcessingStep('Securing your order in our database...')
      // Persist settled order in Supabase via backend API
      const orderRes = await orderApi.createOrder({
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
        paymentMethod,
        paymentId: paymentRecordId,
        paymentStatus: 'COMPLETED',
        shippingAddress: {
          firstName: shippingData.firstName,
          lastName: shippingData.lastName,
          email: shippingData.email,
          phone: shippingData.phone,
          address1: shippingData.address1,
          address2: shippingData.address2,
          city: shippingData.city,
          state: shippingData.state,
          postalCode: shippingData.zipCode,
          country: shippingData.country
        },
        createAccount,
        password: createAccount ? accountPassword : undefined,
        notes: `Nanshan, Shenzhen, Guangdong Province, China Warehouse Express Delivery to ${shippingData.city}, ${shippingData.state} (${shippingData.zipCode}). Paid & Settled via ${paymentMethod} (${paymentRecordId})`
      } as any)

      // Auto-authenticate customer if account was established
      if ((orderRes as any).token && (orderRes as any).user) {
        setAuthenticatedUser((orderRes as any).user, (orderRes as any).token)
      }

      const orderNumber = orderRes.data?.orderNumber || `MMR-${Math.floor(100000 + Math.random() * 900000)}`

      const formattedOrderDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })

      const fullAddressString = `${shippingData.address1}${shippingData.address2 ? `, ${shippingData.address2}` : ''}, ${shippingData.city}, ${shippingData.state} ${shippingData.zipCode}, ${shippingData.country}`

      const receiptData = {
        date: formattedOrderDate,
        orderDate: formattedOrderDate,
        orderNumber,
        transactionId: paymentRecordId || `TXN-${Date.now()}`,
        userName: `${shippingData.firstName} ${shippingData.lastName}`.trim() || 'Valued Customer',
        address: fullAddressString,
        paymentSource: paymentMethod === 'STRIPE' ? 'Credit / Debit Card (Stripe)' : 'PayPal Express',
        initialCharge: `$${totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        finalCost: `$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        totalRefund: '$0.00',
        refundTrans: 'N/A',
        shippingCost: '$0.00 (Free Express Shipping)',
        tax: `$${estimatedTax.toFixed(2)}`,
        items: items.map(i => ({
          name: i.product.name,
          quantity: i.quantity,
          price: `$${i.product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          total: `$${(i.quantity * i.product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        }))
      }

      // Persist latest order receipt in localStorage so customer refresh preserves full details
      localStorage.setItem('latest_order_receipt', JSON.stringify(receiptData))

      // Clear cart
      clearCart()

      // Redirect to success screen
      navigate('/order-success', {
        state: {
          orderNumber,
          total: grandTotal,
          paymentMethod,
          shippingAddress: fullAddressString,
          receiptData
        }
      })
    } catch (error: any) {
      console.error('Payment checkout error:', error)
      setErrorMessage(error.message || 'Payment processing was unsuccessful. Please verify your details and try again.')
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
    } finally {
      setIsProcessing(false)
    }
  }

  const inputClasses =
    'w-full px-4 py-2.5 bg-gray-50 dark:bg-[#1a1d24] border border-gray-300 dark:border-neutral-700 rounded-xl text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors text-xs font-medium'

  if (items.length === 0) {
    return (
      <div className="pt-28 pb-16 min-h-screen bg-gray-50 dark:bg-[#0e1014] text-gray-900 dark:text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black uppercase text-gray-900 dark:text-white mb-2 font-anton">
            Your Cart is Empty
          </h2>
          <p className="text-xs text-gray-500 dark:text-neutral-400 mb-6 font-medium">
            Select a high-speed drift rig, go kart, or dirt bike from our fleet to proceed to checkout.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider py-3.5 px-6 rounded-xl transition-all text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Browse Fleet Catalog
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-24 pb-16 min-h-screen bg-gray-50 dark:bg-[#0e1014] text-gray-900 dark:text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/cart')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Cart
        </button>

        <div className="mb-8">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            Official Checkout
          </span>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white mt-2 font-anton">
            Express Order Finalization
          </h1>
        </div>

        {errorMessage && (
          <div
            ref={errorRef}
            className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-semibold text-xs">{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Shipping & Payment Method */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Shipping Address */}
            <div className="bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-neutral-800 pb-3">
                <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-500" />
                  1. Delivery Destination (USA & Global)
                </h2>
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">* Required</span>
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      placeholder="John"
                      value={shippingData.firstName}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      placeholder="Doe"
                      value={shippingData.lastName}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      placeholder="john@example.com"
                      value={shippingData.email}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Contact Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+1 (512) 000-0000"
                      value={shippingData.phone}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Street Address *</label>
                  <input
                    type="text"
                    name="address1"
                    placeholder="1000 Micro Drive Way, Suite 400"
                    value={shippingData.address1}
                    onChange={handleInputChange}
                    className={inputClasses}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Apartment, Suite, Unit (Optional)</label>
                  <input
                    type="text"
                    name="address2"
                    placeholder="Apt 4B"
                    value={shippingData.address2}
                    onChange={handleInputChange}
                    className={inputClasses}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">City *</label>
                    <input
                      type="text"
                      name="city"
                      placeholder="Austin"
                      value={shippingData.city}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">State / Region *</label>
                    <input
                      type="text"
                      name="state"
                      placeholder="TX"
                      value={shippingData.state}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Postal / ZIP Code *</label>
                    <input
                      type="text"
                      name="zipCode"
                      placeholder="78701"
                      value={shippingData.zipCode}
                      onChange={handleInputChange}
                      className={inputClasses}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Country *</label>
                  <select
                    name="country"
                    value={shippingData.country}
                    onChange={handleInputChange}
                    className={inputClasses}
                    required
                  >
                    <optgroup label="Popular Countries">
                      {POPULAR_COUNTRIES.map((c) => (
                        <option key={`popular-${c.code}`} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="All Countries & Territories">
                      {ALL_COUNTRIES.map((c) => (
                        <option key={`all-${c.code}`} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* Inline Account Creation for Guest / New Shoppers */}
                {!isAuthenticated && (
                  <div className="pt-3 border-t border-gray-100 dark:border-neutral-800">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={createAccount}
                        onChange={(e) => setCreateAccount(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-gray-100 dark:bg-neutral-800 border-gray-300 dark:border-neutral-700"
                      />
                      <span className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Create an account with this order <span className="text-amber-500 font-semibold">(save address & track deliveries)</span>
                      </span>
                    </label>

                    {createAccount && (
                      <div className="mt-3 p-3.5 bg-gray-50 dark:bg-[#1a1d24] rounded-xl border border-gray-200 dark:border-neutral-800 animate-fadeIn space-y-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                          Create Account Password *
                        </label>
                        <input
                          type="password"
                          placeholder="Choose password (at least 6 characters)"
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          className={inputClasses}
                        />
                        <p className="text-[10px] text-gray-400">
                          Account will be registered to <span className="font-mono text-amber-500">{shippingData.email || 'your email'}</span> automatically upon placing your order.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </form>
            </div>

            {/* 2. Payment Method */}
            <div className="bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl p-6 transition-colors">
              <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-neutral-800 pb-3">
                <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-amber-500" />
                  2. Payment Method
                </h2>
                <span className="text-[10px] uppercase font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded">
                  USD Currency
                </span>
              </div>

              <div className="space-y-4">
                {/* Option 1: Credit / Debit Card Checkout via Real Stripe Elements */}
                <label
                  className={`block p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'STRIPE'
                    ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-500/10 shadow-sm'
                    : 'border-gray-300 dark:border-neutral-700 bg-gray-50/50 dark:bg-[#1a1d24] hover:border-gray-400 dark:hover:border-neutral-600'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="STRIPE"
                        checked={paymentMethod === 'STRIPE'}
                        onChange={() => {
                          setPaymentMethod('STRIPE')
                          if (errorMessage) setErrorMessage(null)
                        }}
                        className="w-4 h-4 text-amber-500 focus:ring-amber-400 accent-amber-500"
                      />
                      <CreditCard className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white">Credit / Debit Card</p>
                        <p className="text-[11px] text-gray-500 dark:text-neutral-400">Direct In-Store Card Form (Visa, Mastercard, Amex, Discover)</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      In-Page Card Form
                    </span>
                  </div>

                  {paymentMethod === 'STRIPE' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800 space-y-3">
                      <div className="p-3.5 bg-white dark:bg-[#1a1d24] border border-gray-300 dark:border-neutral-700 rounded-xl focus-within:ring-2 focus-within:ring-amber-500 transition-all">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100 dark:border-neutral-800">
                          <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                            Card Information
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                            <Lock className="w-3 h-3" />
                            <span>Secure TLS 256-Bit</span>
                          </div>
                        </div>
                        <CardElement
                          options={{
                            style: {
                              base: {
                                fontSize: '13px',
                                color: '#f3f4f6',
                                '::placeholder': {
                                  color: '#9ca3af',
                                },
                                fontFamily: 'Inter, system-ui, sans-serif',
                              },
                              invalid: {
                                color: '#ef4444',
                                iconColor: '#ef4444',
                              },
                            },
                            hidePostalCode: true,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </label>

                {/* Option 2: PayPal & Debit / Credit Card */}
                <div
                  className={`p-4 border rounded-xl transition-all ${paymentMethod === 'PAYPAL'
                    ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-500/10 shadow-sm'
                    : 'border-gray-300 dark:border-neutral-700 bg-gray-50/50 dark:bg-[#1a1d24] hover:border-gray-400 dark:hover:border-neutral-600'
                    }`}
                >
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="PAYPAL"
                        checked={paymentMethod === 'PAYPAL'}
                        onChange={() => {
                          setPaymentMethod('PAYPAL')
                          if (errorMessage) setErrorMessage(null)
                        }}
                        className="w-4 h-4 text-amber-500 focus:ring-amber-400 accent-amber-500"
                      />
                      <div className="w-6 h-6 rounded bg-[#003087] flex items-center justify-center font-black text-white text-xs">
                        P
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          <span>PayPal Express</span>
                          <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            SDK Active
                          </span>
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-neutral-400">
                          PayPal Balance, Bank, or Cards via PayPal Portal
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                      1-Tap Express
                    </span>
                  </label>

                  {paymentMethod === 'PAYPAL' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-neutral-300">
                        <span className="font-semibold flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                          Select payment method below:
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-neutral-400 font-mono">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 font-bold">PayPal</span>
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 font-bold">Debit / Credit Card</span>
                        </div>
                      </div>

                      {/* PayPal JS SDK Buttons Container */}
                      <div className="relative min-h-[110px] pt-1">
                        {isSdkLoading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-[#1a1d24]/70 backdrop-blur-xs rounded-xl z-10">
                            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-2" />
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Initializing PayPal & Card Gateway...</p>
                          </div>
                        )}
                        <div ref={paypalContainerRef} id="paypal-button-container" className="z-0" />
                      </div>

                      <div className="text-[11px] text-gray-500 dark:text-neutral-400 bg-gray-50 dark:bg-[#16181e] p-2.5 rounded-lg border border-gray-200 dark:border-neutral-800 space-y-1">
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                          <span><strong>Gold Button:</strong> Pay with PayPal Balance, Bank, or PayPal Credit.</span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-neutral-800 dark:bg-neutral-200 shrink-0" />
                          <span><strong>Black Button:</strong> Direct Guest Card payment (Visa, Mastercard, Amex, Discover) — no PayPal account needed.</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl p-6 sticky top-24 transition-colors">
              <h2 className="text-base font-black uppercase tracking-wider text-gray-900 dark:text-white mb-4 pb-3 border-b border-gray-100 dark:border-neutral-800 font-anton">
                Order Review ({items.length} {items.length === 1 ? 'rig' : 'rigs'})
              </h2>

              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-[#1f222a] transition-colors">
                    <div className="w-14 h-14 bg-gray-100 dark:bg-neutral-800 rounded-xl overflow-hidden flex-shrink-0 border border-gray-200 dark:border-neutral-700">
                      {item.product.images && item.product.images.length > 0 ? (
                        <img
                          src={item.product.images[0]}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            if (!target.src.endsWith('/images/hero1.jpeg')) {
                              target.src = '/images/hero1.jpeg'
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                          Rig
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-xs text-gray-900 dark:text-white truncate">
                        {item.product.name}
                      </h3>
                      <p className="text-[11px] text-gray-500 dark:text-neutral-400 font-medium">
                        Qty: {item.quantity} × {formatPrice(item.product.price)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-xs text-gray-900 dark:text-amber-400">
                        {formatPrice(item.quantity * item.product.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 pt-4 border-t border-gray-200 dark:border-neutral-800 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600 dark:text-neutral-400 font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-neutral-400 font-medium">
                  <span>China Warehouse Express Shipping</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    FREE ($0.00)
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-neutral-400 font-medium">
                  <span>Estimated Tax (5%)</span>
                  <span className="font-bold text-gray-900 dark:text-white">{formatPrice(estimatedTax)}</span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-neutral-800 flex justify-between items-baseline">
                  <span className="text-sm font-black uppercase text-gray-900 dark:text-white">Total USD</span>
                  <span className="text-2xl font-black text-amber-500 font-anton">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="mt-4 p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="font-medium text-[11px] leading-snug">{errorMessage}</span>
                </div>
              )}

              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full mt-6 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-400 dark:disabled:bg-neutral-700 text-black font-black uppercase tracking-wider py-4 px-4 rounded-xl shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>{processingStep || 'Authorizing Checkout...'}</span>
                  </>
                ) : paymentMethod === 'STRIPE' ? (
                  <span>
                    Confirm & Pay {formatPrice(grandTotal)} with Card (Stripe)
                  </span>
                ) : (
                  <span>
                    Confirm & Pay {formatPrice(grandTotal)} with PayPal
                  </span>
                )}
              </button>

              <div className="mt-4 p-3 bg-gray-50 dark:bg-[#1a1d24] rounded-xl border border-gray-200 dark:border-neutral-800 text-[10px] text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-bold text-gray-700 dark:text-gray-300"> China Warehouse Dispatch</p>
                <p>1189 Fenghuang Road, Daliang, Shunde District, Foshan, Guangdong 528315, China</p>
                <p>Orders are backed by 30-day ride warranty & money back guarantee.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const CheckoutPage = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  )
}

export default CheckoutPage