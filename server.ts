import express from "express";
import cors from "cors";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractTokenName(title: string) {
  if (!title) return "";
  let name = title
    .replace(/market cap \(fdv\).*/i, "")
    .replace(/fdv above.*/i, "")
    .replace(/market cap.*/i, "")
    .replace(/will\s+/i, "")
    .replace(/launch a token.*/i, "")
    .replace(/perform an airdrop.*/i, "")
    .replace(/airdrop by.*/i, "")
    .replace(/launch by.*/i, "")
    .replace(/\?.*/, "")
    .trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function isFDVMarket(question: string) {
  if (!question) return false;
  const q = question.toLowerCase();
  return (
    q.includes("fdv") ||
    q.includes("market cap") ||
    q.match(/[>$]\d+/) !== null ||
    (q.includes("above") && q.includes("one day after launch"))
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const GAMMA_API = 'https://gamma-api.polymarket.com';

  async function fetchAllPremarket() {
    const results: any[] = [];
    const seen = new Set();

    try {
      for (let offset = 0; offset < 2000; offset += 500) {
        const res = await axios.get(`${GAMMA_API}/events`, {
          params: { closed: false, active: true, limit: 500, offset }
        });

        if (!res.data || !Array.isArray(res.data)) break;

        for (const e of res.data) {
          if (seen.has(e.id)) continue;

          const t = (e.title || '').toLowerCase();
          const tags = (e.tags || []).map((tag: any) => (tag.slug || tag.label || '').toLowerCase());

          const isPremarket =
            t.includes('fdv') ||
            t.includes('one day after launch') ||
            t.includes('launch a token') ||
            t.includes('token launch') ||
            t.includes('airdrop') ||
            t.includes('tge') ||
            t.includes('pre-market') ||
            t.includes('premarket') ||
            tags.some((tag: string) => tag.includes('pre-market') || tag.includes('fdv'));

          if (isPremarket) {
            seen.add(e.id);
            results.push(e);
          }
        }

        if (res.data.length < 500) break;
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }

    return results;
  }

  app.get('/api/premarket', async (req, res) => {
    try {
      const events = await fetchAllPremarket();
      console.log(`Found ${events.length} premarket events`);

      const tokenMap = new Map<string, any>();

      for (const event of events) {
        const title = event.title || '';
        const name = extractTokenName(title);
        if (!name || name.length < 2) continue;

        const key = name.toLowerCase().trim();

        if (!tokenMap.has(key)) {
          tokenMap.set(key, {
            id: event.id,
            title: name,
            slug: event.slug,
            volume24hr: 0,
            volume: 0,
            liquidity: 0,
            image: event.image || null,
            fdvMarkets: [],
            allMarkets: []
          });
        }

        const token = tokenMap.get(key);
        token.volume24hr += parseFloat(event.volume24hr || '0');
        token.volume += parseFloat(event.volume || '0');
        token.liquidity += parseFloat(event.liquidity || '0');
        if (!token.image && event.image) token.image = event.image;

        if (isFDVMarket(title) && event.slug) {
          token.slug = event.slug;
        }

        const markets = event.markets || [];
        for (const m of markets) {
          let mYesPct = null;
          try {
            const p = JSON.parse(m.outcomePrices || '[]');
            if (p.length) mYesPct = Math.round(parseFloat(p[0]) * 100);
          } catch(e) {}

          const marketData = {
            question: m.question,
            yesPct: mYesPct,
            volume24hr: parseFloat(m.volume24hr || '0'),
            volume: parseFloat(m.volume || '0')
          };

          const alreadyExists = token.allMarkets.some(
            (existing: any) => existing.question === m.question
          );

          if (!alreadyExists) {
            token.allMarkets.push(marketData);
            if (isFDVMarket(m.question || '')) {
              token.fdvMarkets.push(marketData);
            }
          }
        }
      }

      const processed = Array.from(tokenMap.values()).map(token => {
        token.fdvMarkets.sort((a: any, b: any) => {
          const getNum = (q: string) => {
            const match = q.match(/\$(\d+(?:\.\d+)?)(B|M|K)?/i);
            if (!match) return 0;
            const n = parseFloat(match[1]);
            const unit = (match[2] || '').toUpperCase();
            return unit === 'B' ? n * 1000 : unit === 'K' ? n / 1000 : n;
          };
          return getNum(a.question) - getNum(b.question);
        });
        return token;
      })
      .filter((token: any) => token.volume24hr > 0)
      .sort((a: any, b: any) => b.volume24hr - a.volume24hr)
      .slice(0, 10);

      console.log(`Returning ${processed.length} tokens:`);
      processed.forEach((t: any) => {
        console.log(`  ${t.title} — fdv: ${t.fdvMarkets.length}, all: ${t.allMarkets.length}`);
      });

      res.json({ success: true, data: processed, count: processed.length });
    } catch (error: any) {
      console.error('Error:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/hyperliquid', async (req, res) => {
    try {
      const hlRes = await axios.post('https://api.hyperliquid.xyz/info', { type: 'metaAndAssetCtxs' });
      const [meta, assetCtxs] = hlRes.data;
      
      const preLaunchTokens: any[] = [];
      for (let i = 0; i < meta.universe.length; i++) {
        const assetMeta = meta.universe[i];
        if (assetMeta.onlyIsolated === true && assetMeta.maxLeverage === 3) {
          const ctx = assetCtxs[i];
          const volume24h = parseFloat(ctx.dayNtlVlm);

          // Only include tokens with actual trading activity today
          if (volume24h <= 0) continue;

          const markPx = parseFloat(ctx.markPx);
          const prevDayPx = parseFloat(ctx.prevDayPx);
          const priceChangePct = prevDayPx ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;
          const openInterest = parseFloat(ctx.openInterest || '0');
          const funding = parseFloat(ctx.funding || '0');
          
          preLaunchTokens.push({
            name: assetMeta.name,
            volume24h,
            markPrice: markPx,
            prevDayPx,
            priceChangePct,
            openInterest,
            funding
          });
        }
      }

      const startTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
      
      const enrichedTokens = await Promise.all(preLaunchTokens.map(async (token) => {
        try {
          const candleRes = await axios.post('https://api.hyperliquid.xyz/info', {
            type: 'candleSnapshot',
            req: { coin: token.name, interval: '1h', startTime }
          });
          const candles = (candleRes.data || []).map((c: any) => parseFloat(c.c));
          return { ...token, candles };
        } catch (e) {
          console.error(`Error fetching candles for ${token.name}:`, e);
          return { ...token, candles: [] };
        }
      }));

      enrichedTokens.sort((a, b) => b.volume24h - a.volume24h);

      res.json({ success: true, data: enrichedTokens, count: enrichedTokens.length });
    } catch (error: any) {
      console.error('Error fetching Hyperliquid data:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/mexc', async (req, res) => {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };

      // 1. Fetch coin list
      const coinsRes = await fetch('https://www.mexc.com/api/gateway/pmt/market/web/all/underlying/type?type=1', { headers });
      if (!coinsRes.ok) throw new Error(`Coins API failed: ${coinsRes.status}`);
      const coinsData = await coinsRes.json();
      const coinsList = coinsData?.data || [];

      // 2. Fetch live prices
      const tickersRes = await fetch('https://www.mexc.com/api/gateway/pmt/market/web/underlying/tickers', { headers });
      if (!tickersRes.ok) throw new Error(`Tickers API failed: ${tickersRes.status}`);
      const tickersData = await tickersRes.json();
      const tickersList = tickersData?.data || [];

      // 3. Map coins by ID
      const coinsMap = new Map();
      coinsList.forEach((coin: any) => {
        if (coin.st === 2) { // Only active coins
          coinsMap.set(coin.id.toString(), coin);
        }
      });

      // Optional: Enrich with known descriptions
      const knownData: Record<string, {fn: string, idu: string}> = {
        "GENIUS": { fn: "Genius", idu: "Genius Terminal is the first private and final onchain terminal." },
        "ST": { fn: "Sentio", idu: "Sentio is a unified Web3 observability and data platform that simplifies blockchain infrastructure by integrating indexing, querying, and real-time visualization into a single system." },
        "BILL": { fn: "Billions", idu: "Billions is a secure identity platform that allows both humans and AI to prove who they are online without revealing personal data." },
        "BLEND": { fn: "Fluent", idu: "Fluent is the first blended execution network where EVM, WASM, and SVM (soon) contracts talk to each other like they're written in the same language." },
        "CHIP": { fn: "USD.AI", idu: "Their core mission is to provide fast, non-recourse liquidity against deployed GPUs -unlocking working capital without forcing operators to sell hardware or dilute equity." },
        "CENT": { fn: "Incentiv", idu: "The Incentiv blockchain makes crypto easy, accessible, intuitive, and rewarding by redefining the blockchain experience." },
        "TEA": { fn: "Tea", idu: "Tea is the permissionless network powering the future of open source. Tea anchors open source in cryptography and turns every signed commit into part of a global economy." },
        "SPACESOL": { fn: "Space", idu: "Space is a decentralized prediction market platform built on Solana where you can trade on real-world outcomes across crypto, politics, sports, technology, culture, and more." },
        "MEGA": { fn: "MegaETH", idu: "MegaETH is the first real-time blockchain, where crypto applications leverage extreme performance to reach their full potential." },
        "MENTO": { fn: "MENTO", idu: "Mento is a decentralized, multi-currency stable asset protocol built for creating and exchanging stablecoins without relying on centralized intermediaries." }
      };

      // 4. Join data and calculate fields
      const enrichedData: any[] = [];
      tickersList.forEach((ticker: any) => {
        const coinId = ticker.id.toString();
        if (coinsMap.has(coinId)) {
          const coin = coinsMap.get(coinId);
          const lastPrice = parseFloat(ticker.lp || '0');
          const openPrice = parseFloat(ticker.op || '0');
          const volume = parseFloat(ticker.ra || '0'); // using ra as requested (volume quote)
          const priceChangePct = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
          
          const known = knownData[coin.vn] || { fn: coin.vn, idu: `Pre-market trading for ${coin.vn}.` };

          enrichedData.push({
            id: coin.cd || coin.id.toString(), // use cd or id
            vn: coin.vn,
            fn: known.fn,
            idu: known.idu,
            volume: volume,
            price: lastPrice,
            priceChangePct: priceChangePct
          });
        }
      });

      // 5. Sort by volume descending
      enrichedData.sort((a, b) => b.volume - a.volume);

      // 6. Return top 10
      const topData = enrichedData.slice(0, 10);

      res.json({ success: true, data: topData, count: topData.length });
    } catch (error: any) {
      console.error('Error fetching MEXC data:', error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();