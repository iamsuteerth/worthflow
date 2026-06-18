import { create } from 'zustand'
import { simulate } from '@/engine/simulate'
import { calculateChecksum } from '@/engine/checksum'
import { importPlan } from '@/engine/importPlan'
import { usePlannerStore } from '@/store/plannerStore'
import {
  loadManifest,
  saveManifest,
  uploadSave,
  downloadSave,
  deleteSave as storagDeleteSave,
  generateSaveKey,
  type SaveFileMeta,
} from '@/lib/storage'
import { useAuthStore } from '@/store/authStore'

export type { SaveFileMeta }

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

async function serializePlan(): Promise<string> {
  const { baseConfig, overrides, savedScenarios } = usePlannerStore.getState()
  const data = { baseConfig, overrides, savedScenarios }
  const payload = btoa(JSON.stringify(data))
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

export const useCloudStore = create<CloudStore>((set, get) => ({
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
      const saves = await loadManifest()
      set({ saves })
      if (saves.length === 0) {
        usePlannerStore.getState().setActiveView('builder')
        return false
      }
      const latest = [...saves].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
      const content = await downloadSave(latest.key)
      const file = new File([content], latest.key, { type: 'application/octet-stream' })
      const result = await importPlan(file)
      usePlannerStore.getState().loadPlan(result.baseConfig, result.overrides, result.savedScenarios)
      usePlannerStore.getState().setActiveView('forecast')
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
    const user = useAuthStore.getState().user
    const email = user?.email ?? 'unknown'
    const key = overwriteKey ?? generateSaveKey(email)
    const content = await serializePlan()
    const { finalNetWorth, totalMonths } = getSimulationSummary()

    await uploadSave(key, content)

    const currentSaves = get().saves
    let updatedSaves: SaveFileMeta[]

    if (overwriteKey) {
      updatedSaves = currentSaves.map((s) =>
        s.key === overwriteKey
          ? { ...s, label, networth: finalNetWorth, timeframeMonths: totalMonths, createdAt: new Date().toISOString() }
          : s
      )
    } else {
      const newEntry: SaveFileMeta = {
        key,
        label,
        networth: finalNetWorth,
        timeframeMonths: totalMonths,
        createdAt: new Date().toISOString(),
      }
      updatedSaves = [newEntry, ...currentSaves]
    }

    await saveManifest(updatedSaves)
    set({ saves: updatedSaves })
  },

  loadSave: async (key) => {
    const content = await downloadSave(key)
    const file = new File([content], key, { type: 'application/octet-stream' })
    const result = await importPlan(file)
    usePlannerStore.getState().loadPlan(result.baseConfig, result.overrides, result.savedScenarios)
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
    await storagDeleteSave(key)
    const updatedSaves = get().saves.filter((s) => s.key !== key)
    await saveManifest(updatedSaves)
    set({ saves: updatedSaves })
  },
}))
