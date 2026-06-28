import { useLayoutEffect, useRef, useState } from "react";
import { Tooltip } from "@mantine/core";
import { money, moneyCompact, moneyParens, moneyCompactParens } from "@/format/money";

interface AdaptiveMoneyProps {
  value: number;
  signed?: boolean;
  // Accounting style: negatives wrapped in brackets, positives unsigned.
  accounting?: boolean;
}

// Shows the full rupee figure, but the moment it would overflow its container it
// swaps to the compact form (₹58.40L / ₹5.20Cr) with a tooltip carrying the exact
// amount. Overflow is measured against an always-present hidden full-width node, so
// the decision is stable (switching the visible text to compact can't flip it back
// and forth). It inherits font/size/colour from its parent, so drop it inside a
// styled <Text>. With no layout (SSR / jsdom) it renders the full figure verbatim.
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
      // Full text's natural width vs the available width (+1px tolerance for rounding).
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
      {/* Always-present, out-of-flow full-text node used only for measurement. */}
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
