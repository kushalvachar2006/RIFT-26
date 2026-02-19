/**
 * Sample transaction generator for DEMO
 * Creates realistic transaction data with fraud patterns
 * Columns: transaction_id, source_account, destination_account, amount, timestamp
 */

function pad(n, len = 4) {
  return String(n).padStart(len, '0')
}

export function generateSampleCSV() {
  const now = Date.now()
  const rows = ['transaction_id,source_account,destination_account,amount,timestamp']
  let txIdx = 0

  const push = (source, destination, amount, offsetMs) => {
    const ts = new Date(now - offsetMs).toISOString().replace('T', ' ').slice(0, 19)
    rows.push(`TXN_${pad(txIdx++, 6)},${source},${destination},${amount.toFixed(2)},${ts}`)
  }

  const rnd = (min, max) => Math.random() * (max - min) + min
  const pick = arr => arr[Math.floor(Math.random() * arr.length)]

  // Account pools - simplified for demo
  const accounts = Array.from({ length: 50 }, (_, i) => `ACC_${pad(i + 1, 4)}`)
  
  // 1. Create a fraud ring (circular pattern) - 5 accounts
  const fraudRing = ['ACC_0001', 'ACC_0002', 'ACC_0003', 'ACC_0004', 'ACC_0005']
  for (let cycle = 0; cycle < 10; cycle++) {
    for (let i = 0; i < fraudRing.length; i++) {
      const source = fraudRing[i]
      const destination = fraudRing[(i + 1) % fraudRing.length]
      push(source, destination, rnd(8000, 12000), rnd(0, 7) * 86400000)
    }
  }

  // 2. High velocity transactions (rapid fire from one account)
  const highVelocity = 'ACC_0010'
  for (let i = 0; i < 30; i++) {
    const dest = pick(accounts)
    if (dest !== highVelocity) {
      push(highVelocity, dest, rnd(1000, 5000), i * 600000) // Every 10 minutes
    }
  }

  // 3. Fan-out pattern (one account sends to many)
  const fanOut = 'ACC_0020'
  for (let i = 0; i < 15; i++) {
    const dest = `ACC_${pad(30 + i, 4)}`
    push(fanOut, dest, rnd(7000, 9999), rnd(0, 2) * 86400000)
  }

  // 4. Pass-through accounts (shell accounts)
  const shell1 = 'ACC_0045'
  const shell2 = 'ACC_0046'
  for (let i = 0; i < 10; i++) {
    push(pick(accounts), shell1, rnd(5000, 8000), rnd(0, 5) * 86400000)
    push(shell1, shell2, rnd(4900, 7900), rnd(0, 5) * 86400000)
    push(shell2, fanOut, rnd(4800, 7800), rnd(0, 5) * 86400000)
  }

  // 5. Normal legitimate transactions (filler)
  for (let i = 0; i < 200; i++) {
    let source = pick(accounts)
    let destination = pick(accounts)
    while (destination === source) {
      destination = pick(accounts)
    }
    push(source, destination, rnd(100, 5000), rnd(0, 30) * 86400000)
  }

  return rows.join('\n')
}
