-- =====================================================
-- Trendstore - Supabase Database Schema Update & Migration
-- Fully Idempotent Script for Production Readiness
-- Handles Products, Orders, Carts, Addresses, Users, Events,
-- PayPal/Stripe Payment Settlement, and Foreign Key Relationships
-- =====================================================
-- Safe to execute repeatedly in the Supabase SQL Editor.

-- Enable cryptographic and UUID extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. BASE TABLES CREATION (IF NOT EXISTS)
-- =====================================================

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'CUSTOMER',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    sku TEXT UNIQUE NOT NULL,
    stock INTEGER DEFAULT 0,
    images TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    brand TEXT,
    is_active BOOLEAN DEFAULT true,
    is_new BOOLEAN DEFAULT false,
    shipping_required BOOLEAN DEFAULT true,
    average_delivery_time TEXT DEFAULT '2-4 business days',
    weight DECIMAL(8,2),
    dimensions TEXT,
    rating DECIMAL(3,2) DEFAULT 4.90,
    reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    price DECIMAL(10,2) DEFAULT 0,
    UNIQUE(product_id, name, value)
);

-- Shopping Carts Table
CREATE TABLE IF NOT EXISTS public.carts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    cart_id TEXT REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    UNIQUE(cart_id, product_id)
);

-- Addresses Table
CREATE TABLE IF NOT EXISTS public.addresses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'SHIPPING',
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company TEXT,
    address1 TEXT NOT NULL,
    address2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    postal_code TEXT,
    country TEXT NOT NULL DEFAULT 'United States',
    phone TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    order_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'PENDING',
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    shipping DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT DEFAULT 'STRIPE',
    payment_status TEXT DEFAULT 'PENDING',
    payment_id TEXT,
    shipping_address_id TEXT REFERENCES public.addresses(id),
    billing_address_id TEXT REFERENCES public.addresses(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL
);

-- Events Table
CREATE TABLE IF NOT EXISTS public.events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    time TEXT,
    location TEXT,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ENSURE ALL REQUIRED COLUMNS EXIST (IDEMPOTENT ALTERATIONS)
-- =====================================================

DO $$
BEGIN
    -- Products table column additions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'original_price') THEN
        ALTER TABLE public.products ADD COLUMN original_price DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'rating') THEN
        ALTER TABLE public.products ADD COLUMN rating DECIMAL(3,2) DEFAULT 4.90;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reviews') THEN
        ALTER TABLE public.products ADD COLUMN reviews INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE public.products ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'is_new') THEN
        ALTER TABLE public.products ADD COLUMN is_new BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'shipping_required') THEN
        ALTER TABLE public.products ADD COLUMN shipping_required BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'average_delivery_time') THEN
        ALTER TABLE public.products ADD COLUMN average_delivery_time TEXT DEFAULT '2-4 business days';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'weight') THEN
        ALTER TABLE public.products ADD COLUMN weight DECIMAL(8,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'dimensions') THEN
        ALTER TABLE public.products ADD COLUMN dimensions TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'brand') THEN
        ALTER TABLE public.products ADD COLUMN brand TEXT;
    END IF;

    -- Orders table column additions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'notes') THEN
        ALTER TABLE public.orders ADD COLUMN notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_id') THEN
        ALTER TABLE public.orders ADD COLUMN payment_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'PENDING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT DEFAULT 'STRIPE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping_address_id') THEN
        ALTER TABLE public.orders ADD COLUMN shipping_address_id TEXT REFERENCES public.addresses(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'billing_address_id') THEN
        ALTER TABLE public.orders ADD COLUMN billing_address_id TEXT REFERENCES public.addresses(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'subtotal') THEN
        ALTER TABLE public.orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tax') THEN
        ALTER TABLE public.orders ADD COLUMN tax DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'shipping') THEN
        ALTER TABLE public.orders ADD COLUMN shipping DECIMAL(10,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'discount') THEN
        ALTER TABLE public.orders ADD COLUMN discount DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Addresses table column additions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'company') THEN
        ALTER TABLE public.addresses ADD COLUMN company TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'address2') THEN
        ALTER TABLE public.addresses ADD COLUMN address2 TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'phone') THEN
        ALTER TABLE public.addresses ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'is_default') THEN
        ALTER TABLE public.addresses ADD COLUMN is_default BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'postal_code') THEN
        ALTER TABLE public.addresses ADD COLUMN postal_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'addresses' AND column_name = 'zip_code') THEN
        ALTER TABLE public.addresses ADD COLUMN zip_code TEXT;
    END IF;

    -- Users table column additions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone') THEN
        ALTER TABLE public.users ADD COLUMN phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE public.users ADD COLUMN role TEXT DEFAULT 'CUSTOMER';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active') THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
    END IF;
END $$;

-- =====================================================
-- 3. EXPLICIT FOREIGN KEYS & CHECK CONSTRAINTS
-- =====================================================

DO $$
BEGIN
    -- Ensure explicit PostgREST relationship names: orders_shipping_address_id_fkey
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'orders'
          AND constraint_name = 'orders_shipping_address_id_fkey'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_shipping_address_id_fkey
            FOREIGN KEY (shipping_address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_schema = 'public'
          AND table_name = 'orders'
          AND constraint_name = 'orders_billing_address_id_fkey'
    ) THEN
        ALTER TABLE public.orders
            ADD CONSTRAINT orders_billing_address_id_fkey
            FOREIGN KEY (billing_address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
    END IF;

    -- Safe Check Constraint Updates
    -- Payment Method Check
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
        CHECK (payment_method IN ('STRIPE', 'PAYPAL'));

    -- Payment Status Check
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
        CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'));

    -- Order Status Check
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
        CHECK (status IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'));

    -- User Role Check
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE public.users ADD CONSTRAINT users_role_check
        CHECK (role IN ('CUSTOMER', 'ADMIN'));

    -- Address Type Check
    ALTER TABLE public.addresses DROP CONSTRAINT IF EXISTS addresses_type_check;
    ALTER TABLE public.addresses ADD CONSTRAINT addresses_type_check
        CHECK (type IN ('SHIPPING', 'BILLING'));

    -- Event Status Check
    ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_status_check;
    ALTER TABLE public.events ADD CONSTRAINT events_status_check
        CHECK (status IN ('upcoming', 'past', 'cancelled'));
END $$;

-- =====================================================
-- 4. HIGH-PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_type ON public.addresses(type);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public.orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date DESC);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Products: Active products readable by all, Admin full management
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
CREATE POLICY "Public can view active products" ON public.products
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

-- Product Variants: Public readable
DROP POLICY IF EXISTS "Public can view product variants" ON public.product_variants;
CREATE POLICY "Public can view product variants" ON public.product_variants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
CREATE POLICY "Admins can manage product variants" ON public.product_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

-- Users: Self read/update, public insertion for signup/guest checkout
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (
        auth.uid()::text = id OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (
        auth.uid()::text = id OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "Allow user profile creation" ON public.users;
CREATE POLICY "Allow user profile creation" ON public.users
    FOR INSERT WITH CHECK (true);

-- Addresses: Allow creation during checkout, user and admin read/update
DROP POLICY IF EXISTS "Allow address creation" ON public.addresses;
CREATE POLICY "Allow address creation" ON public.addresses
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their addresses" ON public.addresses;
CREATE POLICY "Users can view their addresses" ON public.addresses
    FOR SELECT USING (
        auth.uid()::text = user_id OR user_id IS NULL OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
CREATE POLICY "Users can update their own addresses" ON public.addresses
    FOR UPDATE USING (
        auth.uid()::text = user_id OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

-- Carts & Cart Items
DROP POLICY IF EXISTS "Users can manage their own cart" ON public.carts;
CREATE POLICY "Users can manage their own cart" ON public.carts
    FOR ALL USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE id = cart_id AND user_id = auth.uid()::text
        )
    );

-- Orders: Support customer, guest checkout creation, and admin management
DROP POLICY IF EXISTS "Allow order creation" ON public.orders;
CREATE POLICY "Allow order creation" ON public.orders
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (
        auth.uid()::text = user_id OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

-- Order Items: Allow insertion during order placement
DROP POLICY IF EXISTS "Allow order items creation" ON public.order_items;
CREATE POLICY "Allow order items creation" ON public.order_items
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE id = order_id AND (user_id = auth.uid()::text OR EXISTS (
                SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
            ))
        )
    );

-- Events: Public view, Admin manage
DROP POLICY IF EXISTS "Public can view upcoming events" ON public.events;
CREATE POLICY "Public can view upcoming events" ON public.events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage events" ON public.events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

-- =====================================================
-- 6. AUTOMATED TIMESTAMP & TRIGGER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_carts_updated_at ON public.carts;
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON public.carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_addresses_updated_at ON public.addresses;
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. SEED STORE CATALOG DATA (USD)
-- =====================================================

-- Admin User (password: 'password')
INSERT INTO public.users (id, email, password, first_name, last_name, role, is_active)
VALUES (
    'admin_trendstore_001',
    'admin@trendstore.com',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Admin',
    'Trendstore',
    'ADMIN',
    true
)
ON CONFLICT (email) DO UPDATE SET
    role = 'ADMIN',
    is_active = true,
    updated_at = NOW();

-- Curated USD Electric Drift Trikes, Dirt Bikes, and Performance Gear
INSERT INTO public.products (
    id, name, description, price, original_price, sku, stock, category, brand, images, is_active, is_new, rating, reviews, shipping_required, average_delivery_time, weight, dimensions
)
VALUES
    (
        'prod_001',
        'Apex Pro 2000W Electric Drift Trike',
        'High-torque 2000W brushless rear hub motor with PVC drift sleeves, hydraulic disc brakes, 48V Samsung lithium pack, and variable drift angle control.',
        1499.00,
        1799.00,
        'TRK-APEX-2000',
        18,
        'trikes',
        'ApexMotors',
        ARRAY['https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&auto=format&fit=crop&q=70'],
        true,
        true,
        4.95,
        64,
        true,
        '3-5 business days',
        38.5,
        '140x95x65 cm'
    ),
    (
        'prod_002',
        'Stealth Vortex 3000W Drift Rig',
        'Dual-battery long-range 3000W performance rig with chromoly tubular chassis, instant torque delivery, regenerative braking, and digital telemetry dashboard.',
        2199.00,
        2499.00,
        'TRK-VORTEX-3000',
        12,
        'trikes',
        'VortexLabs',
        ARRAY['https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1558980664-3a031cf67ea8?w=900&auto=format&fit=crop&q=70'],
        true,
        true,
        4.98,
        82,
        true,
        '3-5 business days',
        42.0,
        '145x98x68 cm'
    ),
    (
        'prod_003',
        'EnduroCross 72V Electric Dirt Bike',
        'Ultra-lightweight 12kW peak electric dirt bike with inverted hydraulic front forks, multi-link rear monoshock, and 60-mile off-road trail endurance.',
        3499.00,
        3899.00,
        'DB-ENDURO-72V',
        9,
        'dirt bikes',
        'EnduroVolt',
        ARRAY['https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=900&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=900&auto=format&fit=crop&q=70'],
        true,
        false,
        4.90,
        51,
        true,
        '4-7 business days',
        56.0,
        '185x78x105 cm'
    ),
    (
        'prod_004',
        'HyperMini Track Edition E-Bike',
        'Compact 1500W pit bike engineered for urban track ripping, stunt agility, responsive throttle map, and quick-swap battery architecture.',
        1299.00,
        1499.00,
        'DB-HYPER-MINI',
        22,
        'dirt bikes',
        'EnduroVolt',
        ARRAY['https://images.unsplash.com/photo-1558980664-3a031cf67ea8?w=900&auto=format&fit=crop&q=70', 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=900&auto=format&fit=crop&q=70'],
        true,
        true,
        4.85,
        39,
        true,
        '3-5 business days',
        32.0,
        '130x65x85 cm'
    ),
    (
        'prod_005',
        'Ultra-Grip Heavy Duty Drift Sleeves (Pair)',
        'Replaceable heavy-duty 10mm high-density polymer drift sleeves designed for maximum slide slip and extended durability on asphalt and concrete.',
        79.00,
        99.00,
        'ACC-SLV-PAIR',
        85,
        'parts',
        'ApexMotors',
        ARRAY['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&auto=format&fit=crop&q=70'],
        true,
        false,
        4.80,
        114,
        true,
        '1-2 business days',
        3.2,
        '28x28x20 cm'
    ),
    (
        'prod_006',
        'Carbon Kevlar Full Face Motorsports Helmet',
        'DOT & ECE 22.06 certified aerodynamic carbon shell, emergency quick-release cheek pads, and integrated anti-fog pinlock visor for extreme drifting.',
        249.00,
        299.00,
        'ACC-HLM-CARBON',
        34,
        'gear',
        'ApexGear',
        ARRAY['https://images.unsplash.com/photo-1558981408-db0ecd8a1ee4?w=900&auto=format&fit=crop&q=70'],
        true,
        true,
        4.92,
        73,
        true,
        '2-3 business days',
        1.4,
        '35x26x27 cm'
    )
ON CONFLICT (sku) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    stock = EXCLUDED.stock,
    category = EXCLUDED.category,
    images = EXCLUDED.images,
    is_active = true,
    updated_at = NOW();

-- Sample upcoming events
INSERT INTO public.events (id, title, description, date, time, location, category, status)
VALUES
    (
        'evt_001',
        'National Drift Trike Invitational 2026',
        'Annual closed-circuit drift competition featuring pro electric trike racers, stunt exhibitions, and speed trials.',
        CURRENT_DATE + INTERVAL '14 days',
        '10:00 AM - 6:00 PM EST',
        'Apex Raceway, Orlando, FL',
        'race',
        'upcoming'
    ),
    (
        'evt_002',
        'Electric Dirt Bike Trail Jam',
        'All-day off-road group ride and endurance demonstration through technical forest trails and hill climbs.',
        CURRENT_DATE + INTERVAL '30 days',
        '9:00 AM - 4:00 PM PST',
        'Redwood Ridge Off-Road Park, CA',
        'trail',
        'upcoming'
    )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 8. PERMISSIONS GRANT
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

DO $$
BEGIN
    RAISE NOTICE 'Trendstore schema update migration applied successfully!';
END $$;

