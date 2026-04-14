import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

function extractTokenName(title: string) {
  if (!title) return '';
  let name = title
    .replace(/market cap \(fdv\).*/i, '')
    .replace(/fdv above.*/i, '')
    .replace(/market cap.*/i, '')
    .replace(/will\s+/i, '')
    .replace(/launch a token.*/i, '')
    .replace(/perform an airdrop.*/i, '')
    .replace(/airdrop by.*/i, '')
    .replace(/launch by.*/i, '')
    .replace(/\?.*/, '')
    .trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function isFDVMarket(question: string) {
  if (!question) return false;
  const q = question.toLowerCase();
  return q.includes('fdv') || q.includes('market cap') || q.match(/[>$]\d+/) !== null || (q.includes('above') && q.includes('one day after launch'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  try {
    const GAMMA_API = 'https://gamma-api.polymarket.com';
    const results: any[] = [];
    const seen = new Set();

    for (let offset = 0; offset < 2000; offset += 500) {
      const r = await axios.get(GAMMA_API + '/events', {
        params: { closed: false, active: true, limit: 500, offset }
      });
      if (!r.data || !Array.isArray(r.data)) break;
      for (const e of r.data) {
        if (seen.has(e.id)) continue;
        const t = (e.title || '').toLowerCase();
        const tags = (e.tags || []).map((tag: any) => (tag.slug || tag.label || '').toLowerCase());
        const isPremarket = t.includes('fdv') || t.includes('one day after launch') || t.includes('launch a token') || t.includes('token launch') || t.includes('airdrop') || t.includes('tge') || t.includes('pre-market') || t.includes('premarket') || tags.some((tag: string) => tag.includes('pre-market') || tag.includes('fdv'));
        if (isPremarket) { seen.add(e.id); results.push(e); }
      }
      if (r.data.length < 500) break;
    }

    const tokenMap = new Map<string, any>();
    for (const event of results) {
      const name = extractTokenName(event.title || '');
      if (!name || name.length < 2) continue;
      const key = name.toLowerCase().trim();
      if (!tokenMap.has(key)) {
        tokenMap.set(key, { id: event.id, title: name, slug: event.slug, volume24hr: 0, volume: 0, liquidity: 0, image: event.image || null, fdvMarkets: [], allMarkets: [] });
      }
      const token = tokenMap.get(key);
      token.volume24hr += parseFloat(event.volume24hr || '0');
      token.volume += parseFloat(event.volume || '0');
      token.liquidity += parseFloat(event.liquidity || '0');
      if (!token.image && event.image) token.image = event.image;
      if (isFDVMarket(event.title || '') && event.slug) token.slug = event.slug;

      for (const m of (event.markets || [])) {
        let mYesPct = null;
        try { const p = JSON.parse(m.outcomePrices || '[]'); if (p.length) mYesPct = Math.round(parseFloat(p[0]) * 100); } catch(e) {}
        const md = { question: m.question, yesPct: mYesPct, volume24hr: parseFloat(m.volume24hr || '0'), volume: parseFloat(m.volume || '0') };
        if (!token.allMarkets.some((x: any) => x.question === m.question)) {
          token.allMarkets.push(md);
          if (isFDVMarket(m.question || '')) token.fdvMarkets.push(md);
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
    }).filter((t: any) => t.volume24hr > 0).sort((a: any, b: any) => b.volume24hr - a.volume24hr).slice(0, 10);

    res.json({ success: true, data: processed, count: processed.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
