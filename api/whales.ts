import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    const r = await fetch(
      'https://api.whales.market/v2/tokens?status=active&type=pre_market&page=1&limit=50'
    );
    if (!r.ok) throw new Error(`Whales Market API failed: ${r.status}`);
    const json = await r.json();

    const tokens = (json?.data?.list || [])
      .filter((t: any) => !t.is_banned)
      .map((t: any) => ({
        id: t.id,
        symbol: t.symbol || '',
        name: t.name || t.symbol || '',
        icon: t.icon || '',
        price: parseFloat(t.price ?? t.last_price ?? 0) || 0,
        priceChange: parseFloat(t.price_change?.h24 ?? 0) || 0,
        volume24h: parseFloat(t.volume?.h24 ?? 0) || 0,
        waitingCount: t.waiting_count || 0,
        network: t.network_name || '',
        networkIcon: t.network_icon || '',
        narratives: t.narratives || '',
        totalFundRaise: t.total_fund_raise || 0,
        moniScore: t.moni_score || 0,
      }))
      .sort((a: any, b: any) => b.waitingCount - a.waitingCount)
      .slice(0, 10);

    res.json({ success: true, data: tokens, count: json?.data?.count || 0 });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
