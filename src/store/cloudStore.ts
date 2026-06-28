import { create } from 'zustand'
import { simulate } from '@/engine/simulate'
import { calculateChecksum } from '@/engine/checksum'
import { encodeBase64 } from '@/engine/base64'
import { importPlan } from '@/engine/importPlan'
import { usePlannerStore } from '@/store/plannerStore'
import {
  loadManifest,
  loadManifestWithETag,
  saveManifest,
  uploadSave,
  downloadSave,
  deleteSave as storageDeleteSave,
  generateSaveKey,
  type SaveFileMeta,
} from '@/lib/storage'

export type { SaveFileMeta }

export const SAVE_LIMIT = 5
export const SAVE_LIMIT_ERROR = 'SAVE_LIMIT_REACHED'

// Default label for the first plan's automatic save, e.g. "My Plan · Jun 2026".
export function defaultPlanLabel(date = new Date()): string {
  const stamp = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  return `My Plan · ${stamp}`
}

function isPreconditionFailed(err: unknown): boolean {
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } }
  return e?.name === 'PreconditionFailed' || e?.$metadata?.httpStatusCode === 412
}

// Reads the manifest fresh, applies `mutate`, and commits with a conditional write.
// On a concurrent change (412) it re-reads and retries. Returns the committed list.
async function commitManifest(
  mutate: (entries: SaveFileMeta[]) => SaveFileMeta[]
): Promise<SaveFileMeta[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { entries, etag } = await loadManifestWithETag()
    const updated = mutate(entries)
    try {
      await saveManifest(updated, etag)
      return updated
    } catch (err) {
      if (isPreconditionFailed(err) && attempt < 2) continue
      throw err
    }
  }
  throw new Error('Could not update saves. Please try again.')
}

interface CloudStore {
  saves: SaveFileMeta[]
  savesLoading: boolean
  savesError: string | null
  initialLoadFailed: boolean
  loadSaves: () => Promise<void>
  autoLoadLatest: () => Promise<boolean>
  uploadCurrentPlan: (label: string, overwriteKey?: string) => Promise<void>
  loadSave: (key: string) => Promise<void>
  downloadSave: (key: string, label: string) => Promise<void>
  deleteSave: (key: string) => Promise<void>
}

async function applySaveToPlanner(key: string): Promise<void> {
  const content = await downloadSave(key)
  const file = new File([content], key, { type: 'application/octet-stream' })
  const result = await importPlan(file)
  usePlannerStore.getState().loadPlan(result.baseConfig, result.overrides, result.savedScenarios, result.history)
}

async function serializePlan(): Promise<string> {
  const { baseConfig, overrides, savedScenarios, history } = usePlannerStore.getState()
  const data = { baseConfig, overrides, savedScenarios, history }
  const payload = encodeBase64(JSON.stringify(data))
  const checksum = await calculateChecksum(payload)
  return JSON.stringify(
    {
      app: 'wealth-forecast',
      version: 3,
      exportedAt: new Date().toISOString(),
      payload,
      checksum,
    },
    null,
    2
  )
}

function getSimulationSummary(): { finalNetWorth: number; totalMonths: number } {
  const { config, overrides } = usePlannerStore.getState()
  const result = simulate(config, overrides)
  return {
    finalNetWorth: result.summary.finalNetWorth,
    totalMonths: result.rows.length,
  }
}

export const useCloudStore = create<CloudStore>((set) => ({
  saves: [],
  savesLoading: false,
  savesError: null,
  initialLoadFailed: false,

  loadSaves: async () => {
    set({ savesLoading: true, savesError: null })
    try {
      const saves = await loadManifest()
      set({ saves })
    } catch {
      set({ savesError: 'Failed to load saves.' })
    } finally {
      set({ savesLoading: false })
    }
  },

  autoLoadLatest: async () => {
    set({ savesLoading: true, savesError: null, initialLoadFailed: false })
    try {
      const planner = usePlannerStore.getState()
      const saves = await loadManifest()
      set({ saves })

      // Preserve unsaved in-session edits across a refresh: if the rehydrated local
      // plan has unsaved changes, keep them instead of overwriting with the cloud copy.
      // The persisted view is left as-is. Cloud stays source of truth only when local is clean.
      if (planner.isPlanDirty()) {
        return false
      }

      if (saves.length === 0) {
        planner.setActiveView('builder')
        return false
      }
      const latest = [...saves].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
      await applySaveToPlanner(latest.key)
      planner.setActiveView('forecast')
      return true
    } catch {
      usePlannerStore.getState().setActiveView('builder')
      set({ initialLoadFailed: true })
      return false
    } finally {
      set({ savesLoading: false })
    }
  },

  uploadCurrentPlan: async (label, overwriteKey) => {
    const key = overwriteKey ?? generateSaveKey()
    const content = await serializePlan()
    const { finalNetWorth, totalMonths } = getSimulationSummary()
    const entry = (k: string): SaveFileMeta => ({
      key: k,
      label,
      networth: finalNetWorth,
      timeframeMonths: totalMonths,
      createdAt: new Date().toISOString(),
    })

    let objectUploaded = false
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const { entries, etag } = await loadManifestWithETag()

        // Authoritative cap check against the fresh manifest (the in-memory count may be stale).
        if (!overwriteKey && entries.length >= SAVE_LIMIT) {
          throw new Error(SAVE_LIMIT_ERROR)
        }

        // Upload the plan object once, only after the cap check passes.
        if (!objectUploaded) {
          await uploadSave(key, content)
          objectUploaded = true
        }

        const exists = overwriteKey && entries.some((s) => s.key === overwriteKey)
        const updated = exists
          ? entries.map((s) => (s.key === overwriteKey ? entry(overwriteKey) : s))
          : [entry(key), ...entries] // new save, or overwrite target removed elsewhere

        try {
          await saveManifest(updated, etag)
          set({ saves: updated })
          usePlannerStore.getState().markSaved()
          return
        } catch (err) {
          if (isPreconditionFailed(err) && attempt < 2) continue
          throw err
        }
      }
      throw new Error('Could not update saves. Please try again.')
    } catch (err) {
      // A brand-new save object was uploaded but never referenced by a committed
      // manifest — delete it so it doesn't orphan in S3. (Never for an overwrite: that
      // key is an existing save we must not remove.)
      if (objectUploaded && !overwriteKey) {
        try {
          await storageDeleteSave(key)
        } catch {
          // Best-effort cleanup; surface the original failure regardless.
        }
      }
      throw err
    }
  },

  loadSave: async (key) => {
    await applySaveToPlanner(key)
  },

  downloadSave: async (key, label) => {
    const content = await downloadSave(key)
    const blob = new Blob([content], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${label}.wfplan`
    link.click()
    URL.revokeObjectURL(url)
  },

  deleteSave: async (key) => {
    // Commit the manifest first (with retry), then delete the object — a mid-failure
    // orphans an object rather than leaving the manifest pointing at a missing file.
    const updated = await commitManifest((entries) => entries.filter((s) => s.key !== key))
    set({ saves: updated })
    await storageDeleteSave(key)
  },
}))
