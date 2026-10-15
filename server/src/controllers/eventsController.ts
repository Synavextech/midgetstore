import { Request, Response } from 'express'
import { Event, EventsQuery, EventsResponse } from '../types/events.js'

// Mock events data
const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Summer Sale Event',
    description: 'Big summer sale with up to 50% off on all items',
    date: '2024-07-15',
    time: '10:00',
    location: 'Main Store',
    category: 'sale',
    status: 'past',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z'
  },
  {
    id: '2',
    title: 'New Product Launch',
    description: 'Launch event for our new product line',
    date: '2024-08-20',
    time: '14:00',
    location: 'Convention Center',
    category: 'launch',
    status: 'past',
    createdAt: '2024-07-01T00:00:00Z',
    updatedAt: '2024-07-01T00:00:00Z'
  },
  {
    id: '3',
    title: 'Holiday Special Event',
    description: 'Special holiday event with exclusive deals',
    date: '2024-12-20',
    time: '11:00',
    location: 'Main Store',
    category: 'holiday',
    status: 'upcoming',
    createdAt: '2024-11-01T00:00:00Z',
    updatedAt: '2024-11-01T00:00:00Z'
  },
  {
    id: '4',
    title: 'Black Friday Sale',
    description: 'Biggest sale of the year - Black Friday specials',
    date: '2024-11-29',
    time: '00:01',
    location: 'Online & Store',
    category: 'sale',
    status: 'upcoming',
    createdAt: '2024-10-01T00:00:00Z',
    updatedAt: '2024-10-01T00:00:00Z'
  },
  {
    id: '5',
    title: 'Customer Appreciation Day',
    description: 'Thank you event for our loyal customers',
    date: '2024-10-30',
    time: '13:00',
    location: 'Main Store',
    category: 'appreciation',
    status: 'upcoming',
    createdAt: '2024-09-15T00:00:00Z',
    updatedAt: '2024-09-15T00:00:00Z'
  }
]

export const getEvents = (req: Request, res: Response) => {
  try {
    const query = req.query as EventsQuery
    const { view, category, limit = 10, offset = 0 } = query

    let filteredEvents = [...mockEvents]

    // Filter by view (upcoming, past, or all)
    if (view) {
      const currentDate = new Date()
      switch (view.toLowerCase()) {
        case 'upcoming':
          filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(`${event.date}T${event.time}`)
            return eventDate > currentDate && event.status === 'upcoming'
          })
          break
        case 'past':
          filteredEvents = filteredEvents.filter(event => {
            const eventDate = new Date(`${event.date}T${event.time}`)
            return eventDate < currentDate || event.status === 'past'
          })
          break
        case 'all':
        default:
          // Return all events
          break
      }
    }

    // Filter by category
    if (category) {
      filteredEvents = filteredEvents.filter(event =>
        event.category.toLowerCase() === category.toLowerCase()
      )
    }

    // Apply pagination
    const startIndex = parseInt(offset.toString())
    const endIndex = startIndex + parseInt(limit.toString())
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex)

    const response: EventsResponse = {
      events: paginatedEvents,
      total: filteredEvents.length,
      hasMore: endIndex < filteredEvents.length
    }

    res.json(response)
  } catch (error) {
    console.error('Error fetching events:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export const getEventById = (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const event = mockEvents.find(e => e.id === id)

    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    res.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}