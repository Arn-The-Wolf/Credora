"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  CreditCard,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react"
import Layout from "@/components/layout"
import { DashboardSkeleton } from "@/components/page-skeletons"
import { api, DashboardSummary } from "@/lib/api"
import { formatKES } from "@/lib/format"

function statusBadge(status: string) {
  const s = status?.toLowerCase() ?? ""
  if (s === "approved" || s === "active") return "bg-green-100 text-green-800"
  if (s === "rejected") return "bg-red-100 text-red-800"
  if (s === "processing" || s === "pending") return "bg-blue-100 text-blue-800"
  return "bg-yellow-100 text-yellow-800"
}

export default function Dashboard() {
  const router = useRouter()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardSummary>("/dashboard/summary")
      .then((r) => setSummary(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Layout title="Dashboard">
        <DashboardSkeleton />
      </Layout>
    )
  }

  const apps = summary?.recentApplications ?? []
  const loans = summary?.activeLoanList ?? []
  const creditScore = summary?.creditScore ?? 650
  const eligibility = Math.round(summary?.approvalRate ?? 75)

  const getCreditLabel = (score: number) => {
    if (score >= 740) return { label: "Very Good", color: "text-green-500" }
    if (score >= 670) return { label: "Good", color: "text-blue-500" }
    if (score >= 580) return { label: "Fair", color: "text-yellow-500" }
    return { label: "Building", color: "text-orange-500" }
  }
  const rating = getCreditLabel(creditScore)

  return (
    <Layout title="Dashboard">
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card className="bg-gradient-to-r from-[#0a1525] to-[#1a2b45] text-white border-none">
          <CardContent className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold">Welcome back, {summary?.userName ?? "there"}</h2>
              <p className="mt-1 text-blue-100">Your Credora financial overview</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-[#0a1525] hover:bg-blue-100">
                <Link href="/dashboard/apply-for-loan">
                  <CreditCard className="h-4 w-4 mr-2" /> Apply for a Loan
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
                <Link href="/dashboard/manage-loans">
                  <FileText className="h-4 w-4 mr-2" /> Manage Loans
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Credit Score", value: String(creditScore), sub: rating.label },
            { label: "Active Loans", value: String(summary?.activeLoans ?? 0), sub: "current" },
            { label: "Total Borrowed", value: formatKES(summary?.totalBorrowed), sub: "lifetime" },
            { label: "Remaining", value: formatKES(summary?.remainingBalance), sub: "outstanding" },
          ].map((m) => (
            <Card key={m.label}>
              <CardContent className="p-5">
                <p className="text-sm text-gray-500">{m.label}</p>
                <p className="text-2xl font-bold mt-1">{m.value}</p>
                <p className="text-xs text-gray-400 mt-1 capitalize">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Applications</CardTitle>
              <CardDescription>Track your loan application status</CardDescription>
            </CardHeader>
            <CardContent>
              {apps.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No applications yet</p>
                  <Button asChild className="mt-4 bg-[#0a1525]">
                    <Link href="/dashboard/apply-for-loan">Apply now</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {apps.slice(0, 5).map((app) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => router.push("/dashboard/loan-tracker")}
                    >
                      <div className="flex items-center gap-3">
                        {app.status === "approved" ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-blue-500" />
                        )}
                        <div>
                          <p className="font-medium capitalize">{app.loanType} — {app.purpose}</p>
                          <p className="text-sm text-gray-500">{app.referenceId}</p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          <p className="font-medium">{formatKES(app.amount)}</p>
                          <Badge className={statusBadge(app.status)}>{app.status}</Badge>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loan Eligibility</CardTitle>
              <CardDescription>Based on your profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Approval likelihood</span>
                  <span>{eligibility}%</span>
                </div>
                <Progress value={eligibility} className="h-2" />
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">AI credit score</p>
                  <p className={`text-lg font-bold ${rating.color}`}>{creditScore} — {rating.label}</p>
                </div>
              </div>
              <Button asChild className="w-full bg-[#0a1525]">
                <Link href="/dashboard/apply-for-loan">Check loan options</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Loans</CardTitle>
            <CardDescription>Manage payments and schedules</CardDescription>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No active loans — apply or wait for disbursement after approval</p>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => {
                  const paid = loan.principal > 0
                    ? Math.round(((loan.principal - loan.remainingBalance) / loan.principal) * 100)
                    : 0
                  return (
                    <div key={loan.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium capitalize">{loan.purpose ?? "Loan"}</p>
                          <p className="text-sm text-gray-500">{loan.referenceId}</p>
                        </div>
                        <Badge className={statusBadge(loan.status)}>{loan.status}</Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Balance</p>
                          <p className="font-semibold">{formatKES(loan.remainingBalance)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Monthly</p>
                          <p className="font-semibold">{formatKES(loan.monthlyPayment)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Paid</p>
                          <p className="font-semibold">{paid}%</p>
                        </div>
                      </div>
                      <Progress value={paid} className="h-2 mt-3" />
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" asChild>
                          <Link href="/dashboard/manage-loans">Manage</Link>
                        </Button>
                        {loan.status === "ACTIVE" && (
                          <Button size="sm" className="bg-[#0a1525]" asChild>
                            <Link href="/dashboard/manage-loans">
                              <Calendar className="h-3 w-3 mr-1" /> Pay now
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
