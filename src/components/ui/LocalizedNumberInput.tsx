"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import {
  numericDraftOnBlur,
  numericValueToDraft,
  parseNumericDraft,
  sanitizeNumericDraft,
} from "@/lib/numeric-input";

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "defaultValue" | "onChange" | "min" | "max"
>;

export interface LocalizedNumberInputProps extends NativeProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  maxDecimals?: number;
}

/** Input numérico controlado que aceita pt-PT sem os problemas de `type=number`. */
export default function LocalizedNumberInput({
  value,
  onValueChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  maxDecimals = 2,
  onFocus,
  onBlur,
  ...props
}: LocalizedNumberInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(
    value === 0 ? "" : numericValueToDraft(value, { maxDecimals }),
  );

  useEffect(() => {
    if (!focused) {
      setDraft(value === 0 ? "" : numericValueToDraft(value, { maxDecimals }));
    }
  }, [focused, maxDecimals, value]);

  return (
    <input
      {...props}
      type="text"
      inputMode={maxDecimals === 0 ? "numeric" : "decimal"}
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onChange={(event) => {
        const next = sanitizeNumericDraft(event.target.value, { maxDecimals });
        const parsed = parseNumericDraft(next, { maxDecimals });
        const constrained = parsed === null ? min : Math.min(max, Math.max(min, parsed));
        setDraft(parsed !== null && parsed > max
          ? numericValueToDraft(max, { maxDecimals })
          : next);
        onValueChange(constrained);
      }}
      onBlur={(event) => {
        setFocused(false);
        const normalized = numericDraftOnBlur(draft, value, {
          min,
          max,
          maxDecimals,
        });
        setDraft(normalized.value === 0 ? "" : normalized.draft);
        onValueChange(normalized.value);
        onBlur?.(event);
      }}
    />
  );
}
