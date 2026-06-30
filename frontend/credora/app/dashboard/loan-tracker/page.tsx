import { Suspense } from "react"
import LoanTracker from "@/components/loan-tracket"
import Layout from "@/components/layout"

export default function LoanTrackerPage() {
  return (
    <Suspense fallback={<Layout title="Loan Tracker"><p className="p-6 text-gray-500">Loading…</p></Layout>}>
      <LoanTracker />
    </Suspense>
  )
}
