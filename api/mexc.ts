export const config = {
  runtime: 'edge',
};

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

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
  };

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://www.mexc.com',
      'Referer': 'https://www.mexc.com/markets/premarket',
      'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
    };

    const [coinsRes, tickersRes] = await Promise.all([
      fetch('https://www.mexc.com/api/gateway/pmt/market/web/all/underlying/type?type=1', { headers }),
      fetch('https://www.mexc.com/api/gateway/pmt/market/web/underlying/tickers', { headers })
    ]);

    if (!coinsRes.ok) throw new Error(`Coins API failed: ${coinsRes.status}`);
    if (!tickersRes.ok) throw new Error(`Tickers API failed: ${tickersRes.status}`);

    const [coinsData, tickersData] = await Promise.all([coinsRes.json(), tickersRes.json()]);

    const coinsMap = new Map<string, any>();
    (coinsData?.data || []).forEach((coin: any) => {
      if (coin.st === 2) coinsMap.set(coin.id.toString(), coin);
    });

    const enrichedData: any[] = [];
    (tickersData?.data || []).forEach((ticker: any) => {
      const coinId = ticker.id.toString();
      if (coinsMap.has(coinId)) {
        const coin = coinsMap.get(coinId);
        const lastPrice = parseFloat(ticker.lp || '0');
        const openPrice = parseFloat(ticker.op || '0');
        const known = knownData[coin.vn] || { fn: coin.vn, idu: `Pre-market trading for ${coin.vn}.` };
        enrichedData.push({
          id: coin.cd || coin.id.toString(),
          vn: coin.vn,
          fn: known.fn,
          idu: known.idu,
          volume: parseFloat(ticker.ra || '0'),
          price: lastPrice,
          priceChangePct: openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0
        });
      }
    });

    enrichedData.sort((a, b) => b.volume - a.volume);
    return Response.json(
      { success: true, data: enrichedData.slice(0, 10), count: enrichedData.length },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
