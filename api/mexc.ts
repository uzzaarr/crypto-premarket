import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    const coinsRes = await fetch('https://www.mexc.com/api/gateway/pmt/market/web/all/underlying/type?type=1', { headers });
    if (!coinsRes.ok) throw new Error(`Coins API failed: ${coinsRes.status}`);
    const coinsData = await coinsRes.json();

    const tickersRes = await fetch('https://www.mexc.com/api/gateway/pmt/market/web/underlying/tickers', { headers });
    if (!tickersRes.ok) throw new Error(`Tickers API failed: ${tickersRes.status}`);
    const tickersData = await tickersRes.json();

    const coinsMap = new Map();
    (coinsData?.data || []).forEach((coin: any) => {
      if (coin.st === 2) coinsMap.set(coin.id.toString(), coin);
    });

    const knownData: Record<string, { fn: string; idu: string }> = {
      "GENIUS": { fn: "Genius", idu: "Genius Terminal is the first private and final onchain terminal." },
      "ST": { fn: "Sentio", idu: "Sentio is a unified Web3 observability and data platform." },
      "BILL": { fn: "Billions", idu: "Billions is a secure identity platform." },
      "BLEND": { fn: "Fluent", idu: "Fluent is the first blended execution network." },
      "CHIP": { fn: "USD.AI", idu: "Fast, non-recourse liquidity against deployed GPUs." },
      "CENT": { fn: "Incentiv", idu: "The Incentiv blockchain makes crypto easy and accessible." },
      "TEA": { fn: "Tea", idu: "Tea is the permissionless network powering the future of open source." },
      "SPACESOL": { fn: "Space", idu: "A decentralized prediction market platform built on Solana." },
      "MEGA": { fn: "MegaETH", idu: "MegaETH is the first real-time blockchain." },
      "MENTO": { fn: "MENTO", idu: "Mento is a decentralized multi-currency stable asset protocol." }
    };

    const enrichedData: any[] = [];
    (tickersData?.data || []).forEach((ticker: any) => {
      const coinId = ticker.id.toString();
      if (coinsMap.has(coinId)) {
        const coin = coinsMap.get(coinId);
        const lastPrice = parseFloat(ticker.lp || '0');
        const openPrice = parseFloat(ticker.op || '0');
        const volume = parseFloat(ticker.ra || '0');
        const priceChangePct = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
        const known = knownData[coin.vn] || { fn: coin.vn, idu: `Pre-market trading for ${coin.vn}.` };
        enrichedData.push({
          id: coin.cd || coin.id.toString(),
          vn: coin.vn,
          fn: known.fn,
          idu: known.idu,
          volume,
          price: lastPrice,
          priceChangePct
        });
      }
    });

    enrichedData.sort((a, b) => b.volume - a.volume);
    res.json({ success: true, data: enrichedData.slice(0, 10), count: Math.min(enrichedData.length, 10) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
