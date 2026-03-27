import pg from 'pg'

const { Client } = pg

const client = new Client({
  connectionString: 'postgresql://postgres:admin@localhost:5432/vault-db',
})

const VALID_STATUSES = ['pending', 'confirmed', 'processing', 'completed', 'refunded', 'review_needed']

const REMAP = {
  awaiting_fiat: 'pending',
  awaiting_crypto: 'pending',
  awaiting_payment: 'pending',
  fiat_received: 'processing',
  crypto_received: 'processing',
  fiat_sent: 'completed',
  crypto_sent: 'completed',
  failed: 'review_needed',
  dispute: 'review_needed',
}

async function run() {
  await client.connect()
  console.log('Connected to database')

  try {
    await client.query('BEGIN')

    // Step 1: Remove enum constraint by casting to text
    console.log('Step 1: Casting status column to text...')
    await client.query(`ALTER TABLE transactions ALTER COLUMN status TYPE text`)

    // Step 2: Remap old values
    for (const [oldVal, newVal] of Object.entries(REMAP)) {
      const result = await client.query(
        `UPDATE transactions SET status = $1 WHERE status = $2`,
        [newVal, oldVal]
      )
      if (result.rowCount > 0) {
        console.log(`  Remapped ${result.rowCount} rows: "${oldVal}" → "${newVal}"`)
      }
    }

    // Step 3: Catch-all for any unrecognised values
    const catchAll = await client.query(
      `UPDATE transactions SET status = 'pending' WHERE status != ALL($1::text[])`,
      [VALID_STATUSES]
    )
    if (catchAll.rowCount > 0) {
      console.log(`  Reset ${catchAll.rowCount} unrecognised status rows to "pending"`)
    }

    // Step 4: Drop the old enum type so Payload can recreate it cleanly
    console.log('Step 4: Dropping old enum type...')
    await client.query(`DROP TYPE IF EXISTS "public"."enum_transactions_status"`)

    await client.query('COMMIT')
    console.log('\n✅ Migration complete. Restart the dev server — Payload will recreate the enum.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Migration failed, rolled back:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

run()
