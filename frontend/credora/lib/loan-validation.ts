import { getLoanTypeConfig } from "./loan-types"

function num(v: string | undefined): number {
  if (!v) return 0
  return Number(String(v).replace(/[^0-9.]/g, "")) || 0
}

export function validateSectorStep(
  loanType: string,
  amount: string,
  sector: Record<string, string> = {}
): string | null {
  const config = getLoanTypeConfig(loanType)
  if (!config) return "Select a loan type"

  const loanAmt = num(amount)
  if (loanAmt < config.minAmount || loanAmt > config.maxAmount) {
    return `Amount must be between KES ${config.minAmount.toLocaleString()} and KES ${config.maxAmount.toLocaleString()}`
  }

  for (const field of config.sectorFields.filter((f) => f.required)) {
    if (!sector[field.name]?.trim()) return `${field.label} is required`
  }

  switch (loanType) {
    case "mortgage": {
      const pv = num(sector.propertyValue)
      const dp = num(sector.downPayment)
      if (pv > 0 && loanAmt / pv > 0.95) return "Loan exceeds 95% LTV for this property"
      if (pv > 0 && dp < pv - loanAmt) return "Down payment is insufficient"
      break
    }
    case "auto": {
      const price = num(sector.vehiclePrice)
      const dp = num(sector.downPayment)
      const vin = sector.vin?.trim() || ""
      if (vin && vin.length !== 17) return "VIN must be 17 characters"
      if (price > 0 && loanAmt > price) return "Loan cannot exceed vehicle price"
      if (price > 0 && loanAmt + dp > price * 1.15) return "Loan + down payment exceeds vehicle price limit"
      break
    }
    case "business": {
      const rev = num(sector.annualRevenue)
      if (rev > 0 && loanAmt > rev * 0.5) return "Business loan cannot exceed 50% of annual revenue"
      break
    }
    case "education": {
      const tuition = num(sector.tuitionCost)
      if (tuition > 0 && loanAmt > tuition * 1.2) return "Education loan cannot exceed 120% of tuition"
      break
    }
  }
  return null
}
