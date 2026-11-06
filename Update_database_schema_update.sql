-- =====================================================
-- Midget Micro Drives & Rides - Differential Database Schema Update
-- Incremental Schema Differences for Existing Supabase Tables
-- =====================================================
-- Run this script in the Supabase SQL Editor to bring any existing database
-- up to full production readiness with all latest features:
--  1. Orders: delivery estimate tracking, reason logging, China hub dispatch, pending reminder timestamp
--  2. Products: China store hub assignment, multi-video attachment arrays
--  3. Product Views / System Visits: item tracking with user profile, IP, browser, and China hub
--  4. China Multi-Store Hubs: Shenzhen, Guangzhou, Yiwu, Shanghai, Ningbo store network
--  5. System Events: real-time activity and SSE event log
--  6. Admin authorization: elevate admn@microdrivesmanager.shop
-- =====================================================

-- Ensure necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. EXTEND ORDERS TABLE
-- =====================================================
DO $$
BEGIN
    -- 1.1 Estimated delivery time
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'estimated_delivery_time'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN estimated_delivery_time TEXT DEFAULT '21-35 business days (Express Courier from China Hub)';
    END IF;

    -- 1.2 Reason for delivery time updates
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_update_reason'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_update_reason TEXT;
    END IF;

    -- 1.3 Timestamp when delivery estimate was last updated
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'delivery_updated_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN delivery_updated_at TIMESTAMPTZ;
    END IF;

    -- 1.4 China fulfillment hub location
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'store_location'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN store_location TEXT DEFAULT 'Shenzhen Technology & Electric Mobility Hub, China';
    END IF;

    -- 1.5 Timestamp when the 30-minute pending order payment reminder was dispatched
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'pending_reminder_sent_at'
    ) THEN
        ALTER TABLE public.orders ADD COLUMN pending_reminder_sent_at TIMESTAMPTZ;
    END IF;
END $$;

-- Update existing orders with default delivery estimate if empty
UPDATE public.orders
SET estimated_delivery_time = '21-35 business days (Express Courier from China Hub)'
WHERE estimated_delivery_time IS NULL;

UPDATE public.orders
SET store_location = 'Shenzhen Technology & Electric Mobility Hub, China'
WHERE store_location IS NULL;

-- =====================================================
-- 2. EXTEND PRODUCTS TABLE
-- =====================================================
DO $$
BEGIN
    -- 2.1 Store location hub in China
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'store_location'
    ) THEN
        ALTER TABLE public.products ADD COLUMN store_location TEXT DEFAULT 'Shenzhen Technology & Electric Mobility Hub, China';
    END IF;

    -- 2.2 Product video URLs array
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'videos'
    ) THEN
        ALTER TABLE public.products ADD COLUMN videos TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Ensure default China hub on all existing products
UPDATE public.products
SET store_location = 'Shenzhen Technology & Electric Mobility Hub, China'
WHERE store_location IS NULL OR store_location = '';

-- =====================================================
-- 3. CREATE PRODUCT VIEWS / SYSTEM VISITS TABLE
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_product_views_product_id ON public.product_views(product_id);
CREATE INDEX IF NOT EXISTS idx_product_views_user_id ON public.product_views(user_id);
CREATE INDEX IF NOT EXISTS idx_product_views_created_at ON public.product_views(created_at DESC);

-- Enable RLS for product_views
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

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

-- =====================================================
-- 4. CREATE CHINA MULTI-STORE HUBS TABLE
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_stores_city ON public.stores(city);
CREATE INDEX IF NOT EXISTS idx_stores_active ON public.stores(is_active);

-- Enable RLS for stores
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

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

-- Seed / Synchronize the 5 China Hubs
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

-- =====================================================
-- 5. CREATE SYSTEM EVENTS TABLE (Real-Time Activity Stream)
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_system_events_type ON public.system_events(type);
CREATE INDEX IF NOT EXISTS idx_system_events_created_at ON public.system_events(created_at DESC);

-- Enable RLS for system_events
ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view system events" ON public.system_events;
CREATE POLICY "Public can view system events" ON public.system_events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert system events" ON public.system_events;
CREATE POLICY "Public can insert system events" ON public.system_events
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 6. ENSURE ADMIN AUTHORIZATION FOR ADMN@MICRODRIVESMANAGER.SHOP
-- =====================================================
UPDATE public.users
SET role = 'ADMIN',
    is_active = true,
    updated_at = NOW()
WHERE email = 'admn@microdrivesmanager.shop';

-- Remove old trendstore admin user placeholder if present
DELETE FROM public.users
WHERE email = 'admin@trendstore.com' AND id = 'admin_trendstore_001';

-- =====================================================
-- 7. NOTIFICATION
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'Midget Micro Drives & Rides differential schema update applied successfully!';
END $$;

