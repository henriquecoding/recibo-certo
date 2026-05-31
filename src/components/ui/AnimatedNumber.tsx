"use client";

import { useState, useEffect, useRef } from "react";
import { fmt } from "@/lib/format";

// Anima a transição entre valores com easing cúbico. Respeita
// `prefers-reduced-motion` saltando direto para o valor final.
export default function AnimatedNumber({
  value,
  format = fmt,
}: {
  value: number;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const frame = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const start = prev.current;
    const end = value;

    if (reduce || start === end) {
      prev.current = end;
      setDisplay(end);
      return;
    }

    const duration = 450;
    const startTime = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (end - start) * eased);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        prev.current = end;
      }
    };
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value]);

  return <span>{format(display)}</span>;
}
