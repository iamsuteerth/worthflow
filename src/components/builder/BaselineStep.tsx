import {
  NumberInput,
  Text,
} from "@mantine/core";

import {
  useBuilderStore,
} from "../../store/builderStore";
import BuilderStepContainer from "./BuilderStepContainer";

export default function BaselineStep() {
  const state =
    useBuilderStore(
      (store) =>
        store.state
    );

  const setBaseline =
    useBuilderStore(
      (store) =>
        store.setBaseline
    );

  return (
    <BuilderStepContainer>
      <Text
        size="sm"
        c="dimmed"
      >
        Enter your current financial position.
      </Text>

      <NumberInput
        label="Monthly Income"
        required
        min={10000}
        thousandSeparator=","
        value={
          state.monthlyIncome
        }
        onChange={(value) =>
          setBaseline(
            Number(value),
            state.openingCash,
            state.openingInvestmentCorpus,
            state.defaultMonthlyExpense
          )
        }
      />

      <NumberInput
        label="Monthly Expense"
        required
        min={0}
        thousandSeparator=","
        value={
          state.defaultMonthlyExpense
        }
        onChange={(value) =>
          setBaseline(
            state.monthlyIncome,
            state.openingCash,
            state.openingInvestmentCorpus,
            Number(value)
          )
        }
      />

      <NumberInput
        label="Opening Cash Balance"
        required
        min={0}
        thousandSeparator=","
        value={
          state.openingCash
        }
        onChange={(value) =>
          setBaseline(
            state.monthlyIncome,
            Number(value),
            state.openingInvestmentCorpus,
            state.defaultMonthlyExpense
          )
        }
      />

      <NumberInput
        label="Opening Investment Corpus"
        required
        min={0}
        thousandSeparator=","
        value={
          state.openingInvestmentCorpus
        }
        onChange={(value) =>
          setBaseline(
            state.monthlyIncome,
            state.openingCash,
            Number(value),
            state.defaultMonthlyExpense
          )
        }
      />
    </BuilderStepContainer>
  );
}