/**
 * Drives a real browser against a deployed origin and reports what it does with
 * insecure subresources.
 *
 * Usage:  node scripts/probe-mixed-content.mjs [origin]
 *
 * # Why this exists as a script rather than an ad-hoc snippet
 *
 * The claim it settles - "an http:// image on an https page degrades the
 * padlock" - was asserted by two people from general knowledge and was wrong.
 * Current Chrome auto-upgrades passive mixed content and blocks active mixed
 * content; neither produces a degraded padlock. That is measurable in seconds
 * and was not measured for weeks.
 *
 * # Why the label is derived and not written down
 *
 * The first version of this probe printed a hardcoded "BASELINE (no CSP)"
 * banner. After the CSP shipped, the same script kept printing it, so its
 * output described a configuration that no longer existed - a transcript that
 * would tell a reader in three months that the header was never deployed.
 *
 * So the header is read from the live response and the banner is derived from
 * what was actually received. A run cannot mislabel itself.
 */
import { chromium } from '@playwright/test';

const ORIGIN = process.argv[2] || 'https://grainlify.com';
const PASSIVE_UPGRADABLE = 'http://img.shields.io/badge/probe-probe-blue.svg';
// A host that cannot resolve, by construction: .invalid is reserved and never
// resolves. neverssl.com was used first and turned out to serve HTTPS
// intermittently, so it produced 'errored' in one run and 'loaded' in the next
// - a fixture that cannot decide is worse than no fixture.
const PASSIVE_HTTP_ONLY = 'http://no-such-host.invalid/badge.png';
const ACTIVE = 'http://img.shields.io/badge/style-x-blue.svg';

const head = await fetch(ORIGIN, { method: 'GET', cache: 'no-store' });
const csp = head.headers.get('content-security-policy') || '';
const upgrades = /upgrade-insecure-requests/i.test(csp);

console.log(`origin : ${ORIGIN}`);
console.log(`CSP    : ${csp || '<none>'}`);
console.log(`mode   : ${upgrades ? 'upgrade-insecure-requests IS present' : 'NO upgrade-insecure-requests'}`);

const browser = await chromium.launch();
console.log(`browser: ${browser.version()}\n`);
const ctx = await browser.newContext();
const page = await ctx.newPage();

const net = [];
const match = u => /shields\.io|no-such-host\.invalid/.test(u);
page.on('request',       r => match(r.url()) && net.push(`REQ  ${r.resourceType().padEnd(11)} ${r.url()}`));
page.on('requestfailed', r => match(r.url()) && net.push(`FAIL ${r.resourceType().padEnd(11)} ${r.url()} :: ${r.failure()?.errorText}`));
page.on('response',      r => match(r.url()) && net.push(`RESP ${String(r.status()).padEnd(11)} ${r.url()}`));
const notes = [];
page.on('console', m => /mixed|insecure|upgrade|blocked/i.test(m.text()) && notes.push(m.text().slice(0, 200)));

await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });

const loadImg = src => page.evaluate(s => new Promise(res => {
  const i = document.createElement('img');
  i.onload = () => res({ outcome: 'loaded', w: i.naturalWidth, currentSrc: i.currentSrc });
  i.onerror = () => res({ outcome: 'errored', w: 0, currentSrc: i.currentSrc });
  i.src = s; document.body.appendChild(i);
  setTimeout(() => res({ outcome: 'timeout', w: i.naturalWidth, currentSrc: i.currentSrc }), 15000);
}), src);

const passiveOk = await loadImg(PASSIVE_UPGRADABLE);
const passiveNoTls = await loadImg(PASSIVE_HTTP_ONLY);
const active = await page.evaluate(async (href) => {
  const out = {};
  await new Promise(res => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = href;
    l.onload = () => { out.stylesheet = 'loaded'; res(); };
    l.onerror = () => { out.stylesheet = 'errored'; res(); };
    document.head.appendChild(l);
    setTimeout(() => { out.stylesheet ||= 'timeout'; res(); }, 8000);
  });
  try { const r = await fetch(href.replace('style-x', 'fetch-x'), { mode: 'no-cors' }); out.fetch = 'resolved type=' + r.type; }
  catch (e) { out.fetch = 'threw: ' + String(e).slice(0, 80); }
  return out;
}, ACTIVE);

await page.waitForTimeout(1200);
console.log('passive, https version exists : ' + `${passiveOk.outcome} (naturalWidth=${passiveOk.w}) -> ${passiveOk.currentSrc}`);
console.log('passive, unreachable over https: ' + `${passiveNoTls.outcome} (naturalWidth=${passiveNoTls.w}) -> ${passiveNoTls.currentSrc}`);
console.log('active,  <link rel=stylesheet>: ' + active.stylesheet);
console.log('active,  fetch()              : ' + active.fetch);
console.log('\nnetwork:');
net.forEach(l => console.log('  ' + l));
if (notes.length) { console.log('\nconsole:'); notes.forEach(n => console.log('  ' + n)); }
await browser.close();
