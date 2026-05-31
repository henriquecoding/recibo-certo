"use client";

import { useEffect, useRef } from "react";
import { animate, m, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { EASE } from "@/lib/motion";

// Conta de 0 até `value` quando entra no viewport. Respeita reduced-motion.
export default function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  durationMs = 1300,
  className = "",
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  durationMs?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);

  const text = useTransform(mv, (v) => {
    const n = new Intl.NumberFormat("pt-PT", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
    return `${prefix}${n}${suffix}`;
  });

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: durationMs / 1000, ease: EASE });
    return () => controls.stop();
  }, [inView, value, reduce, durationMs, mv]);

  return (
    <span ref={ref} className={className}>
      <m.span>{text}</m.span>
    </span>
  );
}
