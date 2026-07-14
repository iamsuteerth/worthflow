import { Tooltip } from "@mantine/core";
import { useLayoutEffect, useRef, useState } from "react";

import {
  money,
  moneyCompact,
  moneyParens,
  moneyCompactParens,
} from "@/format/money";

interface AdaptiveMoneyProps {
  value: number;
  signed?: boolean;
  // Accounting style: negatives wrapped in brackets, positives unsigned.
  accounting?: boolean;
}

export function AdaptiveMoney({ value, signed = false, accounting = false }: AdaptiveMoneyProps) {
  const abs = Math.abs(value);
  const sign = signed ? (value >= 0 ? "+" : "−") : "";

  const fullText = accounting
    ? moneyParens(value)
    : signed
      ? `${sign}₹${Math.round(abs).toLocaleString("en-IN")}`
      : money(value);
  const compactText = accounting
    ? moneyCompactParens(value)
    : signed
      ? `${sign}${moneyCompact(abs)}`
      : moneyCompact(value);

  const wrapRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure || typeof ResizeObserver === "undefined") return;

    const evaluate = () => {
      setCompact(measure.scrollWidth > wrap.clientWidth + 1);
    };
    evaluate();
    const ro = new ResizeObserver(evaluate);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fullText]);

  const visible = compact ? (
    <Tooltip
      label={fullText}
      withArrow
      position="top"
      openDelay={150}
      withinPortal
      events={{ hover: true, focus: true, touch: true }}
    >
      <span style={{ whiteSpace: "nowrap", cursor: "default" }}>{compactText}</span>
    </Tooltip>
  ) : (
    <span style={{ whiteSpace: "nowrap" }}>{fullText}</span>
  );

  return (
    <span ref={wrapRef} style={{ display: "block", position: "relative", overflow: "hidden", maxWidth: "100%" }}>
      <span
        ref={measureRef}
        aria-hidden
        style={{ position: "absolute", visibility: "hidden", whiteSpace: "nowrap", pointerEvents: "none" }}
      >
        {fullText}
      </span>
      {visible}
    </span>
  );
}
