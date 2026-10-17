import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Star,
  Truck,
  ShoppingCart,
  Heart,
  ArrowLeft,
  ShieldCheck,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  X,
  Play
} from 'lucide-react'
import { useProducts } from '../contexts/ProductContext'
import { useCart } from '../contexts/CartContext'

// Safe URL encoder for filenames with spaces or special characters
const getSafeMediaUrl = (url?: string) => {
  if (!url) return '/images/hero1.jpeg'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const parts = url.split('/')
  return parts.map((p, idx) => idx === 0 && p === '' ? '' : encodeURIComponent(decodeURIComponent(p))).join('/')
}

const isVideoMedia = (url?: string) => {
  if (!url) return false
  const lower = url.toLowerCase()
  return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.ogg')
}

export const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProduct, fetchProductById, isLoading, error } = useProducts()
  const { addToCart } = useCart()

  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<string>('')
  const [quantity, setQuantity] = useState(1)

  // Media Lightbox Modal state
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  useEffect(() => {
    if (id) {
      fetchProductById(id)
    }
  }, [id])

  const mediaList = (currentProduct?.images && currentProduct.images.length > 0)
    ? currentProduct.images
    : ['/images/hero1.jpeg']

  // Handle keyboard navigation for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false)
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % mediaList.length)
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, mediaList.length])

  const openLightbox = (index: number) => {
    setLightboxIndex(index)
    setIsLightboxOpen(true)
  }

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

  const activeMedia = mediaList[selectedImageIndex] || mediaList[0]
  const currentLightboxMedia = mediaList[lightboxIndex] || mediaList[0]

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
            <div
              onClick={() => openLightbox(selectedImageIndex)}
              className="group relative aspect-[4/3] bg-white dark:bg-[#16181e] border border-gray-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xl cursor-pointer"
            >
              {isVideoMedia(activeMedia) ? (
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <video
                    src={getSafeMediaUrl(activeMedia)}
                    className="w-full h-full object-contain"
                    controls
                    playsInline
                  />
                </div>
              ) : (
                <img
                  src={getSafeMediaUrl(activeMedia)}
                  alt={currentProduct.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (!target.src.endsWith('/images/hero1.jpeg')) {
                      target.src = '/images/hero1.jpeg'
                    }
                  }}
                />
              )}

              {/* Expand badge overlay */}
              <div className="absolute bottom-3 right-3 bg-black/70 hover:bg-amber-500 text-white hover:text-black backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg">
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Enlarge & View All ({mediaList.length})</span>
              </div>
            </div>

            {/* Thumbnail Carousel */}
            {mediaList.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {mediaList.map((media, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    onDoubleClick={() => openLightbox(index)}
                    className={`relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 bg-white dark:bg-[#16181e] rounded-xl border-2 ${
                      selectedImageIndex === index
                        ? 'border-amber-500 shadow-md ring-2 ring-amber-500/20'
                        : 'border-gray-200 dark:border-neutral-800 hover:border-amber-500/50'
                    } overflow-hidden transition-all`}
                  >
                    {isVideoMedia(media) ? (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-amber-500">
                        <Play className="w-6 h-6 fill-amber-500" />
                      </div>
                    ) : (
                      <img
                        src={getSafeMediaUrl(media)}
                        alt={`${currentProduct.name} thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          if (!target.src.endsWith('/images/hero1.jpeg')) {
                            target.src = '/images/hero1.jpeg'
                          }
                        }}
                      />
                    )}
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
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-gray-900 dark:text-white mt-2 font-anton">
                {currentProduct.name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-neutral-400 font-bold mt-1">
                SKU: <span className="font-mono">{currentProduct.sku}</span> {currentProduct.brand && `• ${currentProduct.brand}`}
              </p>
            </div>

            {/* Rating */}
            {currentProduct.rating && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {renderStars(currentProduct.rating)}
                </div>
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  {currentProduct.rating.toFixed(1)} ({currentProduct.reviews || 0} reviews)
                </span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-amber-500 font-anton">
                {formatPrice(currentProduct.price)}
              </span>
              {currentProduct.originalPrice && currentProduct.originalPrice > currentProduct.price && (
                <span className="text-sm font-bold text-gray-400 line-through">
                  {formatPrice(currentProduct.originalPrice)}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-b border-gray-200 dark:border-neutral-800 py-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-neutral-400">
                Overview & Description
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">
                {currentProduct.description || 'Engineered for extreme performance and lateral thrill. Assembled with heavy-duty components and precision braking for ultimate drift and speed.'}
              </p>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Quantity
              </span>
              <div className="flex items-center border border-gray-300 dark:border-neutral-700 rounded-xl overflow-hidden bg-white dark:bg-[#16181e]">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 font-bold"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-xs font-black min-w-[2.5rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-neutral-800 font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Shipping & Delivery Notice */}
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Truck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">
                    US Texas Depot Express Dispatch
                  </p>
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

      {/* FULL-SCREEN MEDIA LIGHTBOX / VIEWER MODAL */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-fadeIn select-none">
          {/* Header */}
          <div className="flex items-center justify-between text-white max-w-6xl w-full mx-auto pb-3 border-b border-white/10">
            <div>
              <h3 className="font-anton text-lg sm:text-xl uppercase tracking-wider text-amber-500">
                {currentProduct.name}
              </h3>
              <p className="text-xs text-gray-400">
                Media {lightboxIndex + 1} of {mediaList.length} • Use Arrow Keys to navigate, Esc to exit
              </p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-amber-500 hover:text-black transition-colors"
              title="Close (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Media Viewer Viewport */}
          <div className="relative flex-1 flex items-center justify-center py-4 max-w-6xl w-full mx-auto overflow-hidden">
            {/* Previous Button */}
            {mediaList.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length)}
                className="absolute left-2 sm:left-4 z-10 p-3 rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white transition-all backdrop-blur-sm"
                title="Previous (Left Arrow)"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

            {/* Media Item */}
            <div className="max-h-[70vh] sm:max-h-[75vh] max-w-full flex items-center justify-center">
              {isVideoMedia(currentLightboxMedia) ? (
                <video
                  src={getSafeMediaUrl(currentLightboxMedia)}
                  controls
                  autoPlay
                  className="max-h-[70vh] sm:max-h-[75vh] max-w-full rounded-2xl shadow-2xl object-contain bg-black"
                />
              ) : (
                <img
                  src={getSafeMediaUrl(currentLightboxMedia)}
                  alt={`${currentProduct.name} enlarged view ${lightboxIndex + 1}`}
                  className="max-h-[70vh] sm:max-h-[75vh] max-w-full rounded-2xl shadow-2xl object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    if (!target.src.endsWith('/images/hero1.jpeg')) {
                      target.src = '/images/hero1.jpeg'
                    }
                  }}
                />
              )}
            </div>

            {/* Next Button */}
            {mediaList.length > 1 && (
              <button
                onClick={() => setLightboxIndex((prev) => (prev + 1) % mediaList.length)}
                className="absolute right-2 sm:right-4 z-10 p-3 rounded-full bg-black/60 hover:bg-amber-500 hover:text-black text-white transition-all backdrop-blur-sm"
                title="Next (Right Arrow)"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}
          </div>

          {/* Horizontal Scrolling Thumbnails Reel */}
          {mediaList.length > 1 && (
            <div className="max-w-4xl w-full mx-auto pt-3 border-t border-white/10">
              <div className="flex items-center justify-center gap-3 overflow-x-auto py-2 scrollbar-thin">
                {mediaList.map((thumb, idx) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      lightboxIndex === idx
                        ? 'border-amber-500 ring-2 ring-amber-500 scale-105'
                        : 'border-white/20 opacity-60 hover:opacity-100 hover:border-amber-500/50'
                    }`}
                  >
                    {isVideoMedia(thumb) ? (
                      <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-amber-500">
                        <Play className="w-5 h-5 fill-amber-500" />
                      </div>
                    ) : (
                      <img
                        src={getSafeMediaUrl(thumb)}
                        alt={`Thumb ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          if (!target.src.endsWith('/images/hero1.jpeg')) {
                            target.src = '/images/hero1.jpeg'
                          }
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProductDetailPage