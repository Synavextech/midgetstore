import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  Check,
  Star,
  Truck,
  ShieldCheck,
  Zap,
  ArrowRight,
  Filter,
  ShoppingBag,
  Plus,
  Minus
} from 'lucide-react'
import { useProducts } from '../contexts/ProductContext'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { AuthModal } from '../components/AuthModal'
import { QuickCartDrawer } from '../components/QuickCartDrawer'

const CATEGORIES = [
  { id: 'all', label: 'All Rigs' },
  { id: 'microcars', label: 'Microcars' },
  { id: 'go karts', label: 'Go Karts' },
  { id: 'trikes', label: 'Trikes' },
  { id: 'dirtbikes', label: 'Dirtbikes' },
]

// Safe URL encoder for filenames with spaces and special characters
const getSafeMediaUrl = (url?: string) => {
  if (!url) return '/images/hero1.jpeg'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const parts = url.split('/')
  return parts.map((p, idx) => idx === 0 && p === '' ? '' : encodeURIComponent(decodeURIComponent(p))).join('/')
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { products, isLoading, error, fetchProducts } = useProducts()
  const { addToCart, totalItems, totalPrice } = useCart()
  const { isAuthenticated } = useAuth()

  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [addedProductIds, setAddedProductIds] = useState<Record<string, boolean>>({})

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const formatPrice = (price: number) => {
    return `$${(price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const safeProducts = Array.isArray(products) ? products : []

  // Filter products by selected category or keyword
  const filteredProducts = selectedCategory === 'all'
    ? safeProducts
    : safeProducts.filter(p => {
        const cat = (p.category || '').toLowerCase()
        const name = (p.name || '').toLowerCase()
        const sel = selectedCategory.toLowerCase()

        if (sel === 'microcars') {
          return cat.includes('microcar') || cat.includes('car') || cat.includes('jeep') ||
                 name.includes('microcar') || name.includes('car') || name.includes('jeep') || name.includes('willys')
        }
        if (sel === 'go karts') {
          return cat.includes('kart') || cat.includes('buggy') ||
                 name.includes('kart') || name.includes('buggy')
        }
        if (sel === 'trikes') {
          return cat.includes('trike') || (cat.includes('drift') && !cat.includes('kart')) ||
                 name.includes('trike')
        }
        if (sel === 'dirtbikes' || sel === 'dirt bikes') {
          return cat.includes('dirt') || cat.includes('bike') || cat.includes('enduro') || cat.includes('motorcycle') ||
                 name.includes('dirt') || name.includes('bike') || name.includes('enduro') || name.includes('motorcycle')
        }
        return cat.includes(sel) || name.includes(sel)
      })

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 1
      const updated = Math.max(1, current + delta)
      return { ...prev, [productId]: updated }
    })
  }

  const handleAddToCart = (product: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const quantity = quantities[product.id] || 1
    addToCart(product, quantity)

    // Visual feedback
    setAddedProductIds(prev => ({ ...prev, [product.id]: true }))
    setTimeout(() => {
      setAddedProductIds(prev => ({ ...prev, [product.id]: false }))
    }, 1500)

    // Open quick cart drawer for instant review & checkout trigger
    setIsCartDrawerOpen(true)
  }

  const handleInstantCheckout = () => {
    if (totalItems === 0) return
    if (!isAuthenticated) {
      setIsAuthModalOpen(true)
    } else {
      navigate('/checkout')
    }
  }

  // Helper to extract or generate realistic specs like edrifttrikes.shop
  const getProductSpecs = (product: any) => {
    const name = product.name?.toLowerCase() || ''
    if (name.includes('trike') || name.includes('drift')) {
      return { speed: '70 km/h', range: '60 km', power: '5000W' }
    }
    if (name.includes('kart') || name.includes('buggy')) {
      return { speed: '60 km/h', range: 'Up to 85 KM', power: '72V Dual' }
    }
    if (name.includes('bike')) {
      return { speed: '>80 km/h', range: '55 KM', power: '6000W' }
    }
    return { speed: 'High Torque', range: 'Pro-Grade', power: 'Li-Ion 72V' }
  }

  if (isLoading) {
    return (
      <div className="pt-28 min-h-screen flex items-center justify-center bg-[#131316] text-white">
        <div className="text-center p-8 bg-[#17171c] rounded-2xl shadow-2xl border border-white/10 max-w-sm w-full mx-4">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="w-16 h-16 rounded-full border-4 border-gray-800 border-t-amber-500 animate-spin" />
            <ShoppingBag className="w-6 h-6 text-amber-500 absolute inset-0 m-auto" />
          </div>
          <h3 className="font-anton text-2xl uppercase tracking-wider text-white mb-1">Loading Fleet</h3>
          <p className="text-xs text-gray-400">Fetching Midget Micro Drive & Rides inventory...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-28 min-h-screen bg-[#131316] flex items-center justify-center p-4 text-white">
        <div className="text-center max-w-md w-full bg-[#17171c] p-8 rounded-2xl border border-white/10">
          <div className="w-16 h-16 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="font-anton text-2xl uppercase tracking-wider text-white mb-2">Unable to Load Fleet</h3>
          <p className="text-xs text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => fetchProducts()}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 px-6 rounded-xl uppercase tracking-widest text-xs transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#131316] text-gray-900 dark:text-white selection:bg-amber-500 selection:text-black transition-colors duration-200">
      {/* High-Impact Hero Section — Locally Hosted Files & Brand Tagline */}
      <header className="relative w-full h-[64vh] min-h-[480px] max-h-[740px] flex items-center overflow-hidden bg-black border-b border-gray-200 dark:border-white/10">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero1.jpeg"
            alt="Midget Micro Drive & Rides Fleet"
            className="w-full h-full object-cover opacity-60"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/images/60v-5000w-high-speed-electric-drift-kart.webp'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/70" />
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl space-y-5 md:space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              US Texas Head Office Depot
            </div>

            <h1 className="font-anton text-5xl sm:text-7xl lg:text-8xl text-white leading-none tracking-tight uppercase">
              MIDGET MICRO DRIVES <span className="text-amber-500">& RIDES</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-300 max-w-2xl border-l-4 border-amber-500 pl-6 leading-relaxed font-medium">
              <span className="font-extrabold text-amber-400 block text-sm sm:text-base uppercase tracking-wider mb-1">
                small rides, big excitement
              </span>
              Precision torque meets lateral freedom. Dominate every asphalt curve, outdoor track, and dirt trail with the nation's premier selection of electric drift trikes, dirt bikes, and high-speed go karts.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href="#store-catalog"
                onClick={() => setSelectedCategory('microcars')}
                className="bg-amber-500 hover:bg-amber-400 text-black px-6 py-3.5 font-extrabold text-xs uppercase tracking-widest rounded-lg active:scale-95 transition-all shadow-lg shadow-amber-500/20"
              >
                Shop Microcars
              </a>
              <a
                href="#store-catalog"
                onClick={() => setSelectedCategory('go karts')}
                className="border-2 border-white/30 text-white px-6 py-3.5 font-extrabold text-xs uppercase tracking-widest rounded-lg hover:border-amber-500 hover:text-amber-500 active:scale-95 transition-all"
              >
                Shop Go Karts
              </a>
              <a
                href="#store-catalog"
                onClick={() => setSelectedCategory('trikes')}
                className="border-2 border-white/30 text-white px-6 py-3.5 font-extrabold text-xs uppercase tracking-widest rounded-lg hover:border-amber-500 hover:text-amber-500 active:scale-95 transition-all"
              >
                Shop Trikes
              </a>
              <a
                href="#store-catalog"
                onClick={() => setSelectedCategory('dirtbikes')}
                className="border-2 border-white/30 text-white px-6 py-3.5 font-extrabold text-xs uppercase tracking-widest rounded-lg hover:border-amber-500 hover:text-amber-500 active:scale-95 transition-all"
              >
                Shop Dirtbikes
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Trust & Guarantee Strip — USD & Texas Office */}
      <section className="bg-gray-100/80 dark:bg-[#0f0f12] border-b border-gray-200 dark:border-white/10 py-5 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-amber-500 flex-shrink-0 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">US Express Shipping</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Texas Depot fast dispatch</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-blue-500 dark:text-blue-400 flex-shrink-0 shadow-sm">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Credit & Debit Card</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Encrypted 256-bit SSL</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-amber-500 dark:text-amber-400 flex-shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">PayPal Protection</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">Buyer protection policy</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 flex-shrink-0 shadow-sm">
                <Star className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-[11px] font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">Factory Verified</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">100% Authentic vehicles</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section: "The Full Range" — Exact edrifttrikes.shop Layout */}
      <section id="store-catalog" className="pt-14 pb-24 bg-gray-50 dark:bg-[#0d0d10] text-gray-900 dark:text-white transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
            <div>
              <span className="font-bold text-xs text-amber-500 uppercase tracking-widest">
                Shop Everything
              </span>
              <h2 className="font-anton text-4xl sm:text-5xl uppercase tracking-tight text-gray-900 dark:text-white mt-1">
                The Full Range
              </h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-white dark:bg-[#17171c] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/10 hover:border-amber-500/40 shadow-sm'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white dark:bg-[#17171c] rounded-2xl border border-gray-200 dark:border-white/10 p-12 text-center text-gray-600 dark:text-gray-400 shadow-sm">
              <ShoppingBag className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-3" />
              <h3 className="font-anton text-2xl uppercase tracking-wider text-gray-900 dark:text-white mb-1">No products found</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">No rigs matching "{selectedCategory}" in catalog.</p>
              <button
                onClick={() => setSelectedCategory('all')}
                className="bg-amber-500 text-black font-extrabold px-6 py-2.5 rounded-lg text-xs uppercase tracking-wider hover:bg-amber-400 transition-colors"
              >
                View Full Range
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5">
              {filteredProducts.map((product) => {
                const qty = quantities[product.id] || 1
                const isAdded = !!addedProductIds[product.id]
                const specs = getProductSpecs(product)

                return (
                  <div
                    key={product.id}
                    className="group bg-white dark:bg-[#17171c] border border-gray-200 dark:border-white/10 rounded-lg overflow-hidden flex flex-col hover-lift hover:border-amber-500 transition-all shadow-sm dark:shadow-md"
                  >
                    {/* Aspect-square image container with Cut-Corner Badge */}
                    <Link
                      to={`/product/${product.id}`}
                      className="relative block aspect-square overflow-hidden bg-gray-100 dark:bg-black"
                    >
                      {product.images && product.images.length > 0 ? (
                        <img
                          src={getSafeMediaUrl(product.images[0])}
                          alt={product.name}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            if (!target.src.endsWith('/images/hero1.jpeg')) {
                              target.src = '/images/hero1.jpeg'
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs">
                          No Image
                        </div>
                      )}

                      {/* Cut-Corner SALE / NEW Badge matching edrifttrikes.shop */}
                      <span className="absolute top-2.5 left-2.5 cut-corner-badge font-extrabold text-[10px] uppercase tracking-widest px-3 py-1 bg-amber-500 text-black shadow-md">
                        {product.isNew ? 'NEW' : 'SALE'}
                      </span>

                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="absolute top-2.5 right-2.5 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 bg-red-600 text-white rounded">
                          {product.stock} Left
                        </span>
                      )}
                    </Link>

                    {/* Card Body */}
                    <div className="p-3.5 sm:p-4 flex flex-col flex-1 text-gray-900 dark:text-white">
                      <Link to={`/product/${product.id}`}>
                        <h3 className="font-anton text-base sm:text-lg uppercase leading-tight line-clamp-2 hover:text-amber-500 transition-colors text-gray-900 dark:text-white">
                          {product.name}
                        </h3>
                      </Link>

                      <p className="text-gray-500 dark:text-gray-400 text-xs mt-1 line-clamp-1">
                        {product.description || 'High-performance electric power with precision handling'}
                      </p>

                      {/* 2-Column Key Specifications with orange left border */}
                      <div className="grid grid-cols-2 gap-2 my-3 text-[10px] uppercase font-bold border-t border-b border-gray-100 dark:border-white/5 py-2">
                        <div className="border-l-2 border-amber-500 pl-2">
                          <p className="text-gray-500 dark:text-gray-400 text-[9px] uppercase tracking-widest font-medium">Top Speed</p>
                          <p className="font-extrabold text-gray-900 dark:text-white">{specs.speed}</p>
                        </div>
                        <div className="border-l-2 border-amber-500 pl-2">
                          <p className="text-gray-500 dark:text-gray-400 text-[9px] uppercase tracking-widest font-medium">Range</p>
                          <p className="font-extrabold text-gray-900 dark:text-white">{specs.range}</p>
                        </div>
                      </div>

                      {/* Pricing & Free Shipping Tag */}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <div>
                          <span className="text-amber-500 font-anton text-lg sm:text-xl">
                            {formatPrice(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="block text-[10px] text-gray-400 dark:text-gray-500 line-through">
                              {formatPrice(product.originalPrice)}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[9px] uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-transparent border border-amber-500/40 rounded px-2 py-0.5">
                          Free shipping
                        </span>
                      </div>

                      {/* Quantity Controls & Full-Width Add to Cart Button */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex items-center border border-gray-200 dark:border-white/10 rounded bg-gray-100 dark:bg-[#131316]">
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, -1)}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-gray-900 dark:text-white">{qty}</span>
                          <button
                            type="button"
                            onClick={() => handleQuantityChange(product.id, 1)}
                            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(product, e)}
                          className={`flex-1 py-2 sm:py-2.5 font-extrabold text-[10px] sm:text-xs uppercase tracking-widest rounded transition-all active:scale-95 flex items-center justify-center gap-1.5 ${
                            isAdded
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-amber-500 hover:text-black dark:hover:bg-amber-500 dark:hover:text-black'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Added</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Add to Cart</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Footer Matching Midget Micro Drive & Rides - Texas Head Office */}
      <footer className="bg-gray-100 dark:bg-[#0b0b0e] border-t border-gray-200 dark:border-white/10 text-gray-900 dark:text-white pt-16 pb-28 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-gray-200 dark:border-white/10">
            {/* Col 1: Brand & Bio */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-lg">
                  ⚡
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-xl text-amber-500 tracking-wide leading-none">
                    MIDGET <span className="text-gray-900 dark:text-white">MICRO DRIVES</span>
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold">
                    small rides, big excitement
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                The premier American supplier of high-torque electric drift trikes, dirt bikes, racing go karts, and performance micro rides. Engineered for thrill-seekers.
              </p>
              <div className="space-y-1.5 pt-1 text-xs text-gray-600 dark:text-gray-400">
                <p className="text-gray-900 dark:text-white font-bold">🏢 Head Office:</p>
                <p>1000 Micro Drive Way, Suite 400</p>
                <p>Austin, TX 78701, United States</p>
                <p className="text-amber-600 dark:text-amber-400 font-semibold pt-1">📞 +1 (512) 890-3450</p>
                <p className="text-amber-600 dark:text-amber-400 font-semibold">✉️ support@midgetmicrodrivesandrides.shop</p>
              </div>
            </div>

            {/* Col 2: Fleet Links */}
            <div>
              <p className="font-bold text-xs text-amber-500 uppercase tracking-widest mb-4">The Fleet</p>
              <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                <li><a href="#store-catalog" onClick={() => setSelectedCategory('microcars')} className="hover:text-amber-500 dark:hover:text-white transition-colors">Microcars & Mini Jeeps</a></li>
                <li><a href="#store-catalog" onClick={() => setSelectedCategory('go karts')} className="hover:text-amber-500 dark:hover:text-white transition-colors">Racing Go Karts & Buggies</a></li>
                <li><a href="#store-catalog" onClick={() => setSelectedCategory('trikes')} className="hover:text-amber-500 dark:hover:text-white transition-colors">Electric Drift Trikes</a></li>
                <li><a href="#store-catalog" onClick={() => setSelectedCategory('dirtbikes')} className="hover:text-amber-500 dark:hover:text-white transition-colors">Dirtbikes & Enduro</a></li>
                <li><a href="#store-catalog" onClick={() => setSelectedCategory('all')} className="hover:text-amber-500 dark:hover:text-white transition-colors">The Full Range Catalog</a></li>
              </ul>
            </div>

            {/* Col 3: Support & Security */}
            <div>
              <p className="font-bold text-xs text-amber-500 uppercase tracking-widest mb-4">Support & Care</p>
              <ul className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                <li><a href="#shipping" className="hover:text-amber-500 dark:hover:text-white transition-colors">Texas Depot Express Dispatch</a></li>
                <li><a href="#payments" className="hover:text-amber-500 dark:hover:text-white transition-colors">Card & PayPal Protection</a></li>
                <li><a href="#warranty" className="hover:text-amber-500 dark:hover:text-white transition-colors">Factory Warranty & Guarantees</a></li>
                <li><Link to="/login" className="hover:text-amber-500 dark:hover:text-white transition-colors">Customer & Admin Portal</Link></li>
              </ul>
            </div>

            {/* Col 4: Newsletter */}
            <div>
              <p className="font-bold text-xs text-amber-500 uppercase tracking-widest mb-4">Stay in the Drift</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Get notified first when new limited builds, battery kits, and seasonal sales drop.
              </p>
              <form onSubmit={(e) => e.preventDefault()} className="space-y-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="w-full bg-white dark:bg-[#17171c] border border-gray-300 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all shadow-md shadow-amber-500/20"
                >
                  Join VIP Dispatch
                </button>
              </form>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 dark:text-gray-400 gap-4">
            <p>© 2026 Midget Micro Drive & Rides (midgetmicrodrivesandrides.shop). All rights reserved. By management! All users should create an account to track order progress.</p>
            <div className="flex gap-6">
              <a href="#privacy" className="hover:text-amber-500 dark:hover:text-gray-300">Privacy</a>
              <a href="#terms" className="hover:text-amber-500 dark:hover:text-gray-300">Terms</a>
              <a href="#contact" className="hover:text-amber-500 dark:hover:text-gray-300">Texas HQ Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Bottom Quick-Checkout Bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#131316]/95 backdrop-blur-md border-t border-gray-200 dark:border-white/10 p-4 shadow-2xl z-40 text-gray-900 dark:text-white transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div 
                onClick={() => setIsCartDrawerOpen(true)}
                className="w-12 h-12 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center text-amber-500 relative cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              >
                <ShoppingCart className="w-6 h-6" />
                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {totalItems}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">Your Cart ({totalItems} items)</p>
                <p className="font-anton text-xl text-amber-500">{formatPrice(totalPrice)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCartDrawerOpen(true)}
                className="hidden sm:inline-flex px-4 py-2.5 rounded-lg border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-extrabold text-xs uppercase tracking-wider hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              >
                Review Items
              </button>
              <button
                onClick={handleInstantCheckout}
                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold py-3 px-6 sm:px-8 rounded-lg shadow-lg shadow-amber-500/20 flex items-center gap-2 text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                <span>{isAuthenticated ? 'Proceed to Checkout' : 'Quick Checkout'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Slide-Over Quick Cart Drawer */}
      <QuickCartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onPromptAuth={() => {
          setIsCartDrawerOpen(false)
          setIsAuthModalOpen(true)
        }}
      />

      {/* Same-Page Prompted Sign-in / Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          navigate('/checkout')
        }}
        message="By management! All users should sign in or create an account to track order progress and checkout."
      />
    </div>
  )
}

export default HomePage