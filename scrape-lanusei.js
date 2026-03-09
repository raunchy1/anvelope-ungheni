/**
 * ============================================================
 * SCRAPER AFACERI LANUSEI, SARDINIA
 * ============================================================
 * Extrage: Denumire Companie + Numar Telefon + Adresa
 *
 * DOUA MODURI DE RULARE:
 *
 * 1. Cu Google Places API (recomandat - gratuit $200/luna):
 *    - Obtine cheie gratuita la: https://console.cloud.google.com/
 *    - Activeaza "Places API (New)"
 *    GOOGLE_MAPS_API_KEY=AIza... node scrape-lanusei.js --api
 *
 * 2. Cu Puppeteer (scraping Google Maps direct, fara cheie):
 *    npm install puppeteer
 *    node scrape-lanusei.js
 *
 * Rezultate salvate in:
 *   - lanusei-businesses.json
 *   - lanusei-businesses.csv
 * ============================================================
 */

const fs = require('fs');
const https = require('https');

const USE_API = process.argv.includes('--api');
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Coordonate Lanusei, Sardinia
const LANUSEI_LAT = 39.8784;
const LANUSEI_LNG = 9.5393;
const RADIUS_METERS = 5000;

// Categorii de cautat
const SEARCH_QUERIES = [
  'ristorante Lanusei', 'bar caffè Lanusei', 'hotel albergo Lanusei',
  'farmacia Lanusei', 'medico Lanusei', 'avvocato Lanusei',
  'officina meccanico Lanusei', 'supermercato Lanusei', 'parrucchiere Lanusei',
  'assicurazione Lanusei', 'banca Lanusei', 'agenzia immobiliare Lanusei',
  'costruzione Lanusei', 'artigiano Lanusei', 'pizzeria Lanusei',
  'pasticceria Lanusei', 'panetteria Lanusei', 'dentista Lanusei',
  'veterinario Lanusei', 'tabaccheria Lanusei', 'elettricista Lanusei',
  'idraulico Lanusei', 'agenzia viaggi Lanusei', 'palestra Lanusei',
  'noleggio auto Lanusei', 'orologeria gioielleria Lanusei', 'ottica Lanusei',
  'commercio Lanusei', 'servizi Lanusei', 'negozio Lanusei',
  'impresa Lanusei Sardinia', 'studio professionale Lanusei',
  'scuola guida Lanusei', 'pompe funebri Lanusei', 'piscina Lanusei'
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ============================================================
// MODALITATE 1: Google Places API (New)
// ============================================================
async function scrapeWithApi() {
  if (!API_KEY) {
    console.error('Eroare: Seteaza GOOGLE_MAPS_API_KEY=AIza...');
    process.exit(1);
  }

  function placesRequest(body) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const req = https.request({
        hostname: 'places.googleapis.com',
        path: '/v1/places:searchText',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'places.displayName,places.nationalPhoneNumber,places.formattedAddress,nextPageToken',
          'Content-Length': Buffer.byteLength(data)
        }
      }, res => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error(body.substring(0, 300))); }
        });
      });
      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  const allBusinesses = [];
  const seen = new Set();

  for (const query of SEARCH_QUERIES) {
    console.log(`Cauta: "${query}"...`);
    let pageToken = null;

    do {
      try {
        const body = {
          textQuery: query + ' Sardinia Italia',
          locationBias: {
            circle: {
              center: { latitude: LANUSEI_LAT, longitude: LANUSEI_LNG },
              radius: RADIUS_METERS
            }
          },
          maxResultCount: 20,
          languageCode: 'it'
        };
        if (pageToken) body.pageToken = pageToken;

        const result = await placesRequest(body);

        if (result.error) {
          console.log(`  ! API Error: ${result.error.message}`);
          break;
        }

        const places = result.places || [];
        let newCount = 0;

        for (const place of places) {
          const name = place.displayName?.text || '';
          if (!name) continue;
          const key = name.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          allBusinesses.push({
            denumire: name,
            telefon: place.nationalPhoneNumber || 'N/A',
            adresa: place.formattedAddress || 'N/A'
          });
          newCount++;
        }

        console.log(`  ${places.length} rezultate, ${newCount} noi (total: ${allBusinesses.length})`);
        pageToken = result.nextPageToken || null;
        if (pageToken) await sleep(2000);
      } catch (err) {
        console.log(`  ! Eroare: ${err.message}`);
        break;
      }
    } while (pageToken);

    await sleep(300);
  }

  return allBusinesses;
}

// ============================================================
// MODALITATE 2: Puppeteer - scraping Google Maps direct
// ============================================================
async function scrapeWithPuppeteer() {
  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch (e) {
    console.error('Instaleaza puppeteer: npm install puppeteer');
    process.exit(1);
  }

  console.log('Pornire browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  const allBusinesses = [];
  const seen = new Set();

  for (const query of SEARCH_QUERIES) {
    console.log(`\nCauta: "${query}"...`);
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 900 });

    try {
      const url = `https://www.google.com/maps/search/${encodeURIComponent(query + ' Sardinia')}`;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await sleep(3000);

      // Accept cookies
      try {
        const btn = await page.$('button[jsname="higCR"], form[action*="consent"] button');
        if (btn) { await btn.click(); await sleep(2000); }
      } catch (_) {}

      // Scroll to load more results
      for (let i = 0; i < 8; i++) {
        await page.evaluate(() => {
          const feed = document.querySelector('div[role="feed"]');
          if (feed) feed.scrollBy(0, 600);
          else window.scrollBy(0, 600);
        });
        await sleep(1200);
      }

      // Collect all place links
      const links = await page.$$eval(
        'a[href*="/maps/place/"]',
        els => [...new Set(els.map(e => e.href).filter(h => h.includes('/maps/place/')))]
      );

      console.log(`  Gasit ${links.length} locuri`);

      for (const link of links.slice(0, 25)) {
        if (seen.has(link)) continue;
        seen.add(link);

        const detailPage = await browser.newPage();
        try {
          await detailPage.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          );
          await detailPage.goto(link, { waitUntil: 'networkidle2', timeout: 25000 });
          await sleep(2000);

          const data = await detailPage.evaluate(() => {
            const nameEl = document.querySelector('h1.DUwDvf') ||
                           document.querySelector('h1') ||
                           document.querySelector('[data-attrid="title"]');
            const name = nameEl ? nameEl.innerText.trim() : '';

            // Phone from aria-label buttons
            let phone = '';
            const buttons = Array.from(document.querySelectorAll('button[data-item-id], button[aria-label]'));
            for (const btn of buttons) {
              const label = btn.getAttribute('aria-label') || btn.getAttribute('data-item-id') || '';
              if (label.match(/\+?[\d\s\-\(\)]{8,}/)) {
                phone = label.replace(/[^\d\+\s\-\(\)]/g, '').trim();
                if (phone.length >= 6) break;
              }
            }

            // Fallback: search text
            if (!phone) {
              const text = document.body.innerText;
              const m = text.match(/(\+39[\s\-]?[\d\s\-]{6,14}|0[\d]{2,4}[\s\-]?[\d\s\-]{5,10})/);
              if (m) phone = m[0].trim();
            }

            const addrEl = document.querySelector('button[data-item-id="address"] .fontBodyMedium');
            const address = addrEl ? addrEl.innerText.trim() : '';

            return { name, phone, address };
          });

          if (data.name && data.name.length > 1) {
            const nameKey = data.name.toLowerCase().trim();
            if (!seen.has('n:' + nameKey)) {
              seen.add('n:' + nameKey);
              allBusinesses.push({
                denumire: data.name,
                telefon: data.phone || 'N/A',
                adresa: data.address || 'N/A'
              });
              console.log(`  ✓ ${data.name} | ${data.phone || 'fara telefon'}`);
            }
          }
        } catch (err) {
          console.log(`  ! ${err.message.substring(0, 60)}`);
        } finally {
          await detailPage.close();
        }
        await sleep(800);
      }
    } catch (err) {
      console.log(`  ! Eroare pagina: ${err.message.substring(0, 80)}`);
    } finally {
      await page.close();
    }
    await sleep(1000);
  }

  await browser.close();
  return allBusinesses;
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('================================================');
  console.log(' SCRAPER AFACERI - LANUSEI, SARDINIA');
  console.log('================================================\n');

  let businesses;

  if (USE_API) {
    console.log('Mod: Google Places API\n');
    businesses = await scrapeWithApi();
  } else {
    console.log('Mod: Puppeteer (Google Maps scraping)\n');
    businesses = await scrapeWithPuppeteer();
  }

  // Deduplicate & sort
  const unique = [];
  const names = new Set();
  for (const b of businesses) {
    const k = b.denumire.toLowerCase().trim();
    if (!names.has(k)) { names.add(k); unique.push(b); }
  }
  unique.sort((a, b) => a.denumire.localeCompare(b.denumire, 'it'));

  // Display
  console.log('\n================================================');
  console.log(` TOTAL AFACERI GASITE: ${unique.length}`);
  console.log('================================================\n');
  console.log('DENUMIRE COMPANIE'.padEnd(50) + ' TELEFON');
  console.log('-'.repeat(75));
  for (const b of unique) {
    console.log(b.denumire.substring(0, 49).padEnd(50) + ' ' + b.telefon);
  }

  // Save files
  fs.writeFileSync('lanusei-businesses.json', JSON.stringify(unique, null, 2), 'utf8');
  const csv = [
    'Denumire,Telefon,Adresa',
    ...unique.map(b =>
      `"${b.denumire.replace(/"/g,'""')}","${b.telefon.replace(/"/g,'""')}","${b.adresa.replace(/"/g,'""')}"`
    )
  ].join('\n');
  fs.writeFileSync('lanusei-businesses.csv', csv, 'utf8');

  console.log('\nFisiere salvate: lanusei-businesses.json, lanusei-businesses.csv');
}

main().catch(console.error);
