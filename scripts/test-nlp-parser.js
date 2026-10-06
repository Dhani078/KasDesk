const { parseCoachMessageNlp } = require('../lib/coach/nlp-parser')

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

console.log('=== NLP Natural Language Transaction Parser Tests ===')

// 1. User sample: "saya makan hari ini 18000"
const t1 = parseCoachMessageNlp('saya makan hari ini 18000')
check('detects transaction intent for makan 18000', t1.isTransactionIntent === true)
check('detects expense type', t1.transactionDraft?.type === 'expense')
check('detects 18000 amount', t1.transactionDraft?.amount === 18000)
check('detects MAKAN category', t1.transactionDraft?.categoryTag === 'MAKAN')

// 2. K shorthand: "beli bensin 25k"
const t2 = parseCoachMessageNlp('beli bensin 25k')
check('detects 25k as 25000', t2.transactionDraft?.amount === 25000)
check('detects TRANSPORT category', t2.transactionDraft?.categoryTag === 'TRANSPORT')

// 3. Juta shorthand: "dapat gaji 5jt"
const t3 = parseCoachMessageNlp('dapat gaji 5jt')
check('detects income type', t3.transactionDraft?.type === 'income')
check('detects 5jt as 5000000', t3.transactionDraft?.amount === 5000000)
check('detects GAJI category', t3.transactionDraft?.categoryTag === 'GAJI')

// 4. Coding rejection: "buatkan script python untuk scraping"
const t4 = parseCoachMessageNlp('buatkan script python untuk scraping web')
check('rejects coding requests', t4.isOffTopicCoding === true)
check('does not treat coding request as transaction', t4.isTransactionIntent === false)

// 5. Normal advice query: "bagaimana kondisi keuangan saya?"
const t5 = parseCoachMessageNlp('bagaimana kondisi keuangan saya?')
check('advice query is not coding', t5.isOffTopicCoding === false)
check('advice query is not transaction', t5.isTransactionIntent === false)

console.log(`\n==============================================\nRESULT: ${pass} passed, ${fail} failed\n==============================================`)
process.exit(fail ? 1 : 0)
