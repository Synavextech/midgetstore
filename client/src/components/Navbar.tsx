import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, User, Menu, LogOut, Settings, X, Heart, ChevronRight } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useProducts } from '../contexts/ProductContext'
import { useTheme } from '../contexts/ThemeContext'

const Sun = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
)

const Moon = ({ className }: { className?: string }) => (
  <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </svg>
)

interface NavbarProps {
  onOpenCart?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCart }) => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const { user, isAuthenticated, logout } = useAuth()
  const { totalItems } = useCart()
  const { searchProducts } = useProducts()
  const { theme, toggleTheme } = useTheme()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      await searchProducts(searchQuery)
      setIsSearchOpen(false)
      setMobileMenuOpen(false)
      navigate('/#store-catalog')
    }
  }

  const handleCartClick = () => {
    if (onOpenCart) {
      onOpenCart()
    } else {
      navigate('/cart')
    }
  }

  return (
    <div className="w-full">
      {/* Top Announcement Ticker Strip - Matching edrifttrikes.shop */}
      <aside
        aria-label="Store announcements"
        className="group relative w-full overflow-hidden bg-amber-500 text-black border-b border-black/10 select-none"
      >
        <div className="animate-marquee flex w-max items-center py-2 font-bold text-[11px] uppercase tracking-widest">
          <div className="flex items-center">
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">By management! All users should create an account to track their order progress.</span>
            </span>
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">FREE EXPRESS US SHIPPING ON ALL ORDERS OVER $500</span>
            </span>
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">STRIPE & PAYPAL INSTANT USD CHECKOUT</span>
            </span>
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">HEADQUARTERS & DISPATCH: TEXAS, USA</span>
            </span>
          </div>
          {/* Duplicate track for seamless continuous loop */}
          <div className="flex items-center" aria-hidden="true">
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">By management! All users should create an account to track their order progress.</span>
            </span>
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">FREE EXPRESS US SHIPPING ON ALL ORDERS OVER $500</span>
            </span>
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">STRIPE & PAYPAL INSTANT USD CHECKOUT</span>
            </span>
            <span className="inline-flex items-center gap-6 px-6">
              <span className="h-1.5 w-1.5 shrink-0 rotate-45 bg-black/60" />
              <span className="whitespace-nowrap font-extrabold">HEADQUARTERS & DISPATCH: TEXAS, USA</span>
            </span>
          </div>
        </div>
      </aside>

      {/* Main Navbar — Sticky Dark Motorsport Header */}
      <nav className="w-full top-0 sticky z-50 border-b bg-[#131316] border-white/10 text-white shadow-xl">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 md:px-8 py-3.5 max-w-7xl mx-auto gap-4">
          {/* Brand Logo for Midget Micro Drive & Rides */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-xl shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
              ⚡
            </div>
            <div className="flex flex-col">
              <span className="font-anton text-xl md:text-2xl tracking-wide leading-none">
                <span className="text-amber-500">MIDGET</span>
                <span className="text-white"> MICRO DRIVES</span>
              </span>
              <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold hidden sm:inline -mt-0.5">
                small rides, big excitement
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-8 font-bold text-xs uppercase tracking-widest text-gray-300">
            <a href="/#store-catalog" className="hover:text-amber-400 transition-colors">
              Trikes
            </a>
            <a href="/#store-catalog" className="hover:text-amber-400 transition-colors">
              Dirt Bikes
            </a>
            <a href="/#store-catalog" className="hover:text-amber-400 transition-colors">
              Go Karts
            </a>
            <a href="/#store-catalog" className="hover:text-amber-400 transition-colors">
              The Full Range
            </a>
          </div>

          {/* Desktop Right Action Icons */}
          <div className="hidden md:flex items-center gap-1.5">
            {/* Search Toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-amber-400 transition-colors text-gray-300"
              title="Search catalog"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Wishlist / Parts Bin */}
            <Link
              to="/wishlist"
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-amber-400 transition-colors text-gray-300"
              title="Parts Bin / Saved Items"
            >
              <Heart className="w-5 h-5" />
            </Link>

            {/* Cart Button with Counter */}
            <button
              onClick={handleCartClick}
              className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-amber-400 transition-colors text-gray-300"
              title="Open Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center shadow-lg shadow-amber-500/40">
                  {totalItems}
                </span>
              )}
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-amber-400 transition-colors text-gray-300"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-5 h-5 text-amber-400 hover:-rotate-12 transition-transform" />
              )}
            </button>

            {/* Account / User Menu */}
            <div className="relative ml-2">
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-white/5 border border-white/10 hover:border-amber-500 text-gray-200 transition-all text-xs font-bold"
                  >
                    <div className="w-6 h-6 rounded-full bg-amber-500 text-black font-black flex items-center justify-center text-[10px]">
                      {user?.firstName ? user.firstName[0].toUpperCase() : 'U'}
                    </div>
                    <span className="hidden lg:inline">{user?.firstName || 'Account'}</span>
                    {user?.role === 'ADMIN' && (
                      <span className="bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                        Admin
                      </span>
                    )}
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#17171c] border border-white/10 rounded-2xl shadow-2xl py-2 z-50 text-white backdrop-blur-2xl">
                      <div className="px-4 py-2.5 border-b border-white/10">
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Signed in as</p>
                        <p className="text-xs font-bold text-white truncate">{user?.email}</p>
                        <span className="inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-white/10 text-amber-400">
                          {user?.role}
                        </span>
                      </div>

                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/admin"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center px-4 py-2.5 text-xs font-bold text-purple-300 hover:bg-white/5 transition-colors"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Link>
                      )}

                      <Link
                        to="/checkout"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center px-4 py-2.5 text-xs font-bold text-gray-200 hover:bg-white/5 transition-colors"
                      >
                        <ShoppingCart className="mr-2 h-4 w-4 text-amber-400" />
                        Proceed to Checkout
                      </Link>

                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          logout()
                        }}
                        className="flex items-center w-full px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black px-4 py-2 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile Right Icons */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={handleCartClick}
              className="relative h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-amber-400 transition-colors text-gray-200"
              title="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </button>

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-white/10 hover:text-amber-400 transition-colors text-gray-200"
              title="Open Navigation"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Dropdown Desktop Search Bar */}
        {isSearchOpen && (
          <div className="border-t border-white/10 bg-[#17171c] py-3 px-4">
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search rigs, dirt bikes, parts, gear..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-[#131316] border border-white/20 rounded-xl px-4 py-2.5 pl-10 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        )}
      </nav>

      {/* Mobile Slide-Out Drawer — Exactly matching edrifttrikes.shop */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[85] md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Panel */}
          <aside className="absolute top-0 right-0 h-full w-[86%] max-w-sm bg-[#131316] border-l border-white/10 flex flex-col shadow-2xl text-white">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
              <span className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-black text-lg">
                  ⚡
                </div>
                <div className="flex flex-col">
                  <span className="font-anton text-lg text-amber-500 tracking-wide leading-none">
                    MIDGET <span className="text-white">MICRO DRIVES</span>
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-amber-400 font-bold">
                    small rides, big excitement
                  </span>
                </div>
              </span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="h-10 w-10 flex items-center justify-center rounded-full text-gray-300 hover:text-amber-400"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Drawer Body Scroll */}
            <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
              {/* Search Bar */}
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search rigs, parts, gear..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1a1a20] border border-white/10 rounded-lg px-4 h-12 pl-10 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-4" />
              </form>

              {/* Shop Categories */}
              <div>
                <p className="font-bold text-[11px] text-amber-500 uppercase tracking-widest mb-2">
                  Shop
                </p>
                <nav className="flex flex-col">
                  <a
                    href="/#store-catalog"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between h-12 text-white font-anton text-xl uppercase border-b border-white/5 hover:text-amber-400"
                  >
                    All Rigs
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </a>
                  <a
                    href="/#store-catalog"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between h-12 text-white font-anton text-xl uppercase border-b border-white/5 hover:text-amber-400"
                  >
                    Trikes
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </a>
                  <a
                    href="/#store-catalog"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between h-12 text-white font-anton text-xl uppercase border-b border-white/5 hover:text-amber-400"
                  >
                    Dirt Bikes
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </a>
                  <a
                    href="/#store-catalog"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between h-12 text-white font-anton text-xl uppercase border-b border-white/5 hover:text-amber-400"
                  >
                    Go Karts & Electric
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  </a>
                </nav>
              </div>

              {/* Explore Section */}
              <div>
                <p className="font-bold text-[11px] text-amber-500 uppercase tracking-widest mb-2">
                  Explore
                </p>
                <nav className="flex flex-col space-y-1">
                  <Link
                    to="/about"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center h-10 text-gray-300 hover:text-white font-bold uppercase tracking-widest text-xs border-b border-white/5"
                  >
                    About Us
                  </Link>
                  <a
                    href="#support"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center h-10 text-gray-300 hover:text-white font-bold uppercase tracking-widest text-xs border-b border-white/5"
                  >
                    Support & Help
                  </a>
                  <a
                    href="#shipping"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center h-10 text-gray-300 hover:text-white font-bold uppercase tracking-widest text-xs border-b border-white/5"
                  >
                    Shipping & Warranty
                  </a>
                </nav>
              </div>

              {/* 3-Button Action Grid: Account, Wishlist, Cart */}
              <div>
                <p className="font-bold text-[11px] text-amber-500 uppercase tracking-widest mb-2">
                  Account & Shortcuts
                </p>
                <nav className="grid grid-cols-3 gap-2.5">
                  <Link
                    to={isAuthenticated ? (user?.role === 'ADMIN' ? '/admin' : '/checkout') : '/login'}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-col items-center justify-center gap-1.5 bg-[#1a1a20] border border-white/10 rounded-lg py-3.5 text-gray-300 hover:text-amber-400 transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">
                      {isAuthenticated ? 'Profile' : 'Login'}
                    </span>
                  </Link>

                  <Link
                    to="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex flex-col items-center justify-center gap-1.5 bg-[#1a1a20] border border-white/10 rounded-lg py-3.5 text-gray-300 hover:text-amber-400 transition-colors"
                  >
                    <Heart className="w-5 h-5" />
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Parts Bin</span>
                  </Link>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleCartClick()
                    }}
                    className="flex flex-col items-center justify-center gap-1.5 bg-[#1a1a20] border border-white/10 rounded-lg py-3.5 text-gray-300 hover:text-amber-400 transition-colors relative"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {totalItems > 0 && (
                      <span className="absolute top-2 right-4 bg-amber-500 text-black text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center">
                        {totalItems}
                      </span>
                    )}
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Cart</span>
                  </button>
                </nav>
              </div>
            </div>

            {/* Drawer Bottom Actions */}
            <div className="p-5 border-t border-white/10 shrink-0 space-y-3 bg-[#0f0f12]">
              <a
                href="/#store-catalog"
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center bg-amber-500 text-black py-3.5 rounded-lg font-black uppercase tracking-widest text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
              >
                Shop The Fleet
              </a>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center text-gray-400 py-1 font-bold uppercase tracking-widest text-[11px] hover:text-white"
                >
                  Sign In / Register
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full text-center text-red-400 py-1 font-bold uppercase tracking-widest text-[11px] hover:text-red-300"
                >
                  Log Out
                </button>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default Navbar