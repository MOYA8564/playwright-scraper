import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({ ok: true, service: "playwright-scraper" });
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

    return res.json({
      ok: true,
      html,
      finalUrl: page.url(),
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Playwright scraper escuchando en puerto ${port}`);
});
