/** Format amounts in Kenyan Shillings */
export function formatKES(amount: number | string | undefined | null): string {
  const n = Number(amount ?? 0)
  if (Number.isNaN(n)) return "KES 0"
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(n)
}

export const LOCALE = "en-KE"
