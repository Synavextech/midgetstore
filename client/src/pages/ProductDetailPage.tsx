import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, Truck, ShoppingCart, Heart, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useProducts } from '../contexts/ProductContext'
import { useCart } from '../contexts/CartContext'

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProduct, fetchProductById, isLoading, error } = useProducts()
  const { addToCart } = useCart()

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (id) {
      fetchProductById(id)
    }
  }, [id])

  const handleAddToCart = async () => {
    if (currentProduct) {
      await addToCart(currentProduct.id, quantity)
    }
  }

  const handleBuyNow = async () => {
    if (currentProduct) {
      await addToCart(currentProduct.id, quantity)
      navigate('/checkout')
    }
  }

  // Helper function to format price in USD
  const formatPrice = (price: number) => {
    return `$${(price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Helper function to render stars
  const renderStars = (rating: number) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 !== 0

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
      )
    }

    if (hasHalfStar) {
      stars.push(
        <Star key="half" className="w-4 h-4 fill-amber-400/50 text-amber-400" />
      )
    }

    const emptyStars = 5 - Math.ceil(rating)
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-gray-300 dark:text-neutral-700" />
      )
    }

    return stars
  }

  if (isLoading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e1014] text-gray-900 dark:text-white transition-colors duration-200">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-bold text-sm">Loading product details...</p>
        </div>
      </div>
    )
  }

  if (error || !currentProduct) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0e1014] text-gray-900 dark:text-white transition-colors duration-200">
        <div className="text-center p-8 bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-xl max-w-md">
          <p className="text-red-500 font-bold mb-4">{error || 'Product not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 pb-16 min-h-screen bg-gray-50 dark:bg-[#0e1014] text-gray-900 dark:text-white transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Catalog
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-[4/3] bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
              {currentProduct.images && currentProduct.images.length > 0 ? (
                <img
                  src={currentProduct.images[selectedImageIndex] || currentProduct.images[0]}
                  alt={currentProduct.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image Available
                </div>
              )}
            </div>
            {currentProduct.images && currentProduct.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {currentProduct.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`aspect-square bg-white dark:bg-[#16181e] rounded-xl border-2 ${
                      selectedImageIndex === index
                        ? 'border-amber-500 shadow-md'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-gray-400 dark:hover:border-neutral-600'
                    } overflow-hidden transition-all`}
                  >
                    <img
                      src={image}
                      alt={`${currentProduct.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                {currentProduct.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white mt-2">
                {currentProduct.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold mt-1">
                SKU: <span className="font-mono">{currentProduct.sku}</span> {currentProduct.brand && `• ${currentProduct.brand}`}
              </p>
            </div>

            {/* Rating */}
            <div className="flex items-center space-x-2 text-xs">
              <div className="flex">
                {renderStars(currentProduct.rating || 5.0)}
              </div>
              <span className="text-gray-600 dark:text-neutral-400 font-bold">
                ({currentProduct.rating || 4.9}) {currentProduct.reviews || 42} reviews
              </span>
            </div>

            {/* Price */}
            <div className="p-4 bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-amber-500">
                  {formatPrice(currentProduct.price)}
                </span>
                {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                  <span className="text-base text-gray-400 line-through font-bold">
                    {formatPrice(currentProduct.originalPrice)}
                  </span>
                )}
                {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                    Save {formatPrice(currentProduct.originalPrice - currentProduct.price)}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {currentProduct.description && (
              <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                <p>{currentProduct.description}</p>
              </div>
            )}

            {/* Stock & Delivery Specs */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-xl">
                <p className="text-gray-400 font-bold text-[10px] uppercase">Availability</p>
                <p className={`font-bold mt-0.5 ${currentProduct.stock > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600'}`}>
                  {currentProduct.stock > 0 ? `In Stock (${currentProduct.stock} units)` : 'Backordered'}
                </p>
              </div>

              <div className="p-3 bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-xl flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-gray-400 font-bold text-[10px] uppercase">Delivery</p>
                  <p className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 text-[11px]">
                    {currentProduct.averageDeliveryTime || '2-4 business days'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions: Add to Cart & Buy Now */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={currentProduct.stock <= 0}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-gray-300 dark:disabled:bg-neutral-800 text-black font-black uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={currentProduct.stock <= 0}
                className="flex-1 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-black font-black uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-lg disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center gap-2"
              >
                <span>Instant Checkout</span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-neutral-400 pt-2 border-t border-gray-200 dark:border-neutral-800">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Full manufacturer warranty & return guarantee included</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProductDetailPage