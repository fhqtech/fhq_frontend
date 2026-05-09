"use client";

import { motion } from "framer-motion";

interface HandWrittenTitleProps {
    title?: string;
    subtitle?: string;
    className?: string;
    dark?: boolean;
}

function HandWrittenTitle({
    title = "Hand Written",
    subtitle = "Optional subtitle",
    className = "",
    dark = false,
}: HandWrittenTitleProps) {
    const draw = {
        hidden: { pathLength: 0, opacity: 0 },
        visible: {
            pathLength: 1,
            opacity: 1,
            transition: {
                pathLength: { duration: 2.5, ease: [0.43, 0.13, 0.23, 0.96] },
                opacity: { duration: 0.5 },
            },
        },
    };

    const textColor = dark ? "text-white" : "text-black dark:text-white";
    const subtitleColor = dark ? "text-white/60" : "text-black/80 dark:text-white/80";
    const strokeColor = dark ? "text-white/30" : "text-black dark:text-white opacity-90";

    return (
        <div className={`relative w-full max-w-4xl mx-auto ${className}`} style={{ padding: '60px 40px' }}>
            {/* SVG with proper viewBox that includes padding for the stroke */}
            <div className="absolute inset-0 overflow-visible">
                <motion.svg
                    className="absolute overflow-visible"
                    style={{
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '110%',
                        height: '180%',
                    }}
                    viewBox="0 0 100 100"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    preserveAspectRatio="none"
                >
                    <title>Animated circle</title>
                    <motion.ellipse
                        cx="50"
                        cy="50"
                        rx="48"
                        ry="45"
                        fill="none"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        strokeLinecap="round"
                        variants={draw}
                        className={strokeColor}
                        style={{
                            transform: 'rotate(-2deg)',
                            transformOrigin: 'center',
                        }}
                    />
                </motion.svg>
            </div>
            <div className="relative text-center z-10 flex flex-col items-center justify-center">
                <motion.h2
                    className={`text-4xl md:text-5xl font-bold tracking-tight ${textColor}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                >
                    {title}
                </motion.h2>
                {subtitle && (
                    <motion.p
                        className={`text-lg max-w-2xl mx-auto mt-4 ${subtitleColor}`}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 1, duration: 0.8 }}
                    >
                        {subtitle}
                    </motion.p>
                )}
            </div>
        </div>
    );
}

export { HandWrittenTitle };
