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
  const { url, cookies = [], storageState = null } = req.body ?? {};

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
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
      ],
    });

    const contextOptions = {
      locale: "es-ES",
      timezoneId: "Europe/Madrid",
      ignoreHTTPSErrors: true,
      viewport: { width: 1366, height: 768 },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      extraHTTPHeaders: {
        "Accept-Language": "es-ES,es;q=0.9",
        "Upgrade-Insecure-Requests": "1",
      },
    };

    if (storageState) {
      contextOptions.storageState = storageState;
    }

    const context = await browser.newContext(contextOptions);

    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
    });

    if (!storageState && cookies.length > 0) {
      await context.addCookies(cookies);
    }

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "load",
      timeout: 60000,
    });

    await page.waitForTimeout(4000);

    const html = await page.content();

    return res.json({
      ok: true,
      finalUrl: page.url(),
      title: await page.title(),
      htmlLength: html.length,
    });
  } catch (error) {
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

const port = Number(process.env.PORT || 8080);

app.listen(port, "0.0.0.0", () => {
  console.log(`Playwright scraper escuchando en puerto ${port}`);
});
