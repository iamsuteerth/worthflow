export function uniquifyAccountName(name: string, existingNames: string[]): string {
  if (!existingNames.includes(name)) return name;

  let suffix = 2;
  while (existingNames.includes(`${name} (${suffix})`)) {
    suffix += 1;
  }

  return `${name} (${suffix})`;
}
