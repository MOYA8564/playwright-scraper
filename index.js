import express from "express";
import { chromium } from "playwright";

const app = express();

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

app.get("/", (_req, res) => {
  return res.status(200).json({
    ok: true,
    service: "playwright-scraper",
    message: "root ok",
  });
});

app.get("/health", (_req, res) => {
  return res.status(200).json({
    ok: true,
    health: "ok",
  });
});

app.get("/favicon.ico", (_req, res) => {
  return res.status(204).end();
});

app.post("/scrape", async (req, res) => {
  const { url } = req.body ?? {};

  if (!url) {
    return res.status(400).json({
      ok: false,
      message: "Falta la URL",
    });
  }

  let browser;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      locale: "es-ES",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

    const html = await page.content();

    return res.status(200).json({
      ok: true,
      html,
      finalUrl: page.url(),
    });
  } catch (error) {
    console.error("[SCRAPE ERROR]", error);

    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Error desconocido",
    });
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
});

console.log("Iniciando servicio Playwright...");
console.log("PORT detectado:", process.env.PORT);

const port = Number(process.env.PORT || 8080);

app.listen(port, "0.0.0.0", () => {
  console.log(`Playwright scraper escuchando en puerto ${port}`);
});
