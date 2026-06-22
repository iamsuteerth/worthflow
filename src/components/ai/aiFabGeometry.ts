// Pure geometry for the floating AI panel + FAB. Extracted from AiFab so the
// "panel must never overflow the top of the viewport" rule (the maxHeight clamp)
// is unit-testable without a DOM. See AUDIT.dev.md §5.

export const FAB_SIZE = 56;
export const FAB_INSET = 24;
export const PANEL_GAP = 12;

const TOP_GAP = 16; // never let the panel touch the very top edge
const MIN_PANEL_HEIGHT = 240; // keep header + composer (and a little list) visible
const DESKTOP_PANEL_WIDTH = 480;

export interface PanelGeometry {
  fabBottom: number;
  panelBottom: number;
  panelRight: number;
  /** Hard cap so the panel can never extend above the top of the viewport. */
  panelMaxHeight: number;
  panelWidth?: number;
}

export function computePanelGeometry(opts: {
  innerWidth: number;
  innerHeight: number;
  liftPx: number;
  isMobile: boolean;
}): PanelGeometry {
  const { innerWidth, innerHeight, liftPx, isMobile } = opts;

  const panelWidth = isMobile ? undefined : DESKTOP_PANEL_WIDTH;
  const panelInset = isMobile ? 16 : FAB_INSET;

  const fabBottom = FAB_INSET + Math.max(0, liftPx);
  const panelBottom = fabBottom + FAB_SIZE + PANEL_GAP;

  // Keep the panel fully on-screen horizontally (never negative / off the right edge).
  const panelRight = Math.max(8, Math.min(panelInset, innerWidth - (panelWidth ?? 0) - 8));

  // THE FIX: as the FAB (and thus panelBottom) lifts near the footer, the panel
  // shrinks instead of overflowing off the top of the screen.
  const panelMaxHeight = Math.max(MIN_PANEL_HEIGHT, innerHeight - panelBottom - TOP_GAP);

  return { fabBottom, panelBottom, panelRight, panelMaxHeight, panelWidth };
}
