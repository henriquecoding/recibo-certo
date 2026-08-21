import { chromium } from "playwright";

const base = process.env.MARKET_PREVIEW_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const report = [];

async function capture({ name, path, viewport, after }) {
  const page = await browser.newPage({ viewportSize: viewport, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console: ${message.text()}`);
  });
  const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.locator("h1").waitFor({ state: "visible", timeout: 20_000 });
  await page
    .waitForResponse((item) => item.url().includes("/api/market/pilots"), { timeout: 10_000 })
    .catch(() => null);
  await after?.(page);
  const overlay = await page.locator('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay').count();
  const bodyLength = (await page.locator("body").innerText()).trim().length;
  await page.screenshot({ path: `docs/images/${name}.png`, fullPage: false });
  report.push({ name, status: response?.status(), bodyLength, overlay, errors });
  await page.close();
}

await capture({
  name: "motor-negocio-desktop",
  path: "/ferramentas/descobrir-negocio",
  viewport: { width: 1440, height: 1200 },
});

await capture({
  name: "dossier-oportunidade-desktop",
  path: "/ferramentas/descobrir-negocio",
  viewport: { width: 1440, height: 1200 },
  after: async (page) => {
    await page.locator("#resultado-descoberta").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  },
});

await capture({
  name: "motor-negocio-mobile",
  path: "/ferramentas/descobrir-negocio",
  viewport: { width: 390, height: 1100 },
  after: async (page) => {
    await page.locator("#resultado-descoberta").scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  },
});

await capture({
  name: "preco-recibos-verdes-mobile",
  path: "/ferramentas/recibos-verdes?modo=preco&cenario=servico",
  viewport: { width: 390, height: 1100 },
});

await browser.close();

const failures = report.filter(
  (item) => item.status !== 200 || item.bodyLength === 0 || item.overlay > 0 || item.errors.length > 0,
);
process.stdout.write(`${JSON.stringify({ ok: failures.length === 0, report }, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
