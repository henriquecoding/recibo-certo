"use client";

import { m } from "motion/react";
import type { ReactNode } from "react";
import { staggerItem } from "@/lib/motion";

export default function FeatureCard({
  icon,
  title,
  desc,
  accent = false,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <m.div
      variants={staggerItem}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group flex h-full flex-col rounded-4xl border p-6 ${
        accent ? "border-brand bg-brand text-white shadow-glow" : "border-stone-100 bg-white shadow-card hover:shadow-lift"
      } ${className}`}
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${
          accent ? "bg-white/20 text-white" : "bg-brand-light text-brand"
        }`}
      >
        {icon}
      </div>
      <h3 className={`mb-2 text-base font-semibold ${accent ? "text-white" : "text-stone-800"}`}>{title}</h3>
      <p className={`text-sm leading-relaxed ${accent ? "text-green-100" : "text-stone-500"}`}>{desc}</p>
    </m.div>
  );
}
