import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const hlRes = await axios.post('https://api.hyperliquid.xyz/info', { type: 'metaAndAssetCtxs' });
    const [meta, assetCtxs] = hlRes.data;

    const preLaunchTokens: any[] = [];
    for (let i = 0; i < meta.universe.length; i++) {
      const assetMeta = meta.universe[i];
      if (assetMeta.onlyIsolated === true && assetMeta.maxLeverage === 3) {
        const ctx = assetCtxs[i];
        const volume24h = parseFloat(ctx.dayNtlVlm);
        if (volume24h <= 0) continue;
        const markPx = parseFloat(ctx.markPx);
        const prevDayPx = parseFloat(ctx.prevDayPx);
        preLaunchTokens.push({
          name: assetMeta.name,
          volume24h,
          markPrice: markPx,
          prevDayPx,
          priceChangePct: prevDayPx ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0,
          openInterest: parseFloat(ctx.openInterest || '0'),
          funding: parseFloat(ctx.funding || '0')
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
        return { ...token, candles: (candleRes.data || []).map((c: any) => parseFloat(c.c)) };
      } catch(e) {
        return { ...token, candles: [] };
      }
    }));

    enrichedTokens.sort((a, b) => b.volume24h - a.volume24h);
    res.json({ success: true, data: enrichedTokens, count: enrichedTokens.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
