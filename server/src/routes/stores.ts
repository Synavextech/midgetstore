import express from 'express'
import { CHINA_STORES, getDefaultStore, getStoreById } from '../utils/stores.js'

const router = express.Router()

// GET /api/stores - List all China stores/warehouses
router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    data: CHINA_STORES,
    count: CHINA_STORES.length,
    defaultStore: getDefaultStore()
  })
})

// GET /api/stores/:id - Get specific China store
router.get('/:id', (req, res) => {
  const store = getStoreById(req.params.id)
  res.status(200).json({
    success: true,
    data: store
  })
})

export default router

