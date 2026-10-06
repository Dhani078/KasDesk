/**
 * Test Smart Split-Bill Algorithm & Zero-Difference Rounding.
 * Run: node scripts/test-split-bill.js
 */
const { calculateSplitBill, generateWhatsAppSettlementMessage } = require('../lib/split-bill')

let pass = 0
let fail = 0
const check = (name, cond, details = '') => {
  if (cond) {
    pass++
    console.log(`  PASS  ${name}`)
  } else {
    fail++
    console.log(`  FAIL  ${name} ${details ? '-> ' + details : ''}`)
  }
}

console.log('=== Smart Split-Bill & Proportional Tax Distribution Tests ===')

// 1. Zero members
const r0 = calculateSplitBill({ title: 'Kosong', members: [], items: [] })
check('zero members handled gracefully', r0.grandTotal === 0 && r0.memberBreakdowns.length === 0)

// 2. Proportional tax distribution (Steak & Pasta)
const members = [
  { id: 'm1', name: 'Budi' },
  { id: 'm2', name: 'Siti' },
]
const items = [
  { id: 'i1', name: 'Sirloin Steak', price: 80000, quantity: 1, assignedMemberIds: ['m1'] },
  { id: 'i2', name: 'Carbonara Pasta', price: 40000, quantity: 1, assignedMemberIds: ['m2'] },
]

const r2 = calculateSplitBill({
  title: 'Makan Malam',
  members,
  items,
  taxAmount: 12000,   // 10%
  serviceAmount: 6000, // 5%
})

check('subtotal matches items sum (120.000)', r2.subtotal === 120000)
check('grand total matches with tax and service (138.000)', r2.grandTotal === 138000)

const budi = r2.memberBreakdowns.find((m) => m.memberId === 'm1')
const siti = r2.memberBreakdowns.find((m) => m.memberId === 'm2')

// Budi ordered 80k (66.67%), Siti ordered 40k (33.33%)
check('Budi subtotal is 80.000', budi.subtotal === 80000)
check('Budi tax share is 8.000 (2/3 of 12k)', budi.taxShare === 8000)
check('Budi service share is 4.000 (2/3 of 6k)', budi.serviceShare === 4000)
check('Budi total due is 92.000', budi.totalDue === 92000)

check('Siti subtotal is 40.000', siti.subtotal === 40000)
check('Siti tax share is 4.000 (1/3 of 12k)', siti.taxShare === 4000)
check('Siti service share is 2.000 (1/3 of 6k)', siti.serviceShare === 2000)
check('Siti total due is 46.000', siti.totalDue === 46000)

// 3. Mathematical invariant: sum(member.totalDue) === grandTotal
const sumDue = r2.memberBreakdowns.reduce((acc, m) => acc + m.totalDue, 0)
check('sum of member dues exactly matches grand total (0 Rp diff)', sumDue === r2.grandTotal)

// 4. Shared item split (3 members sharing 10.000 snack with 11% PB1)
const members3 = [
  { id: 'a', name: 'Andi' },
  { id: 'b', name: 'Bayu' },
  { id: 'c', name: 'Cici' },
]
const sharedItems = [
  { id: 's1', name: 'Kentang Goreng', price: 10000, quantity: 1, assignedMemberIds: [] }, // shared all
]
const r3 = calculateSplitBill({
  title: 'Nongkrong Cafe',
  members: members3,
  items: sharedItems,
  taxAmount: 1100, // 11% of 10.000
})

const sumDue3 = r3.memberBreakdowns.reduce((acc, m) => acc + m.totalDue, 0)
check('shared items with odd rounding reconcile to exact grand total', sumDue3 === r3.grandTotal)

// 5. WhatsApp message generation
const waMsg = generateWhatsAppSettlementMessage(budi, 'Makan Malam', 'BCA: 123456 a.n KasDesk')
check('WhatsApp message contains participant greeting', waMsg.includes('Halo Budi!'))
check('WhatsApp message contains total due', waMsg.includes('92.000'))
check('WhatsApp message includes payment details', waMsg.includes('BCA: 123456'))

console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
process.exit(fail ? 1 : 0)
