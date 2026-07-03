import type { Message } from '@/ai/chat/conversation.types';

import { useMemo } from 'react';
import { Alert, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import {
  IconAlertTriangle,
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
import { isProposalApplied } from '@/ai/actions/proposalState';
import { Money } from '@/components/ui';

interface Props {
  message: Message;
}

function DeltaRow({ label, before, after }: { label: string; before: number; after: number }) {
  const changed = before !== after;
  return (
    <Group justify="space-between" gap={6} wrap="nowrap">
      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{label}</Text>
      <Text size="xs" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        <Money value={before} compact size="xs" c="inherit" />
        {changed && (
          <>
            {' → '}
            <Money value={after} compact size="xs" span fw={600} c={after >= before ? 'teal' : 'red'} />
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

  // Re-evaluate feasibility + dry-run + applied-state whenever the live plan changes.
  // dryRun/checkFeasibility read the store via getState(); subscribing to these refs is
  // what makes the memos recompute (they're the trigger, not the args).
  const config = usePlannerStore((s) => s.config);
  const overrides = usePlannerStore((s) => s.overrides);

  // "Applied" is derived from the plan (never from synced chat state), so this card
  // can't claim a change is in a plan that doesn't have it.
  const applied = useMemo(
    () => (action ? isProposalApplied(action, message.id, overrides) : false),
    [action, message.id, overrides],
  );

  const dismissed = status === 'dismissed';
  const failed = status === 'failed';
  // Show the Apply/Dismiss controls only while the change isn't in the plan and the
  // user hasn't dismissed it.
  const actionable = !applied && !dismissed;

  const feasibility = useMemo(
    () => (action && actionable ? checkFeasibility(action) : null),
    [action, actionable, config, overrides],
  );
  const delta = useMemo(
    () => (action && actionable && feasibility?.feasible ? dryRun(action) : null),
    [action, actionable, feasibility, config, overrides],
  );

  if (!action) return null;

  const infeasibleReason = feasibility && !feasibility.feasible ? feasibility.reason : null;

  return (
    <Paper withBorder radius="md" p="sm" mt={6} style={{ background: 'var(--mantine-color-body)' }}>
      <Group gap={6} mb={6}>
        <IconWand size={14} />
        <Text size="xs" fw={600}>Proposed change</Text>
        {applied && <Badge size="xs" color="teal" variant="light">Applied</Badge>}
        {dismissed && !applied && <Badge size="xs" color="gray" variant="light">Dismissed</Badge>}
      </Group>

      <Text size="sm" mb={6}>{describeAction(action)}</Text>

      {delta && (
        <Stack gap={2} mb={8}>
          <DeltaRow label="Lowest cash" before={delta.lowestCashBefore} after={delta.lowestCashAfter} />
          <DeltaRow label="Final net worth" before={delta.finalNetWorthBefore} after={delta.finalNetWorthAfter} />
          <Text size="xs" c="dimmed">Estimated impact — applied only when you confirm.</Text>
        </Stack>
      )}

      {actionable && infeasibleReason && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={12} />} p={6} mb={8} radius="sm">
          <Text size="xs">{infeasibleReason}</Text>
        </Alert>
      )}

      {actionable && failed && message.actionError && !infeasibleReason && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={12} />} p={6} mb={8} radius="sm">
          <Text size="xs">{message.actionError}</Text>
        </Alert>
      )}

      {actionable && (
        <Group gap={6}>
          <Button
            size="xs"
            color="brand"
            leftSection={<IconCheck size={13} />}
            disabled={!!infeasibleReason}
            onClick={() => applyProposedAction(message.id)}
          >
            {failed ? 'Try again' : 'Apply'}
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

      {applied && (
        <Group gap={4} c="dimmed">
          <IconInfoCircle size={12} />
          <Text size="xs">Applied to your plan — undo or redo it from the scenario bar.</Text>
        </Group>
      )}
    </Paper>
  );
}
