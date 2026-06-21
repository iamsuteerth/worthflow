import { ActionIcon, Tooltip } from '@mantine/core';
import { IconSparkles } from '@tabler/icons-react';
import { useAiStore } from '@/store/aiStore';
import { useUiStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { usePlannerStore } from '@/store/plannerStore';

export default function AiEntryButton() {
  const authenticated = useAuthStore((s) => s.authenticated);
  const keyStatus = useAiStore((s) => s.keyStatus);
  const activeView = usePlannerStore((s) => s.activeView);
  const openAiPanel = useUiStore((s) => s.openAiPanel);

  if (!import.meta.env.VITE_AI_ENABLED) return null;
  if (!authenticated) return null;

  // Always show in forecast view; show even if absent (opens KeySettings)
  if (activeView !== 'forecast') return null;

  const isAbsent = keyStatus === 'absent';
  const tooltip = isAbsent ? 'Set up AI assistant' : 'Open AI assistant';

  return (
    <Tooltip label={tooltip} withArrow position="bottom">
      <ActionIcon
        variant="subtle"
        size="md"
        aria-label={tooltip}
        onClick={openAiPanel}
        color={isAbsent ? 'dimmed' : 'brand'}
      >
        <IconSparkles size={18} />
      </ActionIcon>
    </Tooltip>
  );
}
