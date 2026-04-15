"use client";

import { Circle } from "lucide-react";
import { cn } from "../../lib/utils";

const volumeBars = Array.from({ length: 30 }).map((_, i) => ({
    height: 20 + ((i * 17) % 80),
    isUp: i % 3 !== 0,
}));

const candlesticks = [
    {x: 100, y: 320, up: true},
    {x: 200, y: 340, up: false},
    {x: 300, y: 280, up: true},
    {x: 400, y: 290, up: false},
    {x: 500, y: 200, up: true},
    {x: 600, y: 220, up: false},
    {x: 700, y: 150, up: true},
    {x: 800, y: 180, up: false},
    {x: 900, y: 80,  up: true},
    {x: 1000, y: 100, up: false},
    {x: 1100, y: 40,  up: true},
];

function CryptoChartBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]" />

            <svg className="absolute w-full h-full opacity-60" viewBox="0 0 1200 400" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="line-grad" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#8b5cf6" stopOpacity="0" />
                        <stop offset="0.3" stopColor="#8b5cf6" />
                        <stop offset="0.7" stopColor="#00e5ff" />
                        <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="400" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#00e5ff" stopOpacity="0.15" />
                        <stop offset="1" stopColor="#00e5ff" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Volume bars — static */}
                <g opacity="0.2">
                    {volumeBars.map((bar, i) => (
                        <rect
                            key={i}
                            x={i * 40 + 10}
                            y={400 - bar.height}
                            width="20"
                            height={bar.height}
                            fill={bar.isUp ? "#00e5ff" : "#f43f5e"}
                        />
                    ))}
                </g>

                {/* Area fill — static */}
                <path
                    d="M0 350 L 100 320 L 200 340 L 300 280 L 400 290 L 500 200 L 600 220 L 700 150 L 800 180 L 900 80 L 1000 100 L 1100 40 L 1200 20 L 1200 400 L 0 400 Z"
                    fill="url(#area-grad)"
                />

                {/* Main line — static */}
                <path
                    d="M0 350 L 100 320 L 200 340 L 300 280 L 400 290 L 500 200 L 600 220 L 700 150 L 800 180 L 900 80 L 1000 100 L 1100 40 L 1200 20"
                    stroke="url(#line-grad)"
                    strokeWidth="3"
                    fill="none"
                />

                {/* Candlesticks — static */}
                <g opacity="1">
                    {candlesticks.map((pt, i) => (
                        <g key={i}>
                            <line x1={pt.x} y1={pt.y - 15} x2={pt.x} y2={pt.y + 15}
                                stroke={pt.up ? "#00e5ff" : "#f43f5e"} strokeWidth="2" opacity="0.6" />
                            <rect x={pt.x - 4} y={pt.up ? pt.y - 8 : pt.y - 2}
                                width="8" height="10"
                                fill={pt.up ? "#00e5ff" : "#f43f5e"} opacity="0.8" />
                        </g>
                    ))}
                </g>
            </svg>
        </div>
    );
}

function HeroGeometric({
    badge = "Design Collective",
    title1 = "Elevate Your Digital Vision",
    title2 = "Crafting Exceptional Websites",
}: {
    badge?: string;
    title1?: string;
    title2?: string;
}) {
    return (
        <div className="relative w-full flex items-center justify-center overflow-hidden pt-24 pb-12">
            <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/[0.02] via-transparent to-[#00e5ff]/[0.02]" />

            <CryptoChartBackground />

            <div className="relative z-10 container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12">
                        <Circle className="h-2 w-2 fill-[#00e5ff]/80 text-[#00e5ff]" />
                        <span className="text-sm text-white/60 tracking-wide">
                            {badge}
                        </span>
                    </div>

                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-bold mb-6 md:mb-8 tracking-tighter">
                        <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                            {title1}
                        </span>
                        <br />
                        <span className={cn("bg-clip-text text-transparent bg-gradient-to-r from-[#00e5ff] via-white/90 to-[#8b5cf6]")}>
                            {title2}
                        </span>
                    </h1>
                </div>
            </div>
        </div>
    );
}

export { HeroGeometric }
