-- =====================================================
-- Midget Micro Drives & Rides - Supabase Database Configuration & Initialization Script
-- Production-Ready Schema with Full RLS & USD Motorsport Catalog
-- =====================================================
-- Safe to execute directly in the Supabase SQL Editor.

-- Enable cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. PRODUCTION TABLES CREATION
-- =====================================================

-- Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    role TEXT CHECK (role IN ('CUSTOMER', 'ADMIN')) DEFAULT 'CUSTOMER',
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
    videos TEXT[] DEFAULT '{}',
    category TEXT NOT NULL,
    brand TEXT,
    is_active BOOLEAN DEFAULT true,
    is_new BOOLEAN DEFAULT false,
    shipping_required BOOLEAN DEFAULT true,
    average_delivery_time TEXT DEFAULT '21-35 business days',
    store_location TEXT DEFAULT 'Shenzhen Technology & Electric Mobility Hub, China',
    weight DECIMAL(8,2),
    dimensions TEXT,
    rating DECIMAL(3,2) DEFAULT 4.90,
    reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variants Table (colors, power modes, battery sizes)
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

-- Addresses Table (shipping and billing)
CREATE TABLE IF NOT EXISTS public.addresses (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('SHIPPING', 'BILLING')) NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    company TEXT,
    address1 TEXT NOT NULL,
    address2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
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
    status TEXT CHECK (status IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')) DEFAULT 'PENDING',
    total DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) DEFAULT 0,
    shipping DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT CHECK (payment_method IN ('STRIPE', 'PAYPAL')) NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')) DEFAULT 'PENDING',
    payment_id TEXT,
    shipping_address_id TEXT REFERENCES public.addresses(id),
    billing_address_id TEXT REFERENCES public.addresses(id),
    estimated_delivery_time TEXT DEFAULT '21-35 business days (Express Courier from China Hub)',
    delivery_update_reason TEXT,
    delivery_updated_at TIMESTAMPTZ,
    store_location TEXT DEFAULT 'Shenzhen Technology & Electric Mobility Hub, China',
    pending_reminder_sent_at TIMESTAMPTZ,
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

-- System Visits & Product Views Table (Item viewing audit log)
CREATE TABLE IF NOT EXISTS public.product_views (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    product_sku TEXT,
    product_price DECIMAL(10,2),
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    store_location TEXT DEFAULT 'Shenzhen Technology & Electric Mobility Hub, China',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- China Multi-Store Hubs Table (Fulfillment & showroom network)
CREATE TABLE IF NOT EXISTS public.stores (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    province TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'China',
    address TEXT NOT NULL,
    district TEXT,
    postal_code TEXT,
    phone TEXT,
    email TEXT,
    hub_type TEXT NOT NULL,
    is_headquarters BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 1,
    specialties TEXT[] DEFAULT '{}',
    dispatch_lead_time TEXT DEFAULT '24-48 hours',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-Time System Activity & Event Stream Table
CREATE TABLE IF NOT EXISTS public.system_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    user_id TEXT,
    user_email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
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
    status TEXT CHECK (status IN ('upcoming', 'past', 'cancelled')) DEFAULT 'upcoming',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ENSURE MISSING COLUMNS (Idempotent updates)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'original_price') THEN
        ALTER TABLE public.products ADD COLUMN original_price DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'rating') THEN
        ALTER TABLE public.products ADD COLUMN rating DECIMAL(3,2) DEFAULT 4.90;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'reviews') THEN
        ALTER TABLE public.products ADD COLUMN reviews INTEGER DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- 3. HIGH-PERFORMANCE INDEXES
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
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON public.product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created_at ON public.product_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stores_city ON public.stores(city);
CREATE INDEX IF NOT EXISTS idx_stores_active ON public.stores(is_active);
CREATE INDEX IF NOT EXISTS idx_system_events_type ON public.system_events(type);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

-- Products: Public read active items, Admins manage all
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

-- Product Variants: Public read, Admins manage
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

-- Users: Users can read/update their own profile, Admins full access
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

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users
    FOR INSERT WITH CHECK (true);

-- Carts: Users manage their own cart
DROP POLICY IF EXISTS "Users can manage their own cart" ON public.carts;
CREATE POLICY "Users can manage their own cart" ON public.carts
    FOR ALL USING (auth.uid()::text = user_id);

-- Cart Items: Users manage their own cart items
DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.carts
            WHERE id = cart_id AND user_id = auth.uid()::text
        )
    );

-- Addresses: Users manage their own addresses
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
CREATE POLICY "Users can manage their own addresses" ON public.addresses
    FOR ALL USING (auth.uid()::text = user_id);

-- Orders: Users view/create their orders, Admins manage all
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (
        auth.uid()::text = user_id OR EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
CREATE POLICY "Admins can manage all orders" ON public.orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
    );

-- Order Items
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

-- Product Views: Anyone can insert view logs, Admins can view
DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;
CREATE POLICY "Anyone can insert product views" ON public.product_views
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view product views" ON public.product_views;
CREATE POLICY "Admins can view product views" ON public.product_views
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
        OR auth.role() = 'service_role'
    );

-- Stores: Public can view active stores, Admins manage all
DROP POLICY IF EXISTS "Public can view active stores" ON public.stores;
CREATE POLICY "Public can view active stores" ON public.stores
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage stores" ON public.stores;
CREATE POLICY "Admins can manage stores" ON public.stores
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()::text AND role = 'ADMIN'
        )
        OR auth.role() = 'service_role'
    );

-- System Events: Public can view and log activity events
DROP POLICY IF EXISTS "Public can view system events" ON public.system_events;
CREATE POLICY "Public can view system events" ON public.system_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert system events" ON public.system_events;
CREATE POLICY "Public can insert system events" ON public.system_events
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 5. AUTOMATED TIMESTAMP & TRIGGER FUNCTIONS
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

-- =====================================================
-- 6. PRODUCTION SEED DATA (USD STORE CATALOG)
-- =====================================================

-- Admin User (configured via create_admin.js or default seed)
INSERT INTO public.users (id, email, password, first_name, last_name, role, is_active)
VALUES (
    'b518b03e-b64d-4939-848f-176d9d0ca16b',
    'admn@microdrivesmanager.shop',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Admin',
    'Manager',
    'ADMIN',
    true
)
ON CONFLICT (email) DO UPDATE SET
    role = 'ADMIN',
    is_active = true,
    updated_at = NOW();

-- China Multi-Store Hubs Seed
INSERT INTO public.stores (
    id, name, city, province, country, address, district, postal_code,
    phone, email, hub_type, is_headquarters, is_active, display_order,
    specialties, dispatch_lead_time
) VALUES
(
    'store_shenzhen_hq',
    'Shenzhen Technology & Electric Mobility Hub',
    'Shenzhen',
    'Guangdong Province',
    'China',
    'Building 4, High-Tech Industrial Park South, Yuehai Subdistrict',
    'Nanshan District',
    '518057',
    '+86 755 8670 9188',
    'shenzhen.hub@microdrivesmanager.shop',
    'headquarters_and_fulfillment',
    true,
    true,
    1,
    ARRAY['Brushless Powertrains', 'Drift Trikes', 'BMS Testing', 'Global Air Freight'],
    '12-24 hours'
),
(
    'store_guangzhou_mfg',
    'Guangzhou Motor & Chassis Integration Center',
    'Guangzhou',
    'Guangdong Province',
    'China',
    'No. 88 Huadu Advanced Manufacturing Industrial Zone',
    'Huadu District',
    '510800',
    '+86 20 8697 5320',
    'guangzhou.hub@microdrivesmanager.shop',
    'assembly_and_customization',
    false,
    true,
    2,
    ARRAY['Heavy Frame Fabrication', 'Custom Suspension', 'Motor Rewinding', 'Export QC'],
    '24-48 hours'
),
(
    'store_yiwu_parts',
    'Yiwu Fast-Dispatch & Accessories Center',
    'Yiwu',
    'Zhejiang Province',
    'China',
    'Block B, Yiwu International Logistics Park, Chouzhou North Road',
    'Choucheng Subdistrict',
    '322000',
    '+86 579 8558 7411',
    'yiwu.hub@microdrivesmanager.shop',
    'parts_and_accessories_dispatch',
    false,
    true,
    3,
    ARRAY['Replacement Batteries', 'Slick Drift Sleeves', 'LED Kits', 'Rapid Courier'],
    '12-24 hours'
),
(
    'store_shanghai_rnd',
    'Shanghai Performance Engineering & QC Hub',
    'Shanghai',
    'Shanghai Municipality',
    'China',
    'Building 12, Pudong Jinqiao Export Processing Zone',
    'Pudong New Area',
    '201206',
    '+86 21 5834 6629',
    'shanghai.hub@microdrivesmanager.shop',
    'quality_control_and_testing',
    false,
    true,
    4,
    ARRAY['Dyno Stress Testing', 'Telemetry Calibration', 'High-Voltage Safety Certification'],
    '24-36 hours'
),
(
    'store_ningbo_marine',
    'Ningbo Marine Port & Heavy Freight Terminal',
    'Ningbo',
    'Zhejiang Province',
    'China',
    'No. 168 Baoguan Road, Beilun Deep-Water Port Logistics Center',
    'Beilun District',
    '315800',
    '+86 574 8678 4402',
    'ningbo.hub@microdrivesmanager.shop',
    'container_freight_and_sea_shipping',
    false,
    true,
    5,
    ARRAY['Full-Rig Crating', 'Ocean Cargo Consolidation', 'Bulk Palletized Freight'],
    '48-72 hours'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    city = EXCLUDED.city,
    province = EXCLUDED.province,
    address = EXCLUDED.address,
    district = EXCLUDED.district,
    postal_code = EXCLUDED.postal_code,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    hub_type = EXCLUDED.hub_type,
    is_headquarters = EXCLUDED.is_headquarters,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order,
    specialties = EXCLUDED.specialties,
    dispatch_lead_time = EXCLUDED.dispatch_lead_time,
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

-- =====================================================
-- 7. PERMISSIONS & CONFIRMATION
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

DO $$
BEGIN
    RAISE NOTICE 'Midget Micro Drives & Rides USD database configuration applied successfully!';
    RAISE NOTICE 'Tables active: users, products, product_variants, carts, cart_items, addresses, orders, order_items, product_views, stores, system_events';
    RAISE NOTICE 'Store Currency: USD ($)';
END $$;
