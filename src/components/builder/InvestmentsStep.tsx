import type { MonthKey } from "@/types/simulation";

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";

import { IconAlertTriangle, IconChartLine, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import BuilderStepContainer from "@/components/builder/BuilderStepContainer";
import EditItemModal from "@/components/builder/EditItemModal";
import AccountFields, {
  type AccountDraft,
  accountDraftValid,
  emptyAccountDraft,
} from "@/components/builder/fields/AccountFields";
import { forecastEndMonth } from "@/engine/dateUtils";
import { formatMonth } from "@/engine/monthFormatting";
import { money } from "@/format/money";
import { useBuilderStore } from "@/store/builderStore";

export default function InvestmentsStep() {
  const state = useBuilderStore((store) => store.state);
  const addInvestmentAccount = useBuilderStore((store) => store.addInvestmentAccount);
  const updateInvestmentAccount = useBuilderStore((store) => store.updateInvestmentAccount);
  const removeInvestmentAccount = useBuilderStore((store) => store.removeInvestmentAccount);

  const forecastEnd = forecastEndMonth(state.startMonth, state.totalMonths);
  const outOfWindow = (month: MonthKey) => month < state.startMonth || month > forecastEnd;

  const [addDraft, setAddDraft] = useState<AccountDraft>(() => emptyAccountDraft(state.startMonth));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AccountDraft>(() => emptyAccountDraft(state.startMonth));

  function submitAdd() {
    addInvestmentAccount({ ...addDraft, name: addDraft.name.trim() });
    setAddDraft(emptyAccountDraft(state.startMonth));
  }

  function startEdit(account: (typeof state.investmentAccounts)[number]) {
    setEditDraft({
      name: account.name,
      startMonth: account.startMonth,
      openingBalance: account.openingBalance,
      defaultMonthlyContribution: account.defaultMonthlyContribution,
      defaultAnnualReturn: account.defaultAnnualReturn,
    });
    setEditingId(account.id);
  }

  function saveEdit() {
    if (!editingId) return;
    updateInvestmentAccount({ id: editingId, ...editDraft, name: editDraft.name.trim() });
    setEditingId(null);
  }

  return (
    <BuilderStepContainer>
      <Stack gap={4} mb="xs">
        <Text fw={700} size="xl">
          Investment Accounts
        </Text>
        <Text size="sm" c="dimmed">
          Every investment • Existing Portfolios, SIPs, or future lump sums are an account.
        </Text>
      </Stack>

      <Card withBorder radius="md" p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <ThemeIcon variant="light" color="brand" size="md" radius="md">
              <IconChartLine size={16} />
            </ThemeIcon>
            <Text fw={600} size="sm">
              Add Account
            </Text>
          </Group>

          <Divider />

          <AccountFields
            value={addDraft}
            onChange={(patch) => setAddDraft((d) => ({ ...d, ...patch }))}
            minMonth={state.startMonth}
            maxMonth={forecastEnd}
          />

          <Button leftSection={<IconPlus size={16} />} disabled={!accountDraftValid(addDraft)} onClick={submitAdd}>
            Add Account
          </Button>
        </Stack>
      </Card>

      {state.investmentAccounts.length > 0 && (
        <Card withBorder radius="md" p="lg">
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="violet" size="md" radius="md">
                <IconChartLine size={16} />
              </ThemeIcon>
              <Text fw={600} size="sm">
                Investment Accounts
              </Text>
              <Badge variant="light" color="violet" size="sm">
                {state.investmentAccounts.length} account
                {state.investmentAccounts.length !== 1 ? "s" : ""}
              </Badge>
            </Group>

            <Divider />

            <Stack gap="xs">
              {state.investmentAccounts.map((account) => (
                <Card key={account.id} withBorder radius="sm" p="sm" style={{ background: "var(--mantine-color-default-hover)" }}>
                  <Group justify="space-between" align="center">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {account.name}
                        </Text>
                        {outOfWindow(account.startMonth) && (
                          <Badge
                            color="red"
                            variant="light"
                            size="sm"
                            leftSection={<IconAlertTriangle size={11} />}
                          >
                            Outside window
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        Starts {formatMonth(account.startMonth)} · Opening{" "}
                        {money(account.openingBalance)} · Contribution{" "}
                        {money(account.defaultMonthlyContribution)}/mo · Return{" "}
                        {account.defaultAnnualReturn}%
                      </Text>
                    </Stack>
                    <Group gap={4}>
                      <Tooltip label="Edit">
                        <ActionIcon variant="subtle" aria-label="Edit" onClick={() => startEdit(account)}>
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remove">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          aria-label="Remove"
                          onClick={() => removeInvestmentAccount(account.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                </Card>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {state.investmentAccounts.length === 0 && (
        <Card withBorder radius="md" p="xl" style={{ borderStyle: "dashed" }}>
          <Stack align="center" gap="xs">
            <ThemeIcon variant="light" color="gray" size="xl" radius="md">
              <IconChartLine size={24} />
            </ThemeIcon>
            <Text size="sm" c="dimmed" ta="center">
              No investment accounts added yet. Add your first account above.
            </Text>
          </Stack>
        </Card>
      )}

      <EditItemModal
        opened={editingId !== null}
        title="Edit Account"
        canSave={accountDraftValid(editDraft)}
        onSave={saveEdit}
        onClose={() => setEditingId(null)}
      >
        <AccountFields
          value={editDraft}
          onChange={(patch) => setEditDraft((d) => ({ ...d, ...patch }))}
          minMonth={state.startMonth}
          maxMonth={forecastEnd}
        />
      </EditItemModal>
    </BuilderStepContainer>
  );
}
