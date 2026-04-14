import type { VercelRequest, VercelResponse } from '@vercel/node';

const KNOWN_INFO: Record<string, { fn: string; idu: string }> = {
  "GENIUS": { fn: "Genius", idu: "Genius Terminal is the first private and final onchain terminal." },
  "ST":     { fn: "Sentio", idu: "Sentio is a unified Web3 observability and data platform." },
  "BILL":   { fn: "Billions", idu: "Billions is a secure identity platform." },
  "BLEND":  { fn: "Fluent", idu: "Fluent is the first blended execution network." },
  "CHIP":   { fn: "USD.AI", idu: "Fast, non-recourse liquidity against deployed GPUs." },
  "CENT":   { fn: "Incentiv", idu: "The Incentiv blockchain makes crypto easy and accessible." },
  "TEA":    { fn: "Tea", idu: "Tea is the permissionless network powering the future of open source." },
  "SPACESOL": { fn: "Space", idu: "A decentralized prediction market platform built on Solana." },
  "MEGA":   { fn: "MegaETH", idu: "MegaETH is the first real-time blockchain." },
  "MENTO":  { fn: "MENTO", idu: "Mento is a decentralized multi-currency stable asset protocol." }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // All three endpoints are on api.mexc.com / futures.mexc.com — no Akamai WAF
    const [exchangeInfoRes, futuresRes, spotTickersRes] = await Promise.all([
      fetch('https://api.mexc.com/api/v3/exchangeInfo'),
      fetch('https://futures.mexc.com/api/v1/contract/ticker'),
      fetch('https://api.mexc.com/api/v3/ticker/24hr'),
    ]);

    if (!exchangeInfoRes.ok) throw new Error(`exchangeInfo failed: ${exchangeInfoRes.status}`);
    if (!futuresRes.ok)      throw new Error(`futures ticker failed: ${futuresRes.status}`);
    if (!spotTickersRes.ok)  throw new Error(`spot ticker failed: ${spotTickersRes.status}`);

    const [exchangeInfo, futuresData, spotTickers] = await Promise.all([
      exchangeInfoRes.json(),
      futuresRes.json(),
      spotTickersRes.json(),
    ]);

    const results: any[] = [];
    const seen = new Set<string>();

    // ── Source 1: spot tokens flagged tradeSideType=4 (MEXC's pre-market indicator) ──
    const spotTickerMap = new Map<string, any>();
    (Array.isArray(spotTickers) ? spotTickers : []).forEach((t: any) => {
      spotTickerMap.set(t.symbol, t);
    });

    const liveSpotAssets = new Set<string>(
      (exchangeInfo.symbols || [])
        .filter((s: any) => s.status === '1' && s.isSpotTradingAllowed === true)
        .map((s: any) => s.baseAsset as string)
    );

    for (const sym of (exchangeInfo.symbols || [])) {
      if (sym.tradeSideType !== 4 && sym.status !== '2') continue;
      const base = sym.baseAsset as string;
      if (seen.has(base)) continue;
      seen.add(base);

      const ticker = spotTickerMap.get(sym.symbol);
      const info = KNOWN_INFO[base] || { fn: sym.fullName || base, idu: `Pre-market spot trading for ${base} on MEXC.` };

      results.push({
        id: sym.symbol,
        vn: base,
        fn: info.fn,
        idu: info.idu,
        volume: parseFloat(ticker?.quoteVolume || '0'),
        price: parseFloat(ticker?.lastPrice || '0'),
        priceChangePct: parseFloat(ticker?.priceChangePercent || '0'),
      });
    }

    // ── Source 2: futures on tokens not yet live on spot = pre-launch futures ──
    for (const ft of (futuresData.data || [])) {
      const base = (ft.symbol as string).replace(/_USDT$/, '').replace(/_USD$/, '');
      if (seen.has(base)) continue;
      if (liveSpotAssets.has(base)) continue; // already launched, not pre-market

      // amount24 is 24h volume in USDT; volume24 is in contracts
      const volume = parseFloat(ft.amount24 || '0');
      if (volume <= 0) continue;

      seen.add(base);

      // riseFallRate is a decimal (0.05 = +5%); guard against percentage-form values
      const rawRate = parseFloat(ft.riseFallRate ?? ft.priceChangePercent ?? '0');
      const priceChangePct = Math.abs(rawRate) <= 1 ? rawRate * 100 : rawRate;

      const info = KNOWN_INFO[base] || { fn: base, idu: `Pre-launch futures trading for ${base} on MEXC.` };

      results.push({
        id: ft.symbol,
        vn: base,
        fn: info.fn,
        idu: info.idu,
        volume,
        price: parseFloat(ft.lastPrice || '0'),
        priceChangePct,
      });
    }

    results.sort((a, b) => b.volume - a.volume);
    res.json({ success: true, data: results.slice(0, 10), count: results.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
