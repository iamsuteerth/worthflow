import { describe, it, expect, beforeEach, vi } from 'vitest';

// localStorage shim for the zustand-persisted plannerStore (node env).
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

// Mock the S3 storage layer so we can drive the manifest concurrency path.
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

import { useCloudStore } from '@/store/cloudStore';
import { usePlannerStore } from '@/store/plannerStore';
import { baseConfig, m } from '@/engine/__tests__/factories';

function preconditionFailed(): Error {
  const e = new Error('precondition failed') as Error & { name: string };
  e.name = 'PreconditionFailed';
  return e;
}

const META = { label: 'x', networth: 0, timeframeMonths: 12, createdAt: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  vi.clearAllMocks();
  storage.generateSaveKey.mockReturnValue('new-key.wfplan');
  // A valid plan so serializePlan + getSimulationSummary run for real.
  usePlannerStore.getState().loadPlan(
    baseConfig({ forecast: { startMonth: m('2025-01'), totalMonths: 12 } }),
    {},
    [],
  );
});

describe('cloudStore.uploadCurrentPlan — orphaned-object cleanup', () => {
  it('deletes the uploaded object when the manifest commit keeps losing the race', async () => {
    storage.loadManifestWithETag.mockResolvedValue({ entries: [], etag: 'etag-1' });
    storage.uploadSave.mockResolvedValue(undefined);
    storage.saveManifest.mockRejectedValue(preconditionFailed());

    await expect(useCloudStore.getState().uploadCurrentPlan('My Plan')).rejects.toThrow();

    expect(storage.uploadSave).toHaveBeenCalledTimes(1); // object uploaded once
    expect(storage.deleteSave).toHaveBeenCalledWith('new-key.wfplan'); // …then cleaned up
  });

  it('does NOT delete on an overwrite (that key is an existing save)', async () => {
    storage.loadManifestWithETag.mockResolvedValue({
      entries: [{ key: 'existing.wfplan', ...META }],
      etag: 'etag-1',
    });
    storage.uploadSave.mockResolvedValue(undefined);
    storage.saveManifest.mockRejectedValue(preconditionFailed());

    await expect(
      useCloudStore.getState().uploadCurrentPlan('My Plan', 'existing.wfplan'),
    ).rejects.toThrow();

    expect(storage.deleteSave).not.toHaveBeenCalled();
  });

  it('does not upload (nor clean up) when the save cap is already reached', async () => {
    storage.loadManifestWithETag.mockResolvedValue({
      entries: Array.from({ length: 5 }, (_, i) => ({ key: `k${i}.wfplan`, ...META })),
      etag: 'etag-1',
    });

    await expect(useCloudStore.getState().uploadCurrentPlan('Over cap')).rejects.toThrow(
      'SAVE_LIMIT_REACHED',
    );

    expect(storage.uploadSave).not.toHaveBeenCalled();
    expect(storage.deleteSave).not.toHaveBeenCalled();
  });

  it('commits on a clean manifest and marks the plan saved', async () => {
    storage.loadManifestWithETag.mockResolvedValue({ entries: [], etag: 'etag-1' });
    storage.uploadSave.mockResolvedValue(undefined);
    storage.saveManifest.mockResolvedValue(undefined);

    await useCloudStore.getState().uploadCurrentPlan('Happy path');

    expect(storage.uploadSave).toHaveBeenCalledTimes(1);
    expect(storage.saveManifest).toHaveBeenCalledTimes(1);
    expect(storage.deleteSave).not.toHaveBeenCalled();
    expect(useCloudStore.getState().saves[0]?.key).toBe('new-key.wfplan');
  });
});
