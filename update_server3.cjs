const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

const newCode = `  app.get('/api/mexc', async (req, res) => {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };

      // 1. Fetch coin list
      const coinsRes = await fetch('https://www.mexc.com/api/gateway/pmt/market/web/all/underlying/type?type=1', { headers });
      if (!coinsRes.ok) throw new Error(\`Coins API failed: \${coinsRes.status}\`);
      const coinsData = await coinsRes.json();
      const coinsList = coinsData?.data || [];

      // 2. Fetch live prices
      const tickersRes = await fetch('https://www.mexc.com/api/gateway/pmt/market/web/underlying/tickers', { headers });
      if (!tickersRes.ok) throw new Error(\`Tickers API failed: \${tickersRes.status}\`);
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
          
          const known = knownData[coin.vn] || { fn: coin.vn, idu: \`Pre-market trading for \${coin.vn}.\` };

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
  });`;

const newLines = [...lines.slice(0, 243), newCode, ...lines.slice(300)];
fs.writeFileSync('server.ts', newLines.join('\n'));
console.log('Updated server.ts with known descriptions');
