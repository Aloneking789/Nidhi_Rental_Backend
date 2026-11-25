import { prisma } from '../database/client.js'

const expoPushUrl = 'https://exp.host/--/api/v2/push/send'

async function sendToDevices(devices, { title, body, data }) {
  let accepted = 0
  for (let offset = 0; offset < devices.length; offset += 100) {
    const batch = devices.slice(offset, offset + 100)
    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batch.map((device) => ({
        to: device.pushToken,
        title,
        body,
        sound: 'default',
        data,
      }))),
    })

    if (!response.ok) {
      throw new Error(`Expo push service returned HTTP ${response.status}: ${await response.text()}`)
    }

    const result = await response.json()
    if (!Array.isArray(result.data) || result.data.length !== batch.length) {
      throw new Error('Expo push service returned an unexpected ticket response')
    }

    const failures = []
    for (const [index, ticket] of result.data.entries()) {
      if (ticket?.status === 'ok') {
        accepted += 1
      } else if (ticket?.status === 'error') {
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await prisma.device.update({
            where: { id: batch[index].id },
            data: { isActive: false },
          })
        }
        failures.push(ticket.message || 'Unknown Expo push error')
      } else {
        failures.push('Expo push service returned an invalid ticket')
      }
    }

    if (failures.length) {
      throw new Error(`Expo push delivery failed: ${failures.join('; ')}`)
    }
  }
  return accepted
}

export async function sendPushNotification(userId, notification) {
  const devices = await prisma.device.findMany({
    where: { userId, isActive: true, pushToken: { not: null } },
    select: { id: true, pushToken: true },
  })

  return sendToDevices(devices, notification)
}

export async function sendBroadcastPushNotification(notification) {
  const devices = await prisma.device.findMany({
    where: {
      isActive: true,
      pushToken: { not: null },
      user: { is: { role: 'USER', status: 'ACTIVE' } },
    },
    select: { id: true, pushToken: true },
  })

  return sendToDevices(devices, notification)
}
