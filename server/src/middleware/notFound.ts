import { Request, Response, NextFunction } from 'express'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  // Enhanced logging for debugging /api/events requests
  if (req.originalUrl.startsWith('/api/events')) {
    console.log('=== EVENTS API REQUEST DEBUG ===')
    console.log(`URL: ${req.originalUrl}`)
    console.log(`Method: ${req.method}`)
    console.log(`User-Agent: ${req.get('User-Agent') || 'Not provided'}`)
    console.log(`Referer: ${req.get('Referer') || 'Not provided'}`)
    console.log(`Origin: ${req.get('Origin') || 'Not provided'}`)
    console.log(`IP: ${req.ip}`)
    console.log(`Timestamp: ${new Date().toISOString()}`)
    console.log('=== END DEBUG ===')
  }

  const error = new Error(`Not found - ${req.originalUrl}`)
  res.status(404)
  next(error)
}