import { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";
import { HeroGeometric } from "./components/ui/shape-landing-hero";
import { 
  RefreshCw, 
  TrendingUp, 
  Calendar, 
  ExternalLink, 
  Info, 
  Activity,
  BarChart3,
  X,
  Zap,
  Globe,
  Sparkles,
  Search
} from "lucide-react";

interface Market {
  question: string;
  yesPct: number | null;
  volume24hr: number;
  volume: number;
}

interface TokenData {
  id: string;
  title: string;
  slug: string;
  volume24hr: number;
  volume: number;
  liquidity: number;
  image: string;
  fdvMarkets: Market[];
  allMarkets: Market[];
}

interface HLTokenData {
  name: string;
  volume24h: number;
  markPrice: number;
  prevDayPx: number;
  priceChangePct: number;
  openInterest: number;
  funding: number;
  candles: number[];
}

interface MexcTokenData {
  id: string;
  vn: string;
  fn: string;
  idu: string;
  volume: number;
  price: number;
  priceChangePct: number;
}

interface WhalesTokenData {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  price: number;
  priceChange: number;
  volume24h: number;
  waitingCount: number;
  network: string;
  networkIcon: string;
  narratives: string;
  totalFundRaise: number;
  moniScore: number;
}

const MEXC_KNOWN_DATA: Record<string, { fn: string; idu: string }> = {
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

function processMexcResponse(coinsData: any, tickersData: any): MexcTokenData[] {
  const coinsMap = new Map<string, any>();
  (coinsData?.data || []).forEach((coin: any) => {
    if (coin.st === 2) coinsMap.set(coin.id.toString(), coin);
  });
  const enriched: MexcTokenData[] = [];
  (tickersData?.data || []).forEach((ticker: any) => {
    const coinId = ticker.id.toString();
    if (coinsMap.has(coinId)) {
      const coin = coinsMap.get(coinId);
      const lastPrice = parseFloat(ticker.lp || '0');
      const openPrice = parseFloat(ticker.op || '0');
      const known = MEXC_KNOWN_DATA[coin.vn] || { fn: coin.vn, idu: `Pre-market trading for ${coin.vn}.` };
      enriched.push({
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
  return enriched.sort((a, b) => b.volume - a.volume).slice(0, 10);
}

function formatCurrency(v: number) {
  if (!v) return "$0";
  if (v >= 1e9) return "$" + (v / 1e9).toFixed(1) + "B";
  if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "M";
  if (v >= 1e3) return "$" + (v / 1e3).toFixed(0) + "K";
  return "$" + Math.round(v).toLocaleString();
}

function getTGEData(allMarkets: Market[]) {
  const dateMarkets = allMarkets.filter(m => {
    const q = (m.question || "").toLowerCase();
    return (q.includes("by ") || q.includes("launch") || q.includes("airdrop")) &&
           (q.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i) ||
            q.match(/\b202[5-9]\b/));
  });
  if (!dateMarkets.length) return [];
  const sorted = dateMarkets
    .filter(m => m.yesPct !== null && m.yesPct > 0)
    .sort((a, b) => (b.yesPct || 0) - (a.yesPct || 0));
  return sorted.map(m => {
    const q = m.question || "";
    const dateMatch = q.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/i) ||
                      q.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i) ||
                      q.match(/\b202[5-9]\b/);
    return { 
      label: dateMatch ? dateMatch[0] : (q.match(/by\s+([^?]+)/i)?.[1].trim() || "TBA"), 
      confidence: m.yesPct,
      bestMarket: m
    };
  });
}

function ProbabilityCurve({ pct, color }: { pct: number; color: string }) {
  const points = `0,100 20,${100 - pct * 0.2} 50,${100 - pct * 0.8} 80,${100 - pct * 0.2} 100,100`;
  return (
    <div className="relative h-16 w-full mt-2 overflow-hidden rounded-xl bg-black/20 border border-white/5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-30">
        <motion.polygon 
          initial={{ points: "0,100 20,100 50,100 80,100 100,100" }}
          animate={{ points }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
          fill={color} 
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-black" style={{ color }}>{pct}%</span>
      </div>
    </div>
  );
}

function PriceCurve({ prices, color }: { prices: number[]; color: string }) {
  if (!prices || prices.length === 0) return <div className="h-16 w-full mt-2 bg-black/20 rounded-xl border border-white/5" />;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * 100;
    const y = 100 - (((p - min) / range) * 80 + 10);
    return `${x},${y}`;
  });
  const points = `0,100 ${pts.join(" ")} 100,100`;
  return (
    <div className="relative h-16 w-full mt-2 overflow-hidden rounded-xl bg-black/20 border border-white/5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-30">
        <motion.polygon 
          initial={{ points: "0,100 100,100" }}
          animate={{ points }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
          fill={color} 
        />
      </svg>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <motion.polyline 
          initial={{ points: "0,100 100,100" }}
          animate={{ points: pts.join(" ") }}
          transition={{ duration: 1.5, type: "spring", bounce: 0.4 }}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function FDVDisplay({ market }: { market: Market }) {
  const match = market.question?.match(/[\$>](\d+(?:\.\d+)?)(B|M|K)?/i);
  let label = market.question || "";
  if (match) {
    const n = match[1];
    const unit = (match[2] || "M").toUpperCase();
    label = `$${n}${unit}`;
  }
  const pct = market.yesPct ?? 0;
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-400 font-bold tracking-tight">Highest Prob. FDV</span>
        <span className="text-[11px] font-black text-[#00e5ff]">{label}</span>
      </div>
      <ProbabilityCurve pct={pct} color="#00e5ff" />
    </div>
  );
}

function TGEChartModal({ token, onClose }: { token: TokenData; onClose: () => void }) {
  const tgeList = getTGEData(token.allMarkets).slice(0, 3);
  if (!tgeList.length) return null;
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-[#0f0f0f] border border-[#222] rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#f59e0b]/10 blur-[50px] rounded-full" />
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <h2 className="text-xl font-black text-white mb-1">TGE Predictions</h2>
            <p className="text-gray-500 text-xs">{token.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="relative z-10">
          <div className="flex items-end justify-around h-48 mt-8 gap-4 border-b border-[#222] pb-0">
            {tgeList.map((item, i) => {
              const heightPct = Math.max(item.confidence || 0, 5);
              let shortLabel = item.label;
              const dateMatch = item.label.match(/([A-Za-z]+)\s+\d{1,2},?\s+(\d{4})/);
              if (dateMatch) shortLabel = `${dateMatch[1].slice(0, 3)} '${dateMatch[2].slice(2)}`;
              else if (item.label.match(/202[5-9]/)) shortLabel = item.label.replace(/20(2[5-9])/, "'$1");
              return (
                <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group">
                  <div className="w-full max-w-[60px] bg-[#1a1a1a] rounded-t-xl relative overflow-hidden flex items-end justify-center" style={{ height: '100%' }}>
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1, type: "spring" }}
                      className="w-full bg-gradient-to-t from-[#f59e0b]/20 to-[#f59e0b] rounded-t-xl absolute bottom-0 border-t border-[#f59e0b]"
                    />
                    <span className="relative z-10 mb-2 text-xs font-black text-white drop-shadow-md">{item.confidence}%</span>
                  </div>
                  <div className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center h-8 flex items-start justify-center leading-tight">{shortLabel}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 text-center text-[10px] text-gray-500 uppercase tracking-widest font-bold">Top {tgeList.length} Estimated Dates</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function parseFDV(question: string) {
  const match = question?.match(/[\$>](\d+(?:\.\d+)?)(B|M|K)?/i);
  if (!match) return 0;
  const n = parseFloat(match[1]);
  const unit = (match[2] || "M").toUpperCase();
  if (unit === "B") return n * 1000;
  if (unit === "K") return n / 1000;
  return n;
}

function FDVChartModal({ token, onClose }: { token: TokenData; onClose: () => void }) {
  const topFDVs = [...(token.fdvMarkets || [])].sort((a, b) => (b.yesPct || 0) - (a.yesPct || 0)).slice(0, 3);
  if (!topFDVs.length) return null;
  topFDVs.sort((a, b) => parseFDV(a.question) - parseFDV(b.question));
  const minPct = 0;
  const maxPct = 100;
  const pts = topFDVs.map((m, i) => {
    const x = topFDVs.length > 1 ? (i / (topFDVs.length - 1)) * 100 : 50;
    const y = 100 - (((m.yesPct || 0) - minPct) / (maxPct - minPct)) * 80 - 10;
    return `${x},${y}`;
  });
  const points = `0,100 ${pts.join(" ")} 100,100`;
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="bg-[#0f0f0f] border border-[#222] rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00e5ff]/10 blur-[50px] rounded-full" />
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <h2 className="text-xl font-black text-white mb-1">FDV Probabilities</h2>
            <p className="text-gray-500 text-xs">{token.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="relative z-10 mt-8">
          <div className="relative h-48 w-full overflow-visible">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-20 overflow-visible">
              <motion.polygon initial={{ points: "0,100 100,100" }} animate={{ points }} transition={{ duration: 1, type: "spring", bounce: 0.3 }} fill="#00e5ff" />
            </svg>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full overflow-visible">
              <motion.polyline initial={{ points: "0,100 100,100" }} animate={{ points: pts.join(" ") }} transition={{ duration: 1, type: "spring", bounce: 0.3 }} fill="none" stroke="#00e5ff" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            </svg>
            {topFDVs.map((m, i) => {
              const x = topFDVs.length > 1 ? (i / (topFDVs.length - 1)) * 100 : 50;
              const y = 100 - (((m.yesPct || 0) - minPct) / (maxPct - minPct)) * 80 - 10;
              const match = m.question?.match(/[\$>](\d+(?:\.\d+)?)(B|M|K)?/i);
              let label = m.question || "";
              if (match) { const n = match[1]; const unit = (match[2] || "M").toUpperCase(); label = `$${n}${unit}`; }
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.1 }} className="absolute flex flex-col items-center justify-center" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                  <div className="w-3 h-3 bg-[#00e5ff] rounded-full border-2 border-[#0f0f0f] shadow-[0_0_10px_#00e5ff]" />
                  <div className="absolute bottom-full mb-2 text-white font-black text-sm drop-shadow-md">{Math.round(m.yesPct || 0)}%</div>
                  <div className="absolute top-full mt-4 text-gray-400 font-bold text-[10px] whitespace-nowrap">{label}</div>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-12 text-center text-[10px] text-gray-500 uppercase tracking-widest font-bold">Top {topFDVs.length} FDV Targets</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function TokenCard({ token, onShowTGE, onShowFDV }: { key?: any; token: TokenData; onShowTGE: (t: TokenData) => void; onShowFDV: (t: TokenData) => void }) {
  const tgeList = getTGEData(token.allMarkets);
  const tge = tgeList.length > 0 ? tgeList[0] : null;
  const highestFDV = token.fdvMarkets && token.fdvMarkets.length > 0 
    ? [...token.fdvMarkets].sort((a, b) => (b.yesPct || 0) - (a.yesPct || 0))[0] : null;
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className="bg-[#050505] border border-white/5 rounded-[2rem] p-6 transition-all duration-500 hover:border-white/10 hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] group relative overflow-hidden flex flex-col will-change-transform">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:4px_4px]" /></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#00e5ff]/5 blur-[80px] group-hover:bg-[#00e5ff]/15 transition-colors duration-500 z-0" />
      <div className="flex items-start gap-4 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-lg font-black text-gray-500 overflow-hidden flex-shrink-0 shadow-inner group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white transition-all duration-500">
          {token.image ? <img src={token.image} alt={token.title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" /> : token.title.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-100 truncate mb-1 tracking-tight group-hover:text-white transition-colors">{token.title}</h3>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md backdrop-blur-sm group-hover:bg-white/10 transition-colors"><Activity className="w-3 h-3 text-[#00e5ff]" /><span>{formatCurrency(token.volume24hr)}</span></div>
            <div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md backdrop-blur-sm group-hover:bg-white/10 transition-colors"><TrendingUp className="w-3 h-3 text-[#8b5cf6]" /><span>{formatCurrency(token.volume)}</span></div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4 relative z-10">
        {tge && (
          <button onClick={() => onShowTGE(token)} className="w-full flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-3 hover:bg-white/10 hover:border-white/10 transition-all duration-300 group/tge">
            <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center group-hover/tge:scale-110 group-hover/tge:bg-[#f59e0b]/20 transition-all"><Calendar className="w-4 h-4 text-[#f59e0b]" /></div>
            <div className="text-left"><div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Est. TGE</div><div className="text-sm text-gray-200 font-bold">{tge.label}</div></div>
            <BarChart3 className="w-4 h-4 text-gray-600 ml-auto group-hover/tge:text-[#f59e0b] transition-colors" />
          </button>
        )}
        {highestFDV ? (
          <button onClick={() => onShowFDV(token)} className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/[0.07] hover:border-white/10 transition-all duration-500 text-left w-full group/fdv"><FDVDisplay market={highestFDV} /></button>
        ) : (
          <div className="flex-1 min-h-[80px] flex items-center justify-center border border-dashed border-white/10 rounded-2xl bg-white/5"><span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-3 h-3" /> No FDV Data</span></div>
        )}
      </div>
      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Liquidity <span className="text-gray-300 ml-1">{formatCurrency(token.liquidity)}</span></div>
        <a href={`https://polymarket.com/event/${token.slug}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 text-gray-400"><ExternalLink className="w-3.5 h-3.5" /></a>
      </div>
    </motion.div>
  );
}

function HyperliquidCard({ token }: { token: HLTokenData }) {
  const isPositive = token.priceChangePct >= 0;
  const color = isPositive ? "#00e5ff" : "#f43f5e";
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className="bg-[#050505] border border-white/5 rounded-[2rem] p-6 transition-all duration-500 hover:border-white/10 hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] group relative overflow-hidden flex flex-col will-change-transform">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:4px_4px]" /></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 blur-[80px] transition-colors duration-500 z-0" style={{ backgroundColor: `${color}10` }} />
      <div className="flex items-start gap-4 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-lg font-black text-gray-500 overflow-hidden flex-shrink-0 shadow-inner group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white transition-all duration-500">{token.name.slice(0, 2).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-100 truncate mb-1 tracking-tight group-hover:text-white transition-colors">{token.name}</h3>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest"><div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md backdrop-blur-sm group-hover:bg-white/10 transition-colors"><Activity className="w-3 h-3 text-[#00e5ff]" /><span>{formatCurrency(token.volume24h)}</span></div></div>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4 relative z-10">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.07] transition-colors duration-500">
          <div className="flex justify-between items-end mb-1">
            <div><div className="text-[11px] text-gray-400 font-bold tracking-tight mb-1">Mark Price</div><div className="text-xl font-black text-gray-100">${token.markPrice.toPrecision(4)}</div></div>
            <div className="text-right"><div className="text-[11px] text-gray-400 font-bold tracking-tight mb-1">24h Change</div><div className={`text-sm font-black ${isPositive ? 'text-[#00e5ff]' : 'text-[#f43f5e]'}`}>{isPositive ? '+' : ''}{token.priceChangePct.toFixed(2)}%</div></div>
          </div>
          <PriceCurve prices={token.candles} color={color} />
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
            <div><div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Open Interest</div><div className="text-xs font-bold text-gray-200">{formatCurrency(token.openInterest * token.markPrice)}</div></div>
            <div className="text-right"><div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Funding Rate</div><div className={`text-xs font-bold ${token.funding >= 0 ? 'text-[#f59e0b]' : 'text-[#00e5ff]'}`}>{token.funding >= 0 ? '+' : ''}{(token.funding * 100).toFixed(4)}%</div></div>
          </div>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Trade on Hyperliquid</div>
        <a href={`https://app.hyperliquid.xyz/trade/${token.name}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 text-gray-400"><ExternalLink className="w-3.5 h-3.5" /></a>
      </div>
    </motion.div>
  );
}

function MexcCard({ token }: { token: MexcTokenData }) {
  const isPositive = token.priceChangePct >= 0;
  const color = isPositive ? "#10b981" : "#f43f5e";
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className="bg-[#050505] border border-white/5 rounded-[2rem] p-6 transition-all duration-500 hover:border-white/10 hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] group relative overflow-hidden flex flex-col will-change-transform">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:4px_4px]" /></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 blur-[80px] transition-colors duration-500 z-0" style={{ backgroundColor: `${color}10` }} />
      <div className="flex items-start gap-4 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-lg font-black text-gray-500 overflow-hidden flex-shrink-0 shadow-inner group-hover:bg-white/10 group-hover:border-white/10 group-hover:text-white transition-all duration-500">{token.vn.slice(0, 2).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-100 truncate mb-1 tracking-tight group-hover:text-white transition-colors">{token.fn}</h3>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest"><div className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-md backdrop-blur-sm group-hover:bg-white/10 transition-colors"><span className="text-[#10b981]">{token.vn}</span></div></div>
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-4 relative z-10">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.07] transition-colors duration-500">
          <div className="flex justify-between items-end mb-3">
            <div><div className="text-[11px] text-gray-400 font-bold tracking-tight mb-1">Last Price</div><div className="text-xl font-black text-gray-100">${token.price.toPrecision(4)}</div></div>
            <div className="text-right"><div className="text-[11px] text-gray-400 font-bold tracking-tight mb-1">24h Change</div><div className={`text-sm font-black ${isPositive ? 'text-[#10b981]' : 'text-[#f43f5e]'}`}>{isPositive ? '+' : ''}{token.priceChangePct.toFixed(2)}%</div></div>
          </div>
          <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed border-t border-white/5 pt-3">{token.idu}</p>
        </div>
      </div>
      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Est. Volume <span className="text-gray-300 ml-1">{formatCurrency(token.volume)}</span></div>
        <a href={`https://www.mexc.com/exchange/${token.vn}_USDT`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 text-gray-400"><ExternalLink className="w-3.5 h-3.5" /></a>
      </div>
    </motion.div>
  );
}

function WhalesCard({ token }: { token: WhalesTokenData }) {
  const isPositive = token.priceChange >= 0;
  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -4 }} transition={{ duration: 0.3 }} className="bg-[#050505] border border-white/5 rounded-[2rem] p-6 transition-all duration-500 hover:border-white/10 hover:shadow-[0_8px_30px_rgba(255,255,255,0.04)] group relative overflow-hidden flex flex-col will-change-transform">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-0"><div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:4px_4px]" /></div>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#f59e0b]/5 blur-[80px] group-hover:bg-[#f59e0b]/10 transition-colors duration-500 z-0" />

      {/* Header */}
      <div className="flex items-start gap-4 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-lg font-black text-gray-500 overflow-hidden flex-shrink-0 shadow-inner group-hover:border-white/10 transition-all duration-500">
          {token.icon ? <img src={token.icon} alt={token.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : token.symbol.slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-100 truncate mb-1 tracking-tight group-hover:text-white transition-colors">{token.name}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{token.symbol}</span>
            {token.network && (
              <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
                {token.networkIcon && <img src={token.networkIcon} alt={token.network} className="w-3 h-3 rounded-full" referrerPolicy="no-referrer" onError={e => (e.currentTarget.style.display = 'none')} />}
                <span className="text-[9px] text-gray-400 font-bold">{token.network}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex-1 flex flex-col gap-4 relative z-10">
        <div className="bg-white/5 rounded-2xl p-4 border border-white/5 group-hover:bg-white/[0.07] transition-colors duration-500">
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Demand</div>
              <div className="text-xl font-black text-[#f59e0b]">{token.waitingCount.toLocaleString()}</div>
              <div className="text-[9px] text-gray-600 mt-0.5">waiting</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">Raised</div>
              <div className="text-xl font-black text-gray-100">{token.totalFundRaise > 0 ? formatCurrency(token.totalFundRaise) : '—'}</div>
            </div>
          </div>
          {token.price > 0 && (
            <div className="flex justify-between items-center pt-3 border-t border-white/5">
              <div>
                <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-1">OTC Price</div>
                <div className="text-sm font-black text-gray-100">${token.price.toPrecision(4)}</div>
              </div>
              {token.priceChange !== 0 && (
                <div className={`text-sm font-black ${isPositive ? 'text-[#00e5ff]' : 'text-[#f43f5e]'}`}>
                  {isPositive ? '+' : ''}{token.priceChange.toFixed(2)}%
                </div>
              )}
            </div>
          )}
        </div>

        {token.narratives && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] text-[#f59e0b] font-black uppercase tracking-widest bg-[#f59e0b]/10 border border-[#f59e0b]/20 px-2.5 py-1 rounded-full">
              {token.narratives}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center relative z-10">
        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
          Moni <span className="text-gray-300 ml-1">{token.moniScore.toLocaleString()}</span>
        </div>
        <a href={`https://whales.market/pre-market/${token.symbol.toLowerCase()}`} target="_blank" rel="noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white hover:text-black transition-all duration-300 text-gray-400">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}

function InteractiveBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 40 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);
  useEffect(() => {
    let ticking = false;
    const handleMouseMove = (e: MouseEvent) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          mouseX.set((e.clientX / window.innerWidth) - 0.5);
          mouseY.set((e.clientY / window.innerHeight) - 0.5);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);
  const x1 = useTransform(smoothX, [-0.5, 0.5], [50, -50]);
  const y1 = useTransform(smoothY, [-0.5, 0.5], [50, -50]);
  const x2 = useTransform(smoothX, [-0.5, 0.5], [-50, 50]);
  const y2 = useTransform(smoothY, [-0.5, 0.5], [-50, 50]);
  const x3 = useTransform(smoothX, [-0.5, 0.5], [25, -25]);
  const y3 = useTransform(smoothY, [-0.5, 0.5], [-25, 25]);
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0f172a] via-[#020617] to-black" />
      <motion.div style={{ x: x1, y: y1 }} className="absolute top-[10%] left-[20%] w-[40rem] h-[40rem] bg-[#00e5ff]/[0.04] rounded-full blur-[120px]" />
      <motion.div style={{ x: x2, y: y2 }} className="absolute bottom-[10%] right-[20%] w-[45rem] h-[45rem] bg-[#8b5cf6]/[0.04] rounded-full blur-[150px]" />
      <motion.div style={{ x: x3, y: y3 }} className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[50rem] h-[50rem] bg-[#f59e0b]/[0.03] rounded-full blur-[150px]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-30" style={{ maskImage: 'radial-gradient(circle at center, black 20%, transparent 80%)', WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 80%)' }} />
      <div className="absolute inset-0 opacity-[0.03] mix-blend-screen" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'polymarket' | 'hyperliquid' | 'whales'>('polymarket');
  const [data, setData] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hlData, setHlData] = useState<HLTokenData[]>([]);
  const [hlLoading, setHlLoading] = useState(true);
  const [hlError, setHlError] = useState<string | null>(null);
  const [mexcData, setMexcData] = useState<MexcTokenData[]>([]);
  const [mexcLoading, setMexcLoading] = useState(true);
  const [mexcError, setMexcError] = useState<string | null>(null);
  const [whalesData, setWhalesData] = useState<WhalesTokenData[]>([]);
  const [whalesLoading, setWhalesLoading] = useState(true);
  const [whalesError, setWhalesError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTGE, setSelectedTGE] = useState<TokenData | null>(null);
  const [selectedFDV, setSelectedFDV] = useState<TokenData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await axios.get("/api/premarket");
      if (res.data.success) { setData(res.data.data); setLastUpdated(new Date()); }
      else throw new Error(res.data.error || "Failed to fetch data");
    } catch (e: any) { setError(e.message || "Failed to fetch data."); }
    finally { setLoading(false); }
  };

  const fetchHlData = async () => {
    try {
      setHlLoading(true); setHlError(null);
      const res = await axios.get("/api/hyperliquid");
      if (res.data.success) setHlData(res.data.data);
      else throw new Error(res.data.error || "Failed to fetch HL data");
    } catch (e: any) { setHlError(e.message || "Failed to fetch Hyperliquid data."); }
    finally { setHlLoading(false); }
  };

  const fetchMexcData = async () => {
    try {
      setMexcLoading(true); setMexcError(null);
      const res = await axios.get("/api/mexc");
      if (res.data.success) { setMexcData(res.data.data); setLastUpdated(new Date()); }
      else throw new Error(res.data.error || "Failed to fetch MEXC data");
    } catch (e: any) { setMexcError(e.message || "Failed to fetch MEXC data."); }
    finally { setMexcLoading(false); }
  };

  const fetchWhalesData = async () => {
    try {
      setWhalesLoading(true); setWhalesError(null);
      const res = await axios.get("/api/whales");
      if (res.data.success) { setWhalesData(res.data.data); setLastUpdated(new Date()); }
      else throw new Error(res.data.error || "Failed to fetch Whales Market data");
    } catch (e: any) { setWhalesError(e.message || "Failed to fetch Whales Market data."); }
    finally { setWhalesLoading(false); }
  };

  useEffect(() => {
    fetchData(); fetchHlData(); fetchMexcData(); fetchWhalesData();
    const interval = setInterval(() => { fetchData(); fetchHlData(); fetchMexcData(); fetchWhalesData(); }, 3600000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = data.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.slug.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredHlData = hlData.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredMexcData = mexcData.filter(t => t.vn.toLowerCase().includes(searchQuery.toLowerCase()) || t.fn.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredWhalesData = whalesData.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.symbol.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-transparent text-[#f0f0f0] font-sans selection:bg-[#00e5ff]/30 overflow-x-hidden relative">
      <InteractiveBackground />
      <div className="relative z-10 w-full">
        <HeroGeometric badge="Global Premarket Index" title1="PRE" title2="MARKET" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-16 md:pb-24">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12">
          <div className="flex justify-center gap-4">
            <button onClick={() => setActiveTab('polymarket')} className={`px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'polymarket' ? 'bg-[#00e5ff] text-black shadow-[0_0_20px_rgba(0,229,255,0.4)]' : 'bg-[#111] text-gray-500 hover:text-white border border-[#222]'}`}>Polymarket</button>
            <button onClick={() => setActiveTab('hyperliquid')} className={`px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'hyperliquid' ? 'bg-[#8b5cf6] text-black shadow-[0_0_20px_rgba(139,92,246,0.4)]' : 'bg-[#111] text-gray-500 hover:text-white border border-[#222]'}`}>Hyperliquid</button>
            <button onClick={() => setActiveTab('whales')} className={`px-6 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'whales' ? 'bg-[#f59e0b] text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-[#111] text-gray-500 hover:text-white border border-[#222]'}`}>Whales Market</button>
          </div>
          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-500" /></div>
            <input type="text" placeholder="Search tokens..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#111]/50 border border-[#222] text-white text-sm rounded-full pl-10 pr-4 py-3 focus:outline-none focus:border-[#00e5ff]/50 focus:ring-1 focus:ring-[#00e5ff]/50 transition-all placeholder-gray-600" />
          </div>
        </div>

        {activeTab === 'polymarket' && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 pb-8 border-b border-[#111]">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-8">
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#00e5ff] transition-colors">Tracked Assets</div><div className="text-2xl font-black text-white">{filteredData.length}</div></div>
              <div className="hidden md:block w-px h-8 bg-[#222]" />
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#8b5cf6] transition-colors">Total Volume</div><div className="text-2xl font-black text-white">{formatCurrency(filteredData.reduce((acc, curr) => acc + curr.volume, 0))}</div></div>
            </div>
            <div className="flex items-center gap-6">
              {lastUpdated && <div className="text-[10px] text-gray-600 font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-pulse" />SYNCED {lastUpdated.toLocaleTimeString()}</div>}
              <button onClick={fetchData} disabled={loading} className="group relative bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"><span className="relative z-10 flex items-center gap-2">{loading ? "Syncing..." : "Refresh"}<RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /></span></button>
            </div>
          </div>
        )}

        {activeTab === 'hyperliquid' && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 pb-8 border-b border-[#111]">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-8">
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#8b5cf6] transition-colors">Tracked Perps</div><div className="text-2xl font-black text-white">{hlData.length}</div></div>
              <div className="hidden md:block w-px h-8 bg-[#222]" />
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#8b5cf6] transition-colors">Total Volume</div><div className="text-2xl font-black text-white">{formatCurrency(hlData.reduce((acc, curr) => acc + curr.volume24h, 0))}</div></div>
            </div>
            <div className="flex items-center gap-6">
              {lastUpdated && <div className="text-[10px] text-gray-600 font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse" />SYNCED {lastUpdated.toLocaleTimeString()}</div>}
              <button onClick={fetchHlData} disabled={hlLoading} className="group relative bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"><span className="relative z-10 flex items-center gap-2">{hlLoading ? "Syncing..." : "Refresh"}<RefreshCw className={`w-3 h-3 ${hlLoading ? 'animate-spin' : ''}`} /></span></button>
            </div>
          </div>
        )}

        {activeTab === 'mexc' && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 pb-8 border-b border-[#111]">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-8">
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#10b981] transition-colors">Tracked Coins</div><div className="text-2xl font-black text-white">{mexcData.length}</div></div>
              <div className="hidden md:block w-px h-8 bg-[#222]" />
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#10b981] transition-colors">Total Volume</div><div className="text-2xl font-black text-white">{formatCurrency(mexcData.reduce((acc, curr) => acc + curr.volume, 0))}</div></div>
            </div>
            <div className="flex items-center gap-6">
              {lastUpdated && <div className="text-[10px] text-gray-600 font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />SYNCED {lastUpdated.toLocaleTimeString()}</div>}
              <button onClick={fetchMexcData} disabled={mexcLoading} className="group relative bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"><span className="relative z-10 flex items-center gap-2">{mexcLoading ? "Syncing..." : "Refresh"}<RefreshCw className={`w-3 h-3 ${mexcLoading ? 'animate-spin' : ''}`} /></span></button>
            </div>
          </div>
        )}

        {activeTab === 'whales' && (
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 pb-8 border-b border-[#111]">
            <div className="flex flex-wrap justify-center md:justify-start items-center gap-8">
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#f59e0b] transition-colors">Tracked Tokens</div><div className="text-2xl font-black text-white">{filteredWhalesData.length}</div></div>
              <div className="hidden md:block w-px h-8 bg-[#222]" />
              <div className="group"><div className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1 group-hover:text-[#f59e0b] transition-colors">Total Waiting</div><div className="text-2xl font-black text-white">{filteredWhalesData.reduce((a, t) => a + t.waitingCount, 0).toLocaleString()}</div></div>
            </div>
            <div className="flex items-center gap-6">
              {lastUpdated && <div className="text-[10px] text-gray-600 font-bold flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />SYNCED {lastUpdated.toLocaleTimeString()}</div>}
              <button onClick={fetchWhalesData} disabled={whalesLoading} className="group relative bg-white text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all active:scale-95 disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)]"><span className="relative z-10 flex items-center gap-2">{whalesLoading ? "Syncing..." : "Refresh"}<RefreshCw className={`w-3 h-3 ${whalesLoading ? 'animate-spin' : ''}`} /></span></button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {(error || hlError || whalesError) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4 mb-8 flex items-center gap-3">
              <Info className="w-5 h-5 text-red-500" />
              <p className="text-red-500/90 text-xs font-bold uppercase tracking-wider">{activeTab === 'polymarket' ? error : activeTab === 'hyperliquid' ? hlError : whalesError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'polymarket' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading && data.length === 0 ? [...Array(8)].map((_, i) => <div key={i} className="h-[380px] bg-[#111]/50 border border-[#222] rounded-[2rem] animate-pulse" />) : (
              <AnimatePresence mode="popLayout">{filteredData.map((token) => <TokenCard key={token.id} token={token} onShowTGE={setSelectedTGE} onShowFDV={setSelectedFDV} />)}</AnimatePresence>
            )}
          </div>
        )}

        {activeTab === 'hyperliquid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {hlLoading && hlData.length === 0 ? [...Array(8)].map((_, i) => <div key={i} className="h-[380px] bg-[#111]/50 border border-[#222] rounded-[2rem] animate-pulse" />) : (
              <AnimatePresence mode="popLayout">{filteredHlData.map((token) => <HyperliquidCard key={token.name} token={token} />)}</AnimatePresence>
            )}
          </div>
        )}

        {activeTab === 'whales' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {whalesLoading && whalesData.length === 0 ? [...Array(8)].map((_, i) => <div key={i} className="h-[380px] bg-[#111]/50 border border-[#222] rounded-[2rem] animate-pulse" />) : (
              <AnimatePresence mode="popLayout">{filteredWhalesData.map((token) => <WhalesCard key={token.id} token={token} />)}</AnimatePresence>
            )}
          </div>
        )}

        {activeTab === 'polymarket' && !loading && filteredData.length === 0 && !error && (<div className="text-center py-32 bg-[#111]/30 border border-[#222] rounded-[3rem] border-dashed backdrop-blur-sm"><BarChart3 className="w-12 h-12 text-gray-700 mx-auto mb-4" /><h3 className="text-gray-300 text-lg font-black tracking-tight">No active markets detected</h3><p className="text-gray-500 text-sm mt-2">Try adjusting your search or check back later.</p></div>)}
        {activeTab === 'hyperliquid' && !hlLoading && filteredHlData.length === 0 && !hlError && (<div className="text-center py-32 bg-[#111]/30 border border-[#222] rounded-[3rem] border-dashed backdrop-blur-sm"><BarChart3 className="w-12 h-12 text-gray-700 mx-auto mb-4" /><h3 className="text-gray-300 text-lg font-black tracking-tight">No active pre-launch perps detected</h3><p className="text-gray-500 text-sm mt-2">Try adjusting your search or check back later.</p></div>)}
        {activeTab === 'whales' && !whalesLoading && filteredWhalesData.length === 0 && !whalesError && (<div className="text-center py-32 bg-[#111]/30 border border-[#222] rounded-[3rem] border-dashed backdrop-blur-sm"><BarChart3 className="w-12 h-12 text-gray-700 mx-auto mb-4" /><h3 className="text-gray-300 text-lg font-black tracking-tight">No pre-market tokens found</h3><p className="text-gray-500 text-sm mt-2">Try adjusting your search or check back later.</p></div>)}

        <AnimatePresence>
          {selectedTGE && <TGEChartModal token={selectedTGE} onClose={() => setSelectedTGE(null)} />}
          {selectedFDV && <FDVChartModal token={selectedFDV} onClose={() => setSelectedFDV(null)} />}
        </AnimatePresence>
      </div>
    </div>
  );
}