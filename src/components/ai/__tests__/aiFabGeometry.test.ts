import { describe, it, expect } from 'vitest';

import { computePanelGeometry } from '@/components/ai/aiFabGeometry';

const TOP_GAP = 16;
const MIN_PANEL_HEIGHT = 240;

describe('computePanelGeometry — panel never overflows the viewport top', () => {
  it('desktop, no lift: panel fits within the viewport top', () => {
    const g = computePanelGeometry({ innerWidth: 1280, innerHeight: 900, liftPx: 0, isMobile: false });
    expect(g.panelBottom + g.panelMaxHeight + TOP_GAP).toBeLessThanOrEqual(900);
    expect(g.panelMaxHeight).toBeGreaterThanOrEqual(MIN_PANEL_HEIGHT);
    expect(g.panelWidth).toBe(480);
  });

  it('desktop, large lift (footer fully in view): still never exceeds the top', () => {
    const g = computePanelGeometry({ innerWidth: 1280, innerHeight: 900, liftPx: 400, isMobile: false });
    // Either it fits exactly under the top gap, or it has been clamped to the floor.
    expect(g.panelMaxHeight).toBeGreaterThanOrEqual(MIN_PANEL_HEIGHT);
    expect(g.panelBottom + g.panelMaxHeight).toBeLessThanOrEqual(900); // never above the very top
  });

  it('mobile, small viewport with lift: invariant holds', () => {
    const g = computePanelGeometry({ innerWidth: 390, innerHeight: 720, liftPx: 120, isMobile: true });
    expect(g.panelBottom + g.panelMaxHeight).toBeLessThanOrEqual(720);
    expect(g.panelMaxHeight).toBeGreaterThanOrEqual(MIN_PANEL_HEIGHT);
    expect(g.panelWidth).toBeUndefined(); // full-width on mobile
  });

  it('floors the height to a usable minimum even on a tiny viewport', () => {
    const g = computePanelGeometry({ innerWidth: 360, innerHeight: 300, liftPx: 200, isMobile: true });
    expect(g.panelMaxHeight).toBe(MIN_PANEL_HEIGHT);
  });

  it('keeps the panel on-screen horizontally (right inset never negative)', () => {
    const narrow = computePanelGeometry({ innerWidth: 420, innerHeight: 900, liftPx: 0, isMobile: false });
    expect(narrow.panelRight).toBeGreaterThanOrEqual(8);
    const wide = computePanelGeometry({ innerWidth: 1600, innerHeight: 900, liftPx: 0, isMobile: false });
    expect(wide.panelRight).toBe(24); // FAB_INSET on desktop when there's room
  });

  it('lifts the FAB by the (non-negative) lift amount', () => {
    expect(computePanelGeometry({ innerWidth: 1280, innerHeight: 900, liftPx: 0, isMobile: false }).fabBottom).toBe(24);
    expect(computePanelGeometry({ innerWidth: 1280, innerHeight: 900, liftPx: 100, isMobile: false }).fabBottom).toBe(124);
    // negative lift is clamped to 0
    expect(computePanelGeometry({ innerWidth: 1280, innerHeight: 900, liftPx: -50, isMobile: false }).fabBottom).toBe(24);
  });
});
