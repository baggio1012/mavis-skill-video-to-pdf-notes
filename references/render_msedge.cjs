#!/usr/bin/env node
/**
 * render_html.cjs �?Render any HTML (file or URL) �?PDF via Playwright.
 *
 * Usage:
 *   node render_html.cjs --in page.html --out report.pdf
 *   node render_html.cjs --in page.html --out report.pdf --wait 15000
 *   node render_html.cjs --in https://example.com --out site.pdf --landscape
 *
 * Options:
 *   --in <file|url>          HTML file path or http(s):// URL (required)
 *   --out <file>             Output PDF path (required)
 *   --wait <ms>              Extra settle time after networkidle (default 800).
 *                            Bump to 15000+ for Chart.js / heavy JS pages.
 *   --format <A4|Letter>     Page format (default A4)
 *   --margin <css>           CSS margin shorthand, e.g. "14mm 12mm" (default "14mm 12mm")
 *   --landscape              Landscape orientation
 *   --scale <n>              Print scale 0.1�? (default 1)
 *   --no-print-background    Disable -webkit-print-color-adjust:exact rendering
 *   --header <html>          Optional header HTML template
 *   --footer <html>          Optional footer HTML template
 *
 * Exit codes: 0 success, 1 bad args, 2 dependency missing, 3 render error
 */

const path = require('path');
const fs = require('fs');

function usage(msg) {
  if (msg) console.error(msg);
  console.error(
    'Usage: node render_html.cjs --in <file.html|url> --out <file.pdf>\n' +
      '       [--wait <ms>] [--format A4|Letter] [--margin "14mm 12mm"]\n' +
      '       [--landscape] [--scale 1] [--no-print-background]\n' +
      '       [--header <html>] [--footer <html>]',
  );
  process.exit(1);
}

// ── Arg parsing ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let input = null;
let outFile = null;
let waitMs = 800;
let format = 'A4';
let margin = '14mm 12mm';
let landscape = false;
let scale = 1;
let printBackground = true;
let headerHtml = null;
let footerHtml = null;

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if ((a === '--in' || a === '--input') && args[i + 1]) input = args[++i];
  else if (a === '--out' && args[i + 1]) outFile = args[++i];
  else if (a === '--wait' && args[i + 1]) waitMs = parseInt(args[++i], 10);
  else if (a === '--format' && args[i + 1]) format = args[++i];
  else if (a === '--margin' && args[i + 1]) margin = args[++i];
  else if (a === '--scale' && args[i + 1]) scale = parseFloat(args[++i]);
  else if (a === '--landscape') landscape = true;
  else if (a === '--no-print-background') printBackground = false;
  else if (a === '--header' && args[i + 1]) headerHtml = args[++i];
  else if (a === '--footer' && args[i + 1]) footerHtml = args[++i];
  else if (a === '-h' || a === '--help') usage();
}

if (!input || !outFile) usage('error: --in and --out are required');

// Resolve --in to file:// URL or pass through if already http(s)://
let pageUrl;
if (/^https?:\/\//i.test(input)) {
  pageUrl = input;
} else {
  if (!fs.existsSync(input)) {
    console.error(JSON.stringify({ status: 'error', error: `File not found: ${input}` }));
    process.exit(1);
  }
  pageUrl = 'file://' + path.resolve(input);
}

// Parse CSS margin shorthand �?Playwright margin object
function parseMargin(css) {
  const parts = css.trim().split(/\s+/);
  const [t, r, b, l] = (() => {
    if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
    if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
    if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
    return [parts[0], parts[1], parts[2], parts[3]];
  })();
  return { top: t, right: r, bottom: b, left: l };
}

// ── Playwright loader (tolerates global npm installs) ─────────────────────────
function loadPlaywright() {
  const { execSync } = require('child_process');
  try {
    return require('playwright');
  } catch (_) {}
  try {
    const root = execSync('npm root -g', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    return require(path.join(root, 'playwright'));
  } catch (_) {}
  console.error(
    JSON.stringify({
      status: 'error',
      error: 'playwright not found',
      hint: 'Run: bash scripts/make.sh fix  (or: npm install -g playwright && npx playwright install chromium)',
    }),
  );
  process.exit(2);
}

// ── Main ───────────────────────────────────────────────────────────────────────
// Render an HTML file/URL to PDF using Playwright + Edge.
// Retries the whole launch+render cycle up to 2 times on failure to absorb
// transient Edge / Playwright errors (e.g. "Protocol error (Page.printToPDF):
// Printing failed") that succeed on the second try. Each attempt gets a
// fresh browser instance.
(async () => {
  const { chromium } = loadPlaywright();

  // -- Helper: one full attempt (launch + page.pdf) -------------------------
  async function attemptOnce() {
    let browser;
    try {
      browser = await chromium.launch({ channel: 'msedge' });
    } catch (firstErr) {
      // Chromium binary missing — try installing once before re-trying launch.
      const { spawnSync } = require('child_process');
      const r = spawnSync('npx', ['playwright', 'install', 'chromium'], {
        stdio: 'inherit',
        shell: true,
      });
      if (r.status !== 0) {
        const e = new Error('Chromium not installed and auto-install failed');
        e.fatal = true;
        e.hint = 'Run: npx playwright install chromium';
        throw e;
      }
      browser = await chromium.launch({ channel: 'msedge' });
    }

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(60_000);
      page.setDefaultNavigationTimeout(60_000);

      await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 60_000 });

      // Wait for web fonts to actually load (otherwise body text falls back
      // to a generic sans-serif while the snapshot is taken).
      try {
        await page.waitForFunction(() => document.fonts && document.fonts.ready, { timeout: 15_000 });
        await page.evaluate(() => document.fonts.ready);
      } catch (_) {
        // Best effort — some pages have no @font-face; ignore.
      }

      // Extra settle window for Chart.js / lazy images / late JS.
      if (waitMs > 0) await page.waitForTimeout(waitMs);

      const pdfOpts = {
        path: outFile,
        format,
        printBackground,
        landscape,
        scale,
        margin: parseMargin(margin),
      };
      if (headerHtml || footerHtml) {
        pdfOpts.displayHeaderFooter = true;
        if (headerHtml) pdfOpts.headerTemplate = headerHtml;
        if (footerHtml) pdfOpts.footerTemplate = footerHtml;
      }

      await page.pdf(pdfOpts);
    } finally {
      await browser.close().catch(() => {});
    }
  }

  // -- Retry loop ------------------------------------------------------------
  const MAX_ATTEMPTS = 2;
  let lastErr;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    try {
      await attemptOnce();
      // If attemptOnce returns without throwing, the PDF is on disk. Verify
      // size and emit the OK status.
      const stat = fs.statSync(outFile);
      if (stat.size < 5000) {
        console.error(
          JSON.stringify({
            status: 'error',
            error: 'Output PDF is suspiciously small — page may be blank',
            hint: 'Open the source HTML in a browser and check for render errors',
          }),
        );
        process.exit(3);
      }
      console.log(
        JSON.stringify({
          status: 'ok',
          out: outFile,
          size_kb: Math.round(stat.size / 1024),
          format,
          landscape,
          attempts: i,
        }),
      );
      return;
    } catch (e) {
      lastErr = e;
      if (e.fatal) {
        // Auto-install of Chromium failed; no point retrying.
        console.error(
          JSON.stringify({ status: 'error', error: e.message, hint: e.hint }),
        );
        process.exit(2);
      }
      if (i < MAX_ATTEMPTS) {
        console.error(
          JSON.stringify({
            status: 'retry',
            attempt: i,
            next: i + 1,
            error: String(e),
          }),
        );
        // Brief pause before retrying — gives Edge / Playwright time to
        // clean up the previous browser instance.
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      // Out of attempts.
      console.error(
        JSON.stringify({
          status: 'error',
          error: String(e),
          attempts: MAX_ATTEMPTS,
          hint: 'Try `npx playwright install chromium` or restart Edge.',
        }),
      );
      process.exit(3);
    }
  }
  // Defensive fallthrough (should be unreachable).
  console.error(
    JSON.stringify({ status: 'error', error: String(lastErr) }),
  );
  process.exit(3);
})();

