import { chromium } from "playwright";
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  ...(proxy ? { proxy: { server: proxy, bypass: "localhost,127.0.0.1" } } : {}),
  args: ["--ignore-certificate-errors"],
});
const ctx = await b.newContext({ viewport: { width: 360, height: 900 }, ignoreHTTPSErrors: true });
await ctx.addInitScript(() => {
  localStorage.setItem("recibocerto:changelog_visto", "2.111.0");
  localStorage.setItem("recibocerto:cookie-consent", JSON.stringify({ necessarios: true, estatistica: false, marketing: false, versao: 1, data: new Date().toISOString() }));
});
const p = await ctx.newPage();
await p.goto("http://localhost:3000/ferramentas/descobrir-negocio", { waitUntil: "domcontentloaded" });
await p.waitForTimeout(3500);
await p.locator("#ode-concelho").selectOption({ label: "Loulé" });
await p.waitForTimeout(2500);
const tiles = await p.locator(".leaflet-tile-loaded").count();
console.log("tiles carregadas:", tiles);
await p.locator(".leaflet-container").first().scrollIntoViewIfNeeded();
await p.waitForTimeout(1200);
await p.screenshot({ path: "/tmp/mapa-tiles.png" });
await b.close();
