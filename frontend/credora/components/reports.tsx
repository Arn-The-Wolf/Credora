"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart, ChartContainer } from "@/components/ui/charts"
import { DollarSign, TrendingUp, FileText } from "lucide-react"
import Layout from "@/components/layout"
import { CardListSkeleton, MetricCardsSkeleton } from "@/components/page-skeletons"
import { api, DashboardSummary, LoanResponse } from "@/lib/api"
import { formatKES } from "@/lib/format"

export default function Reports() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loans, setLoans] = useState<LoanResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<DashboardSummary>("/dashboard/summary"),
      api.get<LoanResponse[]>("/loans"),
    ])
      .then(([s, l]) => {
        setSummary(s.data)
        setLoans(l.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const paymentTrend = loans.length
    ? loans.map((loan, i) => ({
        name: loan.referenceId?.slice(-4) ?? `L${i + 1}`,
        value: Number(loan.monthlyPayment ?? 0),
      }))
    : [{ name: "—", value: 0 }]

  const balanceData = loans.map((loan, i) => ({
    name: loan.referenceId?.slice(-4) ?? `L${i + 1}`,
    active: Number(loan.remainingBalance ?? 0),
  }))

  if (loading) {
    return (
      <Layout title="Financial Reports">
        <div className="space-y-6">
          <MetricCardsSkeleton count={3} />
          <CardListSkeleton items={2} />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Financial Reports">
      <div className="space-y-6 animate-in fade-in duration-500">
        <Card className="bg-gradient-to-r from-[#0a1525] to-[#1a2b45] text-white border-none">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold">Financial Reports</h2>
            <p className="mt-1 text-blue-100">Live data from your Credora account</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Total borrowed</p>
                <p className="text-xl font-bold">{formatKES(summary?.totalBorrowed)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Total repaid</p>
                <p className="text-xl font-bold">{formatKES(summary?.totalPaid)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Credit score</p>
                <p className="text-xl font-bold">{summary?.creditScore ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="payments">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="balances">Balances</TabsTrigger>
          </TabsList>
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Monthly payment by loan</CardTitle>
                <CardDescription>Scheduled instalments across active loans</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                {loans.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">No loan data yet</p>
                ) : (
                  <ChartContainer>
                    <BarChart
                      data={paymentTrend}
                      categories={["value"]}
                      colors={["#3b82f6"]}
                      valueFormatter={(v) => formatKES(v)}
                    />
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="balances">
            <Card>
              <CardHeader>
                <CardTitle>Remaining balances</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {loans.length === 0 ? (
                  <p className="text-gray-500 text-center py-12">No loan data yet</p>
                ) : (
                  <ChartContainer>
                    <LineChart
                      data={balanceData.map((d) => ({ name: d.name, value: d.active }))}
                      categories={["value"]}
                      colors={["#10b981"]}
                      valueFormatter={(v) => formatKES(v)}
                    />
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle>Loan summary</CardTitle>
          </CardHeader>
          <CardContent>
            {loans.length === 0 ? (
              <p className="text-gray-500">No loans on file</p>
            ) : (
              <div className="space-y-3">
                {loans.map((loan) => (
                  <div key={loan.id} className="flex justify-between border rounded-lg p-4">
                    <div>
                      <p className="font-medium">{loan.referenceId}</p>
                      <p className="text-sm text-gray-500 capitalize">{loan.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatKES(loan.remainingBalance)}</p>
                      <p className="text-sm text-gray-500">{formatKES(loan.monthlyPayment)}/mo</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
