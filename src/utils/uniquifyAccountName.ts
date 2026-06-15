// src/utils/uniquifyAccountName.ts

/**
 * Resolves a possibly-duplicate account name into a unique one by
 * appending " (2)", " (3)", etc. against the existing names.
 */
export function uniquifyAccountName(name: string, existingNames: string[]): string {
  if (!existingNames.includes(name)) return name;

  let suffix = 2;
  while (existingNames.includes(`${name} (${suffix})`)) {
    suffix += 1;
  }

  return `${name} (${suffix})`;
}
