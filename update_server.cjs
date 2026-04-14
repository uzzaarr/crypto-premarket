const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');
const lines = content.split('\n');

const newCode = `  app.get('/api/mexc', async (req, res) => {
    try {
      const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };

      // 1. Fetch coin list
      const coinsRes = await axios.get('https://www.mexc.com/api/gateway/pmt/market/web/all/underlying/type?type=1', { headers });
      const coinsList = coinsRes.data?.data || [];

      // 2. Fetch live prices
      const tickersRes = await axios.get('https://www.mexc.com/api/gateway/pmt/market/web/underlying/tickers', { headers });
      const tickersList = tickersRes.data?.data || [];

      // 3. Map coins by ID
      const coinsMap = new Map();
      coinsList.forEach((coin: any) => {
        if (coin.st === 2) { // Only active coins
          coinsMap.set(coin.id.toString(), coin);
        }
      });

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

          enrichedData.push({
            id: coin.cd || coin.id.toString(), // use cd or id
            vn: coin.vn,
            fn: coin.vn, // full name not provided, fallback to symbol
            idu: \`Pre-market trading for \${coin.vn}.\`, // generic description
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

const newLines = [...lines.slice(0, 243), newCode, ...lines.slice(548)];
fs.writeFileSync('server.ts', newLines.join('\n'));
console.log('Updated server.ts');
