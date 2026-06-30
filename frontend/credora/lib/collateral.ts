import type { LoanTypeId } from "./loan-types"

export function getCollateralLabel(loanType: string): string {
  switch (loanType) {
    case "mortgage":
      return "Property collateral"
    case "auto":
      return "Vehicle collateral"
    case "business":
      return "Business security"
    case "education":
      return "Guarantor / cosigner"
    default:
      return "Unsecured"
  }
}

export function formatCollateralSummary(
  loanType: string,
  sector?: Record<string, string>
): string {
  if (!sector) return "Unsecured"
  switch (loanType as LoanTypeId) {
    case "mortgage":
      return `Property at ${sector.propertyAddress || "—"} (${sector.propertyType || "—"}) · Title ${sector.titleNumber || "pending"}`
    case "auto":
      return `${sector.vehicleYear || ""} ${sector.vehicleMake || ""} ${sector.vehicleModel || ""} · VIN ${sector.vin || "pending"}`
    case "business":
      if (!sector.collateralType || sector.collateralType === "none") return "Unsecured business loan"
      return `${sector.collateralType}: ${sector.collateralDescription || "—"}`
    case "education":
      if (sector.cosignerName) return `Cosigner: ${sector.cosignerName} (${sector.cosignerRelationship || "guarantor"})`
      return `Education at ${sector.institutionName || "—"}`
    default:
      return "Unsecured personal loan"
  }
}
