"use client"

import { useState } from "react"
import Link from "next/link"
import { formatKES } from "@/lib/format"
import { LOAN_TYPES } from "@/lib/loan-types"

export default function LoanCalculator() {
  const [loanTypeId, setLoanTypeId] = useState("personal")
  const loanConfig = LOAN_TYPES.find((t) => t.id === loanTypeId) ?? LOAN_TYPES[0]
  const [loanAmount, setLoanAmount] = useState(loanConfig.minAmount + 10000)
  const [loanDuration, setLoanDuration] = useState(loanConfig.terms[Math.floor(loanConfig.terms.length / 2)])

  const interestRate = loanConfig.baseApr
  const monthlyInterestRate = interestRate / 100 / 12

  const calculateMonthlyPayment = (principal: number, months: number, rate: number) => {
    if (rate === 0) return principal / months
    return (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
  }

  const monthlyPayment = calculateMonthlyPayment(loanAmount, loanDuration, monthlyInterestRate)
  const totalPayback = monthlyPayment * loanDuration

  const onTypeChange = (id: string) => {
    const cfg = LOAN_TYPES.find((t) => t.id === id) ?? LOAN_TYPES[0]
    setLoanTypeId(id)
    setLoanAmount(Math.min(cfg.maxAmount, Math.max(cfg.minAmount, cfg.minAmount + 10000)))
    setLoanDuration(cfg.terms[Math.floor(cfg.terms.length / 2)])
  }

  return (
    <div className="max-w-5xl flex flex-col justify-between py-20 px-10 min-h-[670px] mx-auto bg-[#EDEEEF] rounded-lg shadow-md text-[#4B4F5E]">
      <div className="mb-6">
        <label className="block text-xl font-medium text-gray-700 mb-2">Loan type</label>
        <div className="flex flex-wrap gap-2">
          {LOAN_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTypeChange(t.id)}
              className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                loanTypeId === t.id
                  ? "bg-[#0a1525] text-white border-[#0a1525]"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-2">{loanConfig.description}</p>
      </div>

      <div className="mb-6">
        <label className="block text-xl font-medium text-gray-700 mb-2">
          Loan Amount: {formatKES(loanAmount)}
        </label>
        <input
          type="range"
          min={loanConfig.minAmount}
          max={loanConfig.maxAmount}
          step={loanConfig.maxAmount > 100000 ? 10000 : 1000}
          value={loanAmount}
          onChange={(e) => setLoanAmount(Number(e.target.value))}
          className="w-full h-2 bg-[#a2a5ad] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-md text-gray-500 mt-1">
          <span>{formatKES(loanConfig.minAmount)}</span>
          <span>{formatKES(loanConfig.maxAmount)}</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xl font-medium text-gray-700 mb-2">
          Duration: {loanDuration} Months
        </label>
        <input
          type="range"
          min={0}
          max={loanConfig.terms.length - 1}
          value={loanConfig.terms.indexOf(loanDuration)}
          onChange={(e) => setLoanDuration(loanConfig.terms[Number(e.target.value)])}
          className="w-full h-2 bg-[#a2a5ad] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-md text-gray-500 mt-1">
          <span>{loanConfig.terms[0]} months</span>
          <span>{loanConfig.terms[loanConfig.terms.length - 1]} months</span>
        </div>
      </div>

      <div className="space-y-2 text-xl">
        <p className="text-gray-700">Monthly payment: {formatKES(monthlyPayment)}</p>
        <p className="text-gray-700">Total payback: {formatKES(totalPayback)}</p>
        <p className="text-sm text-gray-500">
          Illustrative {loanConfig.name.toLowerCase()} rate {interestRate}% APR — final rate from AI scoring
        </p>
      </div>

      <Link
        href={`/dashboard/apply-for-loan?type=${loanTypeId}`}
        className="mt-6 w-full bg-white text-gray-700 border border-[#4B4F5E] rounded-full py-2 px-4 hover:bg-gray-100 transition-colors text-xl text-center block"
      >
        Apply For {loanConfig.name}
      </Link>
    </div>
  )
}
