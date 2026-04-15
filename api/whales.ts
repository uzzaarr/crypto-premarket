import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // The API ignores ?status= filters server-side, so we must fetch all pages
    // and filter for status === 'active' ourselves.
    const firstRes = await fetch('https://api.whales.market/v2/tokens?page=1&limit=10');
    if (!firstRes.ok) throw new Error(`Whales API failed: ${firstRes.status}`);
    const firstJson = await firstRes.json();

    const total: number = firstJson?.data?.count || 500;
    const totalPages = Math.ceil(total / 10);

    // Fetch all remaining pages in parallel — they resolve together so total
    // latency ≈ one request, well within Vercel's function timeout.
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) =>
        fetch(`https://api.whales.market/v2/tokens?page=${i + 2}&limit=10`)
          .then(r => r.ok ? r.json() : { data: { list: [] } })
          .then(j => (j?.data?.list || []) as any[])
          .catch(() => [] as any[])
      )
    );

    const all: any[] = [...(firstJson?.data?.list || []), ...rest.flat()];

    const result = all
      .filter(t => t.status === 'active' && !t.is_banned)
      .map(t => ({
        id: t.id,
        symbol: t.symbol || '',
        name: t.name || t.symbol || '',
        icon: t.icon || '',
        price: parseFloat(t.price ?? t.last_price ?? 0) || 0,
        priceChange: parseFloat(t.price_change?.h24 ?? 0) || 0,
        volume24h: parseFloat(t.volume?.h24 ?? 0) || 0,
        network: t.network_name || '',
        networkIcon: t.network_icon || '',
        narratives: t.narratives || '',
        totalFundRaise: t.total_fund_raise || 0,
        moniScore: t.moni_score || 0,
      }))
      .sort((a, b) => b.moniScore - a.moniScore || b.totalFundRaise - a.totalFundRaise)
      .slice(0, 10);

    res.json({ success: true, data: result, count: result.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
