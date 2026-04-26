"use client";

import { motion } from "framer-motion";

export function Card({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay }}
      className={`rounded-2xl border border-gold/20 bg-card/80 p-5 shadow-card backdrop-blur-sm md:p-6 ${className}`}
    >
      {children}
    </motion.div>
  );
}
