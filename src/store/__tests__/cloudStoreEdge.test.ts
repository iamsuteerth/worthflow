import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.hoisted(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  }
});

const storage = vi.hoisted(() => ({
  loadManifest: vi.fn(),
  loadManifestWithETag: vi.fn(),
  saveManifest: vi.fn(),
  uploadSave: vi.fn(),
  downloadSave: vi.fn(),
  deleteSave: vi.fn(),
  generateSaveKey: vi.fn(() => 'new-key.wfplan'),
}));
vi.mock('@/lib/storage', () => storage);

import { baseConfig, m } from '@/engine/__tests__/factories';
import { encodeBase64 } from '@/engine/base64';
import { calculateChecksum } from '@/engine/checksum';
import { useCloudStore } from '@/store/cloudStore';
import { usePlannerStore } from '@/store/plannerStore';

const META = { label: 'x', networth: 0, timeframeMonths: 12, createdAt: '2026-01-01T00:00:00.000Z' };

// A real .wfplan envelope, exactly as serializePlan writes it, so autoLoadLatest
// exercises the genuine importPlan validation path.
async function wfplanContent(totalMonths: number): Promise<string> {
  const data = {
    baseConfig: baseConfig({ forecast: { startMonth: m('2025-01'), totalMonths } }),
    overrides: {},
    savedScenarios: [],
    history: { past: [], future: [] },
  };
  const payload = encodeBase64(JSON.stringify(data));
  const checksum = await calculateChecksum(payload);
  return JSON.stringify({
    app: 'wealth-forecast',
    version: 3,
    exportedAt: new Date().toISOString(),
    payload,
    checksum,
  });
}

function preconditionFailed(): Error {
  const e = new Error('precondition failed') as Error & { name: string };
  e.name = 'PreconditionFailed';
  return e;
}

beforeEach(() => {
  vi.clearAllMocks();
  storage.generateSaveKey.mockReturnValue('new-key.wfplan');
  usePlannerStore.getState().loadPlan(
    baseConfig({ forecast: { startMonth: m('2025-01'), totalMonths: 12 } }),
    {},
    [],
  );
  useCloudStore.setState({ saves: [], savesLoading: false, savesError: null, initialLoadFailed: false });
});

describe('cloudStore.autoLoadLatest — bootstrap edges', () => {
  it('keeps a dirty local plan instead of clobbering it with the cloud copy', async () => {
    storage.loadManifest.mockResolvedValue([{ key: 'a.wfplan', ...META }]);
    // Make the rehydrated plan dirty (an unsaved scenario change).
    usePlannerStore.getState().addTransientOneOffExpense(m('2025-03'), 10_000, 'unsaved edit');
    expect(usePlannerStore.getState().isPlanDirty()).toBe(true);

    const loaded = await useCloudStore.getState().autoLoadLatest();

    expect(loaded).toBe(false);
    expect(storage.downloadSave).not.toHaveBeenCalled();
    // the saves list is still populated for the profile UI
    expect(useCloudStore.getState().saves).toHaveLength(1);
    // the unsaved edit survived
    expect(usePlannerStore.getState().overrides.runtimeEvents).toHaveLength(1);
  });

  it('routes a fresh user (no saves) to the builder', async () => {
    storage.loadManifest.mockResolvedValue([]);
    const loaded = await useCloudStore.getState().autoLoadLatest();
    expect(loaded).toBe(false);
    expect(usePlannerStore.getState().activeView).toBe('builder');
    expect(storage.downloadSave).not.toHaveBeenCalled();
  });

  it('loads the NEWEST save by createdAt and routes to the forecast', async () => {
    storage.loadManifest.mockResolvedValue([
      { key: 'old.wfplan', ...META, createdAt: '2026-01-01T00:00:00.000Z' },
      { key: 'newer.wfplan', ...META, createdAt: '2026-06-01T00:00:00.000Z' },
    ]);
    storage.downloadSave.mockResolvedValue(await wfplanContent(48));

    const loaded = await useCloudStore.getState().autoLoadLatest();

    expect(loaded).toBe(true);
    expect(storage.downloadSave).toHaveBeenCalledWith('newer.wfplan');
    expect(usePlannerStore.getState().activeView).toBe('forecast');
    // the imported plan actually replaced the local one
    expect(usePlannerStore.getState().baseConfig.forecast.totalMonths).toBe(48);
  });

  it('flags a failed bootstrap and falls back to the builder', async () => {
    storage.loadManifest.mockRejectedValue(new Error('S3 down'));
    const loaded = await useCloudStore.getState().autoLoadLatest();
    expect(loaded).toBe(false);
    expect(useCloudStore.getState().initialLoadFailed).toBe(true);
    expect(usePlannerStore.getState().activeView).toBe('builder');
    expect(useCloudStore.getState().savesLoading).toBe(false);
  });

  it('a corrupt cloud save fails the bootstrap gracefully (no crash, builder fallback)', async () => {
    storage.loadManifest.mockResolvedValue([{ key: 'bad.wfplan', ...META }]);
    storage.downloadSave.mockResolvedValue('{"not":"a wfplan"}');

    const loaded = await useCloudStore.getState().autoLoadLatest();

    expect(loaded).toBe(false);
    expect(useCloudStore.getState().initialLoadFailed).toBe(true);
    expect(usePlannerStore.getState().activeView).toBe('builder');
  });
});

describe('cloudStore — undo/redo history survives the cloud round trip', () => {
  it('a non-empty timeline serializes, uploads, downloads and re-imports intact (cross-device backtracking)', async () => {
    // Two edits on "desktop", then one undo — leaving a real past AND a pending redo.
    const planner = usePlannerStore.getState();
    planner.addTransientOneOffExpense(m('2025-03'), 10_000, 'edit 1');
    planner.addTransientBonusIncome(m('2025-04'), 5_000, 'edit 2');
    usePlannerStore.getState().undo(); // backtrack the bonus -> past:1, future:1

    const before = usePlannerStore.getState();
    expect(before.history.past).toHaveLength(1);
    expect(before.history.future).toHaveLength(1);
    expect(before.overrides.runtimeEvents).toHaveLength(1);

    // Upload through the genuine serializePlan path and capture the exact .wfplan bytes.
    storage.loadManifestWithETag.mockResolvedValue({ entries: [], etag: 'e1' });
    storage.saveManifest.mockResolvedValue(undefined);
    await useCloudStore.getState().uploadCurrentPlan('Desktop Plan');
    const uploaded = storage.uploadSave.mock.calls[0][1] as string;

    // Simulate a second device: clean slate, then bootstrap from the cloud copy.
    usePlannerStore.getState().loadPlan(
      baseConfig({ forecast: { startMonth: m('2025-01'), totalMonths: 12 } }),
      {},
      [],
    );
    expect(usePlannerStore.getState().history.past).toHaveLength(0);

    storage.loadManifest.mockResolvedValue([{ key: 'desktop.wfplan', ...META }]);
    storage.downloadSave.mockResolvedValue(uploaded);
    await useCloudStore.getState().autoLoadLatest();

    // Both stacks came back exactly as they were on the other device.
    const restored = usePlannerStore.getState();
    expect(restored.overrides.runtimeEvents).toHaveLength(1);
    expect(restored.history.past).toHaveLength(1);
    expect(restored.history.future).toHaveLength(1);

    // Redo continues the timeline (the bonus the desktop had undone comes back)...
    restored.redo();
    expect(usePlannerStore.getState().overrides.runtimeEvents).toHaveLength(2);

    // ...and undo still backtracks all the way to the empty baseline.
    usePlannerStore.getState().undo();
    usePlannerStore.getState().undo();
    expect(usePlannerStore.getState().overrides.runtimeEvents ?? []).toHaveLength(0);
    expect(usePlannerStore.getState().canUndo()).toBe(false);
  });
});

describe('cloudStore.loadSaves — error surface', () => {
  it('sets savesError on failure and clears the loading flag', async () => {
    storage.loadManifest.mockRejectedValue(new Error('S3 down'));
    await useCloudStore.getState().loadSaves();
    expect(useCloudStore.getState().savesError).toBe('Failed to load saves.');
    expect(useCloudStore.getState().savesLoading).toBe(false);
  });
});

describe('cloudStore.deleteSave — manifest-first ordering', () => {
  it('commits the manifest before deleting the object', async () => {
    const order: string[] = [];
    storage.loadManifestWithETag.mockResolvedValue({
      entries: [{ key: 'gone.wfplan', ...META }],
      etag: 'etag-1',
    });
    storage.saveManifest.mockImplementation(async () => void order.push('manifest'));
    storage.deleteSave.mockImplementation(async () => void order.push('object'));

    await useCloudStore.getState().deleteSave('gone.wfplan');

    expect(order).toEqual(['manifest', 'object']);
    expect(useCloudStore.getState().saves).toEqual([]);
  });

  it('never deletes the object when the manifest commit keeps failing', async () => {
    storage.loadManifestWithETag.mockResolvedValue({
      entries: [{ key: 'gone.wfplan', ...META }],
      etag: 'etag-1',
    });
    storage.saveManifest.mockRejectedValue(preconditionFailed());

    await expect(useCloudStore.getState().deleteSave('gone.wfplan')).rejects.toThrow();
    expect(storage.deleteSave).not.toHaveBeenCalled();
  });
});
