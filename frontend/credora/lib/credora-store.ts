import { hashPassword } from "./credora-jwt";

export type StoredUser = {
  id: number;
  fullName: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  address?: string;
  employmentStatus?: string;
  monthlyIncome?: number;
  idPassportNumber?: string;
  emailVerified: boolean;
};

export type StoredInstitution = {
  id: number;
  institutionName: string;
  registrationLicenseNumber: string;
  contactPersonName?: string;
  businessAddress?: string;
  institutionWebsite?: string;
  institutionEmail: string;
  passwordHash: string;
  phoneNumber?: string;
};

export type StoredApplication = {
  id: number;
  userId: number;
  referenceId: string;
  loanType: string;
  purpose: string;
  amount: number;
  termMonths: number;
  status: string;
  aiCreditScore: number;
  approvalProbability: number;
  recommendedAmount: number;
  estimatedApr: number;
  aiSummary: string;
  aiRecommendation: string;
  submittedDate: string;
  approvalDate?: string;
  customerName: string;
  customerEmail: string;
  monthlyIncome: number;
  existingCreditScore: number;
  debtToIncome: number;
  sectorDetails?: Record<string, string>;
  scoring: {
    creditScore: number;
    approvalProbability: number;
    recommendedAmount: number;
    estimatedApr: number;
    summary: string;
    recommendation: string;
    factors: { name: string; value: number }[];
    amountOptions: { name: string; value: number }[];
  };
};

export type StoredNote = {
  id: number;
  applicationId: number;
  officerEmail: string;
  noteType: string;
  content: string;
  createdAt: string;
};

type Store = {
  users: StoredUser[];
  institutions: StoredInstitution[];
  applications: StoredApplication[];
  notes: StoredNote[];
  otps: Record<string, string>;
  nextUserId: number;
  nextInstId: number;
  nextAppId: number;
  nextNoteId: number;
};

const g = globalThis as typeof globalThis & { __credoraStore?: Store };

function seed(): Store {
  return {
    users: [
      {
        id: 1,
        fullName: "Demo Applicant",
        email: "demo@credora.test",
        passwordHash: hashPassword("Password123!"),
        phoneNumber: "+254712345678",
        employmentStatus: "full_time",
        monthlyIncome: 85000,
        emailVerified: true,
      },
    ],
    institutions: [
      {
        id: 1,
        institutionName: "Credora Demo SACCO",
        registrationLicenseNumber: "SACCO-DEMO-001",
        contactPersonName: "Demo Admin",
        institutionEmail: "admin@credora.test",
        passwordHash: hashPassword("Password123!"),
        phoneNumber: "+254700000000",
      },
    ],
    applications: [],
    notes: [],
    otps: {},
    nextUserId: 2,
    nextInstId: 2,
    nextAppId: 1,
    nextNoteId: 1,
  };
}

export function getStore(): Store {
  if (!g.__credoraStore) {
    g.__credoraStore = seed();
  }
  return g.__credoraStore;
}

export function toUserResponse(user: StoredUser) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    address: user.address,
    employmentStatus: user.employmentStatus,
    monthlyIncome: user.monthlyIncome,
    idPassportNumber: user.idPassportNumber,
    emailVerified: user.emailVerified,
  };
}

export function toInstitutionResponse(inst: StoredInstitution) {
  return {
    id: inst.id,
    institutionName: inst.institutionName,
    registrationLicenseNumber: inst.registrationLicenseNumber,
    contactPersonName: inst.contactPersonName,
    businessAddress: inst.businessAddress,
    institutionWebsite: inst.institutionWebsite,
    institutionEmail: inst.institutionEmail,
    phoneNumber: inst.phoneNumber,
  };
}

export function scoreApplication(body: Record<string, unknown>, user: StoredUser) {
  const amount = parseNumber(body.amount);
  const income = parseNumber(body.income) || user.monthlyIncome || 50000;
  const credit = parseNumber(body.creditScore) || 650;
  const utility = parseNumber(body.utilityPaymentScore) || 70;
  const mobile = parseNumber(body.mobileMoneyAvg) || 0;
  const term = parseInt(String(body.term || "12"), 10) || 12;
  const monthlyPayment = amount / Math.max(term, 1);
  const dti = income > 0 ? monthlyPayment / income : 1;
  let score = Math.round(
    320 +
      (credit - 300) * 0.62 +
      Math.min(income / 1500, 90) +
      (utility - 50) * 0.45 +
      Math.min(mobile / 200, 35) -
      dti * 40
  );
  score = Math.max(300, Math.min(850, score));
  const approvalProbability = Math.max(0.12, Math.min(0.96, (score - 400) / 450 - dti * 0.25));
  const recommendedAmount = Math.round(amount * Math.min(1.05, 0.55 + approvalProbability));
  const estimatedApr = Math.round((18 - (score - 300) / 50) * 10) / 10;
  const status =
    score >= 650 && dti < 0.45 ? "approved" : score >= 560 ? "pending" : "rejected";
  const summary =
    status === "approved"
      ? "Strong alternative-data profile. Recommended for approval."
      : status === "pending"
        ? "Borderline file. Manual review recommended."
        : "High risk relative to income. Not recommended at this amount.";
  const recommendation =
    status === "approved" ? "APPROVE" : status === "pending" ? "REVIEW" : "DECLINE";
  return {
    score,
    approvalProbability: Math.round(approvalProbability * 100) / 100,
    recommendedAmount,
    estimatedApr: Math.max(5.5, estimatedApr),
    status,
    dti: Math.round(dti * 100) / 100,
    income,
    summary,
    recommendation,
    factors: [
      { name: "Income stability", value: Math.min(100, Math.round(income / 1000)) },
      { name: "Utility payments", value: Math.round(utility) },
      { name: "Mobile money", value: Math.min(100, Math.round(mobile / 50)) },
      { name: "Existing score", value: Math.round((credit - 300) / 5.5) },
    ],
    amountOptions: [
      { name: "Conservative", value: Math.round(recommendedAmount * 0.8) },
      { name: "Recommended", value: recommendedAmount },
      { name: "Requested", value: amount },
    ],
  };
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
  return 0;
}
