import 'dotenv/config'
import { prisma } from '../database/client.js'

async function main() {
  const adminName = process.env.ADMIN_NAME || 'System Admin'
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@nidhirental.com').toLowerCase().trim()
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456'
  let adminPhone = process.env.ADMIN_PHONE?.trim() || '+919999999999'

  console.log('🌱 Starting database seed...')

  // Check if phone number is already registered to another user
  if (adminPhone) {
    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        phone: adminPhone,
        NOT: { email: adminEmail },
      },
    })

    if (existingPhoneUser) {
      console.warn(
        `⚠️  Warning: Phone ${adminPhone} is already in use by ${existingPhoneUser.email}. Leaving admin phone empty.`
      )
      adminPhone = null
    }
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      ...(adminPhone ? { phone: adminPhone } : {}),
    },
    create: {
      name: adminName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: adminPhone ? new Date() : null,
      onboardingCompletedAt: new Date(),
    },
  })

  console.log('✅ Admin user created/updated successfully:')
  console.log(`   ID:    ${admin.id}`)
  console.log(`   Name:  ${admin.name}`)
  console.log(`   Email: ${admin.email}`)
  console.log(`   Role:  ${admin.role}`)
  console.log(`   Phone: ${admin.phone ?? 'None'}`)
  console.log('-------------------------------------------')
  console.log('🔑 Login Credentials:')
  console.log(`   Email:    ${adminEmail}`)
  console.log(`   Password: ${adminPassword}`)
  console.log('-------------------------------------------')
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

