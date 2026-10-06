/**
 * Test Bank Statement & E-Wallet Mutasi Parser Engine (PRD v2.0 §3.4).
 * Run: node scripts/test-statement-parser.js
 */
const { parseBankStatement, autoCategorizeTitle, deduplicateAgainstExisting } = require('../lib/importer/statement-parser')

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

console.log('=== Bank Statement & Mutasi Parser Tests ===')

// 1. Auto-categorization heuristics
check('categorizes INDOMARET as BELANJA', autoCategorizeTitle('QRIS INDOMARET TENGGARONG', 'expense') === 'BELANJA')
check('categorizes SPBU as TRANSPORT', autoCategorizeTitle('DEBIT SPBU PERTAMINA 34', 'expense') === 'TRANSPORT')
check('categorizes PLN as TAGIHAN', autoCategorizeTitle('BAYAR TAGIHAN LISTRIK PLN', 'expense') === 'TAGIHAN')
check('categorizes RESTO as MAKAN', autoCategorizeTitle('WARUNG BAKSO RUDAL JAYA', 'expense') === 'MAKAN')
check('categorizes SALARY as GAJI', autoCategorizeTitle('TRSF PAYROLL SALARY PT ABC', 'income') === 'GAJI')

// 2. KlikBCA / myBCA CSV sample
const bcaCsv = `
TANGGAL,KETERANGAN,CABANG,JUMLAH,TIPE,SALDO
01/10/2026,TRSF E-BANKING DB 0110/FTSCY/WS95011 25.000,0000,25000,DB,5000000
02/10/2026,QRIS INDOMARET 0210/FTSCY/WS95011,0000,45000,DB,4955000
03/10/2026,TRSF DARI SITI AMALIA SALDO MASUK,0000,200000,CR,5155000
`
const bcaRows = parseBankStatement(bcaCsv)
check('parses 3 BCA statement rows', bcaRows.length === 3)
check('BCA row 1 has correct amount 25.000', bcaRows[0].amount === 25000)
check('BCA row 1 type is expense', bcaRows[0].type === 'expense')
check('BCA row 2 category is BELANJA', bcaRows[1].category === 'BELANJA')
check('BCA row 3 type is income (CR)', bcaRows[2].type === 'income')
check('BCA row 3 amount is 200.000', bcaRows[2].amount === 200000)

// 3. Tab-separated / Mandiri Livin sample
const mandiriTsv = `
04/10/2026\tSPBU PERTAMINA DAGO\t50.000,00\t0\t4.500.000,00
05/10/2026\tTRSF GAJI BULANAN\t0\t5.000.000,00\t9.500.000,00
`
const mandiriRows = parseBankStatement(mandiriTsv)
check('parses 2 Mandiri TSV rows', mandiriRows.length === 2)
check('Mandiri row 1 amount is 50.000', mandiriRows[0].amount === 50000)
check('Mandiri row 1 category is TRANSPORT', mandiriRows[0].category === 'TRANSPORT')

// 4. Free text / Notification SMS paste
const freeText = `
05/10/2026 QRIS WARUNG KOPI SENJA Rp 18.000 DB Berhasil
06/10/2026 Transfer masuk dari Budi Rp 100.000 CR Berhasil
`
const freeRows = parseBankStatement(freeText)
check('parses free-form text lines', freeRows.length === 2)
check('free-form row 1 amount is 18.000', freeRows[0].amount === 18000)
check('free-form row 1 category is MAKAN', freeRows[0].category === 'MAKAN')
check('free-form row 2 is income', freeRows[1].type === 'income')

// 5. Deduplication check
const existingFps = new Set([bcaRows[0].fingerprint])
const deduped = deduplicateAgainstExisting(bcaRows, existingFps)
check('deduplicates existing fingerprint', deduped[0].isDuplicate === true)
check('marks non-existing as not duplicate', deduped[1].isDuplicate === false)

console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
process.exit(fail ? 1 : 0)
