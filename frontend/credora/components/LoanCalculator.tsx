"use client"

import { useState } from "react"
import Link from "next/link"
import { formatKES } from "@/lib/format"

const INTEREST_RATE = 14 // Kenya personal loan benchmark APR %

export default function LoanCalculator() {
  const [loanAmount, setLoanAmount] = useState(50000)
  const [loanDuration, setLoanDuration] = useState(12)

  const monthlyInterestRate = INTEREST_RATE / 100 / 12

  const calculateMonthlyPayment = (principal: number, months: number, rate: number) => {
    if (rate === 0) return principal / months
    return (principal * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
  }

  const monthlyPayment = calculateMonthlyPayment(loanAmount, loanDuration, monthlyInterestRate)
  const totalPayback = monthlyPayment * loanDuration

  return (
    <div className="max-w-5xl flex flex-col justify-between py-20 px-10 h-[670px] mx-auto bg-[#EDEEEF] rounded-lg shadow-md text-[#4B4F5E]">
      <div className="mb-6">
        <label className="block text-xl font-medium text-gray-700 mb-2">
          Loan Amount: {formatKES(loanAmount)}
        </label>
        <input
          type="range"
          min="5000"
          max="500000"
          step="5000"
          value={loanAmount}
          onChange={(e) => setLoanAmount(Number(e.target.value))}
          className="w-full h-2 bg-[#a2a5ad] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-md text-gray-500 mt-1">
          <span>{formatKES(5000)}</span>
          <span>{formatKES(500000)}</span>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-xl font-medium text-gray-700 mb-2">
          Duration: {loanDuration} Months
        </label>
        <input
          type="range"
          min="3"
          max="60"
          value={loanDuration}
          onChange={(e) => setLoanDuration(Number(e.target.value))}
          className="w-full h-2 bg-[#a2a5ad] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-md text-gray-500 mt-1">
          <span>3 months</span>
          <span>60 months</span>
        </div>
      </div>

      <div className="space-y-2 text-xl">
        <p className="text-gray-700">Monthly payment: {formatKES(monthlyPayment)}</p>
        <p className="text-gray-700">Total payback: {formatKES(totalPayback)}</p>
        <p className="text-sm text-gray-500">Illustrative rate {INTEREST_RATE}% APR — final rate from AI scoring</p>
      </div>

      <Link
        href="/dashboard/apply-for-loan"
        className="mt-6 w-full bg-white text-gray-700 border border-[#4B4F5E] rounded-full py-2 px-4 hover:bg-gray-100 transition-colors text-xl text-center block"
      >
        Apply For Loan
      </Link>
    </div>
  )
}
