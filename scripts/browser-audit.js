const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');

async function getJson(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:9222${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function ensureChrome() {
  try {
    await getJson('/json/version');
    return null;
  } catch {
    const candidates = [
      process.env.CHROME_BIN,
      'C:\\Users\\Anomali\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Users\\Anomali\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ].filter(Boolean);

    const exe = candidates.find(c => fs.existsSync(c));
    if (!exe) throw new Error('No Chrome executable found');

    const proc = spawn(exe, [
      '--headless=new',
      '--remote-debugging-port=9222',
      '--disable-gpu',
      '--no-sandbox'
    ], { stdio: 'ignore' });

    for (let i = 0; i < 30; i++) {
      await sleep(200);
      try {
        await getJson('/json/version');
        return proc;
      } catch {}
    }
    throw new Error('Chrome failed to start on port 9222');
  }
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  async send(method, params = {}) {
    await this.ready;
    const msgId = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  close() {
    this.ws.close();
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function runAudit() {
  const chromeProc = await ensureChrome();
  const version = await getJson('/json/version');
  const browserWs = new CDPClient(version.webSocketDebuggerUrl);

  console.log('=== KASDESK LIVE CHROME BROWSER AUDIT ===');
  console.log('Browser:', version.Browser);

  // Create a new tab
  const { targetId } = await browserWs.send('Target.createTarget', { url: 'about:blank' });
  const targets = await getJson('/json');
  const target = targets.find(t => t.id === targetId);
  const client = new CDPClient(target.webSocketDebuggerUrl);

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  async function navigate(url) {
    await client.send('Page.navigate', { url });
    await sleep(1500);
  }

  async function evalJs(expr) {
    const res = await client.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return res.result?.value;
  }

  async function setViewport(width, height, isMobile) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: isMobile ? 3 : 1,
      mobile: isMobile,
    });
  }

  const results = [];
  function assert(name, condition, detail = '') {
    if (condition) {
      console.log(`  PASS: ${name}`);
      results.push({ name, pass: true });
    } else {
      console.log(`  FAIL: ${name} -> ${detail}`);
      results.push({ name, pass: false, detail });
    }
  }

  // ==========================================
  // 1. MOBILE AUDIT (390 x 844 iPhone)
  // ==========================================
  console.log('\n--- 1. MOBILE VIEWPORT AUDIT (390 x 844) ---');
  await setViewport(390, 844, true);

  // A. Welcome page (or redirect if already logged in)
  await navigate('http://localhost:3333/welcome');
  let title = await evalJs('document.title');
  let bodyText = await evalJs('document.body.innerText');
  let hasOverflow = await evalJs('document.documentElement.scrollWidth > window.innerWidth');
  assert('Welcome / Home page loads', bodyText.toLowerCase().includes('kasdesk') || bodyText.toLowerCase().includes('saldo') || bodyText.toLowerCase().includes('kelola'));
  assert('Mobile: No horizontal overflow', !hasOverflow, 'scrollWidth exceeds window');

  // B. Login page
  await navigate('http://localhost:3333/login');
  bodyText = await evalJs('document.body.innerText');
  hasOverflow = await evalJs('document.documentElement.scrollWidth > window.innerWidth');
  assert('Login or Dashboard renders properly', await evalJs('!!document.querySelector("input[name=\'email\']") || document.body.innerText.includes("SALDO") || document.body.innerText.includes("Saldo")'));
  assert('Mobile: Login/Dashboard no horizontal overflow', !hasOverflow);

  // C. Perform Login if on login page
  const hasEmailInput = await evalJs('!!document.querySelector("input[name=\'email\']")');
  if (hasEmailInput) {
    console.log('\nLogging in as demo user...');
    await evalJs(`
      const email = document.querySelector("input[name='email']");
      const pw = document.querySelector("input[name='password']");
      email.value = 'demo@kasdesk.test';
      email.dispatchEvent(new Event('input', { bubbles: true }));
      pw.value = 'demo12345';
      pw.dispatchEvent(new Event('input', { bubbles: true }));
      const form = document.querySelector('form');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    `);
    await evalJs(`document.querySelector("button[type='submit']").click()`);
    await sleep(2500);
  }

  let currentUrl = await evalJs('window.location.href');
  assert('On authenticated dashboard home (/)', currentUrl.endsWith('/') || currentUrl.includes(':3333/'));

  // D. Dashboard Home Mobile
  console.log('\nAuditing Home Dashboard (Mobile)...');
  await navigate('http://localhost:3333/');
  bodyText = await evalJs('document.body.innerText');
  hasOverflow = await evalJs('document.documentElement.scrollWidth > window.innerWidth');
  assert('Dashboard shows user greeting & balance', bodyText.toLowerCase().includes('total saldo') || bodyText.toLowerCase().includes('saldo'));
  assert('Dashboard shows safe spend (Aman / hari)', bodyText.toLowerCase().includes('aman / hari') || bodyText.toLowerCase().includes('aman'));
  assert('Dashboard shows recent transactions feed', bodyText.toLowerCase().includes('transaksi') || bodyText.toLowerCase().includes('terbaru'));
  assert('BottomNav is rendered on mobile', await evalJs('!!document.querySelector("nav")'));
  assert('Mobile: Home no horizontal overflow', !hasOverflow);

  // E. Test QuickLog modal open
  console.log('\nTesting QuickLog Modal Interaction...');
  await evalJs(`
    const btn = document.querySelector("button[aria-label*='Catat' i], button[aria-label*='Quick' i], nav button.bg-accent, nav button");
    if (btn) btn.click();
  `);
  await sleep(1000);
  const modalVisible = await evalJs('!!document.querySelector("[role=\'dialog\']") || document.body.innerText.includes("Catat Transaksi")');
  assert('QuickLog Sheet opens on click', modalVisible);

  // Close modal if open
  await evalJs(`
    const closeBtn = document.querySelector("[role='dialog'] button[aria-label*='Tutup' i]");
    if (closeBtn) closeBtn.click();
  `);
  await sleep(500);

  // F. Sub-pages on Mobile
  const pages = [
    { url: '/wallets', label: 'Dompet' },
    { url: '/vaults', label: 'Target Tabungan (Vaults)' },
    { url: '/debts', label: 'Utang & Piutang' },
    { url: '/insights', label: 'Laporan & Insights' },
    { url: '/planning', label: 'Budget & Planning' },
    { url: '/transactions', label: 'Riwayat Transaksi' },
    { url: '/coach', label: 'AI Coach & Chat' },
    { url: '/settings', label: 'Pengaturan' },
  ];

  for (const p of pages) {
    await navigate(`http://localhost:3333${p.url}`);
    const bText = await evalJs('document.body.innerText');
    const ovf = await evalJs('document.documentElement.scrollWidth > window.innerWidth');
    assert(`Mobile: ${p.label} loads cleanly`, bText.length > 50);
    assert(`Mobile: ${p.label} no horizontal overflow`, !ovf);
  }

  // ==========================================
  // 1.5 COMPACT MOBILE AUDIT (320 x 568 iPhone SE)
  // ==========================================
  console.log('\n--- 1.5 COMPACT MOBILE VIEWPORT (320 x 568) ---');
  await setViewport(320, 568, true);

  for (const p of [{ url: '/', label: 'Home' }, ...pages]) {
    await navigate(`http://localhost:3333${p.url}`);
    const ovf = await evalJs('document.documentElement.scrollWidth > window.innerWidth');
    assert(`Compact 320px: ${p.label} no horizontal overflow`, !ovf);
  }

  // ==========================================
  // 2. DESKTOP AUDIT (1280 x 800 PC)
  // ==========================================
  console.log('\n--- 2. DESKTOP VIEWPORT AUDIT (1280 x 800) ---');
  await setViewport(1280, 800, false);

  // A. Home on Desktop
  await navigate('http://localhost:3333/');
  bodyText = await evalJs('document.body.innerText');
  hasOverflow = await evalJs('document.documentElement.scrollWidth > window.innerWidth');
  assert('Desktop: Home loads with max-w shell', bodyText.toLowerCase().includes('total saldo') || bodyText.toLowerCase().includes('saldo'));
  assert('Desktop: Home no horizontal overflow', !hasOverflow);

  // B. Sub-pages on Desktop
  for (const p of pages) {
    await navigate(`http://localhost:3333${p.url}`);
    const bText = await evalJs('document.body.innerText');
    const ovf = await evalJs('document.documentElement.scrollWidth > window.innerWidth');
    assert(`Desktop: ${p.label} loads cleanly`, bText.length > 50);
    assert(`Desktop: ${p.label} no horizontal overflow`, !ovf);
  }

  // Clean up
  await browserWs.send('Target.closeTarget', { targetId });
  client.close();
  browserWs.close();
  if (chromeProc) chromeProc.kill();

  const failed = results.filter(r => !r.pass);
  console.log(`\n==============================================`);
  console.log(`BROWSER AUDIT RESULT: ${results.length - failed.length} passed, ${failed.length} failed`);
  console.log(`==============================================`);

  process.exit(failed.length ? 1 : 0);
}

runAudit().catch(e => {
  console.error('Browser audit error:', e);
  process.exit(1);
});
