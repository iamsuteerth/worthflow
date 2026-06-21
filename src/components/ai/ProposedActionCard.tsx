import { useMemo } from 'react';
import { Alert, Badge, Box, Button, Group, Paper, Stack, Text } from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowBackUp,
  IconCheck,
  IconInfoCircle,
  IconWand,
  IconX,
} from '@tabler/icons-react';
import { useAiStore } from '@/store/aiStore';
import { usePlannerStore } from '@/store/plannerStore';
import { dryRun } from '@/ai/actions/dryRun';
import { checkFeasibility } from '@/ai/actions/checkFeasibility';
import { describeAction } from '@/ai/actions/describeAction';
import { money } from '@/format/money';
import type { Message } from '@/ai/chat/conversation.types';

interface Props {
  message: Message;
}

function DeltaRow({ label, before, after }: { label: string; before: number; after: number }) {
  const changed = before !== after;
  return (
    <Group justify="space-between" gap={6} wrap="nowrap">
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {money(before)}
        {changed && (
          <>
            {' → '}
            <Text span fw={600} c={after >= before ? 'teal' : 'red'}>{money(after)}</Text>
          </>
        )}
      </Text>
    </Group>
  );
}

export default function ProposedActionCard({ message }: Props) {
  const action = message.proposedAction;
  const status = message.actionStatus ?? 'pending';

  const applyProposedAction = useAiStore((s) => s.applyProposedAction);
  const dismissProposedAction = useAiStore((s) => s.dismissProposedAction);
  const undoProposedAction = useAiStore((s) => s.undoProposedAction);

  // Re-evaluate feasibility + dry-run whenever the live plan changes. dryRun and
  // checkFeasibility read the store via getState(); subscribing to these refs is
  // what makes the memo recompute (they're the trigger, not the args).
  const config = usePlannerStore((s) => s.config);
  const overrides = usePlannerStore((s) => s.overrides);

  const pendingLike = status === 'pending' || status === 'failed';

  const feasibility = useMemo(
    () => (action && pendingLike ? checkFeasibility(action) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, pendingLike, config, overrides],
  );
  const delta = useMemo(
    () => (action && pendingLike && feasibility?.feasible ? dryRun(action) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [action, pendingLike, feasibility, config, overrides],
  );

  if (!action) return null;

  const infeasibleReason = feasibility && !feasibility.feasible ? feasibility.reason : null;

  return (
    <Paper withBorder radius="md" p="sm" mt={6} style={{ background: 'var(--mantine-color-body)' }}>
      <Group gap={6} mb={6}>
        <IconWand size={14} />
        <Text size="xs" fw={600}>Proposed change</Text>
        {status === 'applied' && <Badge size="xs" color="teal" variant="light">Applied</Badge>}
        {status === 'dismissed' && <Badge size="xs" color="gray" variant="light">Dismissed</Badge>}
      </Group>

      <Text size="sm" mb={6}>{describeAction(action)}</Text>

      {delta && (
        <Stack gap={2} mb={8}>
          <DeltaRow label="Lowest cash" before={delta.lowestCashBefore} after={delta.lowestCashAfter} />
          <DeltaRow label="Final net worth" before={delta.finalNetWorthBefore} after={delta.finalNetWorthAfter} />
          <Text size="9px" c="dimmed">Estimated impact — applied only when you confirm.</Text>
        </Stack>
      )}

      {/* Pre-flag impossibility before the user even tries to Apply. */}
      {pendingLike && infeasibleReason && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={12} />} p={6} mb={8} radius="sm">
          <Text size="xs">{infeasibleReason}</Text>
        </Alert>
      )}

      {status === 'failed' && message.actionError && !infeasibleReason && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={12} />} p={6} mb={8} radius="sm">
          <Text size="xs">{message.actionError}</Text>
        </Alert>
      )}

      {pendingLike && (
        <Group gap={6}>
          <Button
            size="xs"
            color="brand"
            leftSection={<IconCheck size={13} />}
            disabled={!!infeasibleReason}
            onClick={() => applyProposedAction(message.id)}
          >
            {status === 'failed' ? 'Try again' : 'Apply'}
          </Button>
          <Button
            size="xs"
            variant="default"
            leftSection={<IconX size={13} />}
            onClick={() => dismissProposedAction(message.id)}
          >
            Dismiss
          </Button>
        </Group>
      )}

      {status === 'applied' && (
        message.appliedEventId ? (
          <Box>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconArrowBackUp size={13} />}
              onClick={() => undoProposedAction(message.id)}
            >
              Undo
            </Button>
          </Box>
        ) : (
          <Group gap={4} c="dimmed">
            <IconInfoCircle size={12} />
            <Text size="9px">To revert this, load a saved plan.</Text>
          </Group>
        )
      )}
    </Paper>
  );
}
