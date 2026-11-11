import 'dotenv/config'
import { Files } from 'files-sdk'
import { neon } from 'files-sdk/neon'

async function testStorage() {
  const bucketName = 'uploads'
  console.log(`Initializing Files SDK with Neon bucket: "${bucketName}"...`)

  const files = new Files({
    adapter: neon({
      bucket: bucketName,
    }),
  })

  const testKey = `test-${Date.now()}.txt`
  const testContent = `Hello Neon Object Storage! Test file created at ${new Date().toISOString()}`

  console.log(`1. Uploading file "${testKey}"...`)
  await files.upload(testKey, testContent, {
    contentType: 'text/plain',
  })
  console.log(`   Upload successful!`)

  console.log('2. Listing bucket contents...')
  const listResult = await files.list()
  console.log(`   Found ${listResult.items.length} items in bucket "${bucketName}":`)
  for (const item of listResult.items) {
    const modDate = item.lastModified ? new Date(item.lastModified).toISOString() : 'N/A'
    console.log(`   - Key: ${item.key} | Size: ${item.size} bytes | Modified: ${modDate}`)
  }

  console.log(`3. Reading back file "${testKey}"...`)
  const downloadedFile = await files.download(testKey)
  const fileContent = await downloadedFile.text()
  console.log(`   Read successful!`)
  console.log('4. File contents:')
  console.log('--------------------------------------------------')
  console.log(fileContent)
  console.log('--------------------------------------------------')
}

testStorage().catch((err) => {
  console.error('Storage test failed:', err)
  process.exit(1)
})
