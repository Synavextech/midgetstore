import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const { Client } = pg
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzaWJjeXp6dnFodG1ncHZxYW1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2NTY5NjMsImV4cCI6MjEwMDIzMjk2M30.nYZt-Z7wb7W3Fx2Lxx44Fxk6XL3II_LlAjcsCJndLJw'

async function seed() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('Connected to PostgreSQL for catalog seeding.')

  const res = await fetch('https://xsibcyzzvqhtmgpvqama.supabase.co/rest/v1/products?select=*', {
    headers: { apikey: key, Authorization: 'Bearer ' + key }
  })
  const sourceProducts = await res.json()
  console.log(`Fetched ${sourceProducts.length} products from edrifttrikes.shop.`)

  // Remove old mock sample products
  await client.query("DELETE FROM public.products WHERE id LIKE 'prod_%'")

  for (const sp of sourceProducts) {
    const slug = sp.slug
    let localImg = ''
    const ext = path.extname(sp.hero_image ? sp.hero_image.split('?')[0] : '') || '.webp'
    const filename = slug + ext
    if (fs.existsSync(path.join('client/public/images', filename))) {
      localImg = '/images/' + filename
    }

    let cat = 'trikes'
    const lowerName = sp.name.toLowerCase()
    if (lowerName.includes('dirt bike') || lowerName.includes('bike') || lowerName.includes('motorcycle')) {
      cat = 'dirt bikes'
    } else if (lowerName.includes('kart') || lowerName.includes('buggy') || lowerName.includes('jeep')) {
      cat = 'go karts'
    } else if (lowerName.includes('scooter') || lowerName.includes('atv')) {
      cat = 'scooters'
    } else if (lowerName.includes('trike') || lowerName.includes('drift')) {
      cat = 'trikes'
    }

    const imagesList = localImg ? [localImg] : []
    // Enrich with updated sample images from /public/images
    if (lowerName.includes('4-seater') || lowerName.includes('4-seat')) {
      imagesList.unshift('/images/200cc 4-Seater Off-Road Go Kart 1 - $550.webp')
      imagesList.push('/images/200cc 4-Seater Off-Road Go Kart 3 - $550.webp.webp')
    } else if (lowerName.includes('gc2009')) {
      imagesList.unshift('/images/GC2009 Off-Road Go Kart - $1200.webp')
      imagesList.push('/images/GC2009 Off-Road Go Kart 2 - $1200.webp')
    } else if (lowerName.includes('60v electric dirt bike')) {
      imagesList.unshift('/images/b1-$250.webp')
    } else if (lowerName.includes('125cc dirt bike')) {
      imagesList.unshift('/images/b2 - $400.webp')
    } else if (lowerName.includes('x26 3000w')) {
      imagesList.unshift('/images/b3 $ 400.webp')
    } else if (lowerName.includes('6000w electric dirt bike')) {
      imagesList.unshift('/images/b5 - $280.webp')
    } else if (lowerName.includes('drift kart') || lowerName.includes('drift go kart')) {
      imagesList.push('/images/mm1.webp', '/images/mm2.webp')
    }

    // Fallback if no images found
    if (imagesList.length === 0) {
      imagesList.push('/images/hero1.jpeg')
    }

    const price = sp.price_cents ? sp.price_cents / 100 : 399.0
    const origPrice = sp.compare_at_cents ? sp.compare_at_cents / 100 : Math.round(price * 1.25)
    const sku = 'MMR-' + slug.substring(0, 16).toUpperCase()
    const stock = sp.stock || 25
    const rating = parseFloat((4.85 + Math.random() * 0.14).toFixed(2))
    const reviews = Math.floor(18 + Math.random() * 95)

    const queryText = `
      INSERT INTO public.products (
        id, name, description, price, original_price, sku, stock, category, brand, images,
        is_active, is_new, rating, reviews, shipping_required, average_delivery_time, weight, dimensions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (sku) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        original_price = EXCLUDED.original_price,
        stock = EXCLUDED.stock,
        category = EXCLUDED.category,
        brand = EXCLUDED.brand,
        images = EXCLUDED.images,
        is_active = true,
        updated_at = NOW()
    `

    await client.query(queryText, [
      sp.id,
      sp.name,
      sp.description || sp.tagline || 'High-performance ride engineered by Midget Micro Drive & Rides. Built with reinforced chassis and precision motor tuning.',
      price,
      origPrice,
      sku,
      stock,
      cat,
      'Midget Micro Drive & Rides',
      imagesList,
      true,
      sp.is_new || sp.badge === 'NEW',
      rating,
      reviews,
      true,
      '2-4 business days (US Texas Depot)',
      sp.top_speed ? parseFloat(sp.top_speed) || 45.0 : 40.0,
      sp.range_miles ? 'Range: ' + sp.range_miles : 'Range: 60-80 km'
    ])
  }

  const countRes = await client.query('SELECT count(*) FROM public.products')
  console.log(`✅ Successfully seeded catalog! Total products in DB: ${countRes.rows[0].count}`)
  await client.end()
}

seed().catch(err => {
  console.error('Seeding error:', err)
  process.exit(1)
})
