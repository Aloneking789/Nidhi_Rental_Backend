import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../database/client.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()
const supportCategories = ['BOOKING', 'PAYMENT', 'VEHICLE', 'DRIVER', 'REFUND', 'ACCOUNT', 'OTHER']

router.post('/', requireAuth, async (req, res) => {
  const request = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {}
  const { bookingId, subject, message, category = 'OTHER' } = request

  if (typeof subject !== 'string' || !subject.trim() || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'subject and message are required' })
  }
  if (!supportCategories.includes(category)) {
    return res.status(400).json({ message: 'Invalid support ticket category' })
  }
  if (bookingId !== undefined && bookingId !== null && typeof bookingId !== 'string') {
    return res.status(400).json({ message: 'bookingId must be a string' })
  }

  const normalizedBookingId = typeof bookingId === 'string' ? bookingId.trim() : null
  if (normalizedBookingId) {
    const booking = await prisma.booking.findFirst({
      where: { id: normalizedBookingId, userId: req.user.id },
      select: { id: true },
    })
    if (!booking) return res.status(404).json({ message: 'Booking not found' })
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      ticketNumber: `ST-${randomUUID().slice(0, 8).toUpperCase()}`,
      userId: req.user.id,
      bookingId: normalizedBookingId,
      category,
      subject: subject.trim(),
      message: message.trim(),
    },
    include: {
      booking: { select: { id: true, bookingNumber: true, status: true } },
    },
  })

  return res.status(201).json({ ticket })
})

router.get('/mine', requireAuth, async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user.id },
    include: {
      booking: { select: { id: true, bookingNumber: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return res.json({ tickets })
})

export default router
