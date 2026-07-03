export const FAB_SIZE = 56;
export const FAB_INSET = 24;
export const PANEL_GAP = 12;

const TOP_GAP = 16;
const MIN_PANEL_HEIGHT = 240;
const DESKTOP_PANEL_WIDTH = 480;

export interface PanelGeometry {
  fabBottom: number;
  panelBottom: number;
  panelRight: number;
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
  const panelRight = Math.max(8, Math.min(panelInset, innerWidth - (panelWidth ?? 0) - 8));
  const panelMaxHeight = Math.max(MIN_PANEL_HEIGHT, innerHeight - panelBottom - TOP_GAP);
  return { fabBottom, panelBottom, panelRight, panelMaxHeight, panelWidth };
}
