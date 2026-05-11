#!/usr/bin/env node
/**
 * Generador de screenshots automático para radares.
 * Uso: npm install puppeteer && node screenshot.js
 * Genera screenshots de index.html y radares en carpeta ./screenshots/
 */

const fs = require('fs');
const path = require('path');

async function takeScreenshots() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('❌ Puppeteer no instalado. Ejecuta: npm install puppeteer');
    process.exit(1);
  }

  const ROOT = __dirname;
  const SCREENSHOTS_DIR = path.join(ROOT, 'screenshots');
  const API_BASE = 'http://localhost:8080';

  // Crear directorio de screenshots
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    console.log('🎬 Tomando screenshots...\n');

    const viewports = [
      { name: 'desktop', width: 1280, height: 800 },
      { name: 'mobile', width: 375, height: 812 }
    ];

    // Index
    for (const viewport of viewports) {
      const page = await browser.newPage();
      await page.setViewport(viewport);
      await page.goto(`${API_BASE}/index.html`, { waitUntil: 'networkidle2' });
      const file = path.join(SCREENSHOTS_DIR, `index-${viewport.name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${file}`);
      await page.close();
    }

    // Primeros 5 radares
    const PROFS = JSON.parse(fs.readFileSync(path.join(ROOT, 'professions.json'), 'utf8'));
    const radarKeys = Object.keys(PROFS).slice(0, 5);

    for (const key of radarKeys) {
      for (const viewport of viewports) {
        const page = await browser.newPage();
        await page.setViewport(viewport);
        await page.goto(`${API_BASE}/radar-${key}.html`, { waitUntil: 'networkidle2' });
        const file = path.join(SCREENSHOTS_DIR, `radar-${key}-${viewport.name}.png`);
        await page.screenshot({ path: file, fullPage: true });
        console.log(`✓ ${file}`);
        await page.close();
      }
    }

    console.log(`\n✅ Screenshots guardados en ${SCREENSHOTS_DIR}/`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

takeScreenshots();
