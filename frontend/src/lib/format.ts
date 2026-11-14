const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** ₹ 1,20,000 — Indian digit grouping. */
export const rupees = (n: number) => `₹ ${inr.format(Math.round(n))}`

/** ₹ 1.2 Cr / ₹ 45.3 L for large display numerals. */
export function rupeesShort(n: number) {
  const a = Math.abs(n)
  if (a >= 1e7) return `₹ ${(n / 1e7).toFixed(a >= 1e8 ? 1 : 2)} Cr`
  if (a >= 1e5) return `₹ ${(n / 1e5).toFixed(a >= 1e6 ? 1 : 2)} L`
  return rupees(n)
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
