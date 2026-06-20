import { useEffect } from "react";
import BuilderWizard from "@/components/builder/BuilderWizard";
import { usePlannerStore } from "@/store/plannerStore";
import { useBuilderStore } from "@/store/builderStore";
import { configToBuilder } from "@/engine/configToBuilder";

export default function ConfigBuilderPage() {
  useEffect(() => {
    const { baseConfig } = usePlannerStore.getState();
    // "Real plan" guard: fresh users have initialConfig.income.monthly === 0.
    // The Baseline step requires monthlyIncome >= 1000 to advance, so any
    // generated or loaded plan will have monthly > 0.
    if (baseConfig.income.monthly > 0) {
      useBuilderStore.getState().setState(configToBuilder(baseConfig));
    }
  }, []); // runs on each entry into the builder view

  return <BuilderWizard />;
}
