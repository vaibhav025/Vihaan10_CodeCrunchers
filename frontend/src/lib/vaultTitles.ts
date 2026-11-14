/** Vault titles by score band. Edit here to rename or re-band. */
export const VAULT_TITLES = [
  { min: 80, key: 'legendary' }, { min: 60, key: 'fortified' }, { min: 40, key: 'steady' }, { min: 20, key: 'foundation' }, { min: 0, key: 'starter' },
] as const
export const vaultTitle = (score: number) => VAULT_TITLES.find(b => score >= b.min)!.key
