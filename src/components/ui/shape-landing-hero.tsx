"use client";

import { motion } from "motion/react";
import { Circle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useEffect, useState } from "react";

function CryptoChartBackground() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!mounted) return null;

    // Generate deterministic random values for volume bars
    const volumeBars = Array.from({ length: 30 }).map((_, i) => {
        const height = 20 + ((i * 17) % 80);
        const isUp = i % 3 !== 0;
        return { height, isUp };
    });

    const candlesticks = [
        {x: 100, y: 320, up: true},
        {x: 200, y: 340, up: false},
        {x: 300, y: 280, up: true},
        {x: 400, y: 290, up: false},
        {x: 500, y: 200, up: true},
        {x: 600, y: 220, up: false},
        {x: 700, y: 150, up: true},
        {x: 800, y: 180, up: false},
        {x: 900, y: 80, up: true},
        {x: 1000, y: 100, up: false},
        {x: 1100, y: 40, up: true},
    ];

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Faint grid background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_40%,transparent_100%)]" />
            
            {/* Animated Chart SVG */}
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

                {/* Volume Bars */}
                <g className="opacity-20">
                    {volumeBars.map((bar, i) => (
                        <motion.rect
                            key={`vol-${i}`}
                            x={i * 40 + 10}
                            y={400 - bar.height}
                            width="20"
                            height={bar.height}
                            fill={bar.isUp ? "#00e5ff" : "#f43f5e"}
                            initial={{ scaleY: 0, transformOrigin: "bottom" }}
                            animate={{ scaleY: 1 }}
                            transition={{ duration: 1.5, delay: i * 0.03, ease: "easeOut" }}
                        />
                    ))}
                </g>

                {/* Area Fill */}
                <motion.path
                    d="M0 350 L 100 320 L 200 340 L 300 280 L 400 290 L 500 200 L 600 220 L 700 150 L 800 180 L 900 80 L 1000 100 L 1100 40 L 1200 20 L 1200 400 L 0 400 Z"
                    fill="url(#area-grad)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2, delay: 0.5 }}
                />

                {/* Main Line */}
                <motion.path
                    d="M0 350 L 100 320 L 200 340 L 300 280 L 400 290 L 500 200 L 600 220 L 700 150 L 800 180 L 900 80 L 1000 100 L 1100 40 L 1200 20"
                    stroke="url(#line-grad)"
                    strokeWidth="3"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                />

                {/* Candlesticks along the line */}
                <g>
                    {candlesticks.map((pt, i) => (
                        <motion.g 
                            key={`candle-${i}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1 + i * 0.1 }}
                        >
                            {/* Wick */}
                            <line x1={pt.x} y1={pt.y - 15} x2={pt.x} y2={pt.y + 15} stroke={pt.up ? "#00e5ff" : "#f43f5e"} strokeWidth="2" opacity="0.6" />
                            {/* Body */}
                            <rect x={pt.x - 4} y={pt.up ? pt.y - 8 : pt.y - 2} width="8" height="10" fill={pt.up ? "#00e5ff" : "#f43f5e"} opacity="0.8" />
                        </motion.g>
                    ))}
                </g>
            </svg>

            {/* Floating particles (very lightweight) */}
            <div className="absolute inset-0">
                {Array.from({ length: 15 }).map((_, i) => (
                    <motion.div
                        key={`particle-${i}`}
                        className="absolute w-1 h-1 rounded-full bg-[#00e5ff]"
                        style={{
                            left: `${10 + (i * 7) % 80}%`,
                            top: `${20 + (i * 13) % 60}%`,
                            opacity: 0.2
                        }}
                        animate={{
                            y: [0, -15, 0],
                            opacity: [0.1, 0.5, 0.1]
                        }}
                        transition={{
                            duration: 3 + (i % 4),
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "easeInOut",
                            delay: i * 0.2
                        }}
                    />
                ))}
            </div>
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
    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                duration: 1,
                delay: 0.5 + i * 0.2,
                ease: [0.25, 0.4, 0.25, 1],
            },
        }),
    };

    return (
        <div className="relative w-full flex items-center justify-center overflow-hidden pt-24 pb-12">
            {/* Removed heavy blur-3xl gradient for performance */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/[0.02] via-transparent to-[#00e5ff]/[0.02]" />

            <CryptoChartBackground />

            <div className="relative z-10 container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                        custom={0}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-12"
                    >
                        <Circle className="h-2 w-2 fill-[#00e5ff]/80 text-[#00e5ff]" />
                        <span className="text-sm text-white/60 tracking-wide">
                            {badge}
                        </span>
                    </motion.div>

                    <motion.div
                        custom={1}
                        variants={fadeUpVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <h1 className="text-5xl sm:text-7xl md:text-8xl font-display font-bold mb-6 md:mb-8 tracking-tighter">
                            <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                                {title1}
                            </span>
                            <br />
                            <span
                                className={cn(
                                    "bg-clip-text text-transparent bg-gradient-to-r from-[#00e5ff] via-white/90 to-[#8b5cf6] "
                                )}
                            >
                                {title2}
                            </span>
                        </h1>
                    </motion.div>
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-transparent pointer-events-none" />
        </div>
    );
}

export { HeroGeometric }
