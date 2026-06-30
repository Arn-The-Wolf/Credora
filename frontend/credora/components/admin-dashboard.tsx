"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart, ChartContainer } from "@/components/ui/charts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search,
  Filter,
  Download,
  Users,
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Eye,
  ChevronRight,
  Bell,
  Calendar,
} from "lucide-react"
import AdminLayout from "@/components/admin-layout"
import { api, AdminDashboardSummary, AdminReportsSummary } from "@/lib/api"
import { AdminPageSkeleton } from "@/components/page-skeletons"
import { formatKES } from "@/lib/format"
import Link from "next/link"

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState("7d")
  const [applicationFilter, setApplicationFilter] = useState("all")
  const [appSearch, setAppSearch] = useState("")
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null)
  const [reports, setReports] = useState<AdminReportsSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get<AdminDashboardSummary>("/admin/dashboard"),
      api.get<AdminReportsSummary>("/admin/reports"),
    ])
      .then(([dash, rep]) => {
        setSummary(dash.data)
        setReports(rep.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dateRange])

  const totalApps = reports?.totalApplications ?? summary?.totalApplications ?? 0
  const approvedApps = reports?.approvedApplications ?? summary?.approvedApplications ?? 0
  const rejectedApps = reports?.rejectedApplications ?? summary?.rejectedApplications ?? 0
  const pendingApps = reports?.pendingApplications ?? summary?.pendingApplications ?? 0
  const approvalRate = reports?.approvalRate ?? (totalApps > 0 ? Math.round((approvedApps / totalApps) * 100) : 0)
  const rejectionRate = totalApps > 0 ? Math.round((rejectedApps / totalApps) * 100) : 0

  const dashboardMetrics = {
    totalApplications: totalApps,
    pendingApplications: pendingApps,
    approvedApplications: approvedApps,
    rejectedApplications: rejectedApps,
    totalLoanAmount: reports?.totalLoanVolume ?? 0,
    averageInterestRate: reports?.averageInterestRate ?? 0,
    activeCustomers: summary?.totalCustomers ?? 0,
    defaultRate: reports?.defaultRate ?? 0,
    approvalRate,
    rejectionRate,
  }

  const applicationTrendData = (reports?.loanPerformance ?? []).map((row) => ({
    name: row.month,
    pending: Math.max(0, row.applications - row.approvals - row.rejections),
    approved: row.approvals,
    rejected: row.rejections,
  }))

  const loanDistributionData = (reports?.loanDistribution ?? []).map((row) => ({
    name: row.type.charAt(0).toUpperCase() + row.type.slice(1),
    value: row.amount,
  }))

  const recentApplications = (summary?.recentApplications ?? []).map((app) => ({
    id: app.referenceId,
    customer: app.customerName ?? "Applicant",
    type: app.loanType,
    amount: Number(app.amount),
    date: app.submittedDate ?? "",
    status: app.status,
    creditScore: app.aiCreditScore ?? 0,
  }))

  const filteredApplications =
    (applicationFilter === "all"
      ? recentApplications
      : recentApplications.filter((app) => app.status === applicationFilter)
    ).filter((app) => {
      if (!appSearch.trim()) return true
      const q = appSearch.toLowerCase()
      return app.id.toLowerCase().includes(q) || app.customer.toLowerCase().includes(q) || app.type.toLowerCase().includes(q)
    })

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    approved: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> },
    pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4 text-yellow-500 mr-1" /> },
    processing: { color: "bg-blue-100 text-blue-800", icon: <Clock className="h-4 w-4 text-blue-500 mr-1" /> },
    rejected: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4 text-red-500 mr-1" /> },
  }
  const statusStyle = (s: string) => statusConfig[s] ?? { color: "bg-gray-100 text-gray-800", icon: <AlertCircle className="h-4 w-4 mr-1" /> }

  if (loading) {
    return (
      <AdminLayout title="Admin Dashboard">
        <AdminPageSkeleton />
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="space-y-6">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold">Loan Management Dashboard</h1>
            <p className="text-gray-500">Overview of loan applications and performance metrics</p>
          </div>
          <div className="mt-4 md:mt-0 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="year">This year</SelectItem>
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/admin/reports">
              <Download className="h-4 w-4 mr-2" />
              Export Report
              </Link>
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Applications</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.totalApplications}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>All time</span>
                <CreditCard className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Total Loan Amount</p>
                  <p className="text-2xl font-bold">{formatKES(dashboardMetrics.totalLoanAmount)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Disbursed volume</span>
                <DollarSign className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Active Customers</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.activeCustomers}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Registered borrowers</span>
                <Users className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500">Default Rate</p>
                  <p className="text-2xl font-bold">{dashboardMetrics.defaultRate.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <span>Portfolio default rate</span>
                <AlertCircle className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-yellow-700">Pending Applications</p>
                  <p className="text-2xl font-bold text-yellow-800">{dashboardMetrics.pendingApplications}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-yellow-700">Requires review</span>
                <Button asChild size="sm" variant="outline" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">
                  <Link href="/admin/applications?status=pending">View All</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-green-700">Approved Applications</p>
                  <p className="text-2xl font-bold text-green-800">{dashboardMetrics.approvedApplications}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-green-700">Approval rate: {dashboardMetrics.approvalRate}%</span>
                <Button asChild size="sm" variant="outline" className="border-green-500 text-green-700 hover:bg-green-100">
                  <Link href="/admin/applications?status=approved">View All</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-red-700">Rejected Applications</p>
                  <p className="text-2xl font-bold text-red-800">{dashboardMetrics.rejectedApplications}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-red-700">Rejection rate: {dashboardMetrics.rejectionRate}%</span>
                <Button asChild size="sm" variant="outline" className="border-red-500 text-red-700 hover:bg-red-100">
                  <Link href="/admin/applications?status=rejected">View All</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Trends</CardTitle>
              <CardDescription>Monthly application volume by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer>
                  <BarChart
                    data={applicationTrendData}
                    categories={["pending", "approved", "rejected"]}
                    colors={["#f59e0b", "#10b981", "#ef4444"]}
                    valueFormatter={(value) => `${value}`}
                    showLegend={true}
                    showXAxis={true}
                    showYAxis={true}
                  />
                </ChartContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loan Distribution</CardTitle>
              <CardDescription>Total loan amount by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ChartContainer>
                  <BarChart
                    data={loanDistributionData}
                    categories={["value"]}
                    colors={["#3b82f6"]}
                    valueFormatter={(value) => formatKES(value)}
                    showLegend={false}
                    showXAxis={true}
                    showYAxis={true}
                  />
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>Latest loan applications received</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search applications"
                    className="pl-10 pr-4 w-64"
                    value={appSearch}
                    onChange={(e) => setAppSearch(e.target.value)}
                  />
                </div>
                <Select value={applicationFilter} onValueChange={setApplicationFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Loan Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium">{application.id}</TableCell>
                      <TableCell>{application.customer}</TableCell>
                      <TableCell>{application.type}</TableCell>
                      <TableCell>{formatKES(application.amount)}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {application.creditScore}
                          <div
                            className={`ml-2 w-2 h-2 rounded-full ${
                              application.creditScore >= 740
                                ? "bg-green-500"
                                : application.creditScore >= 670
                                  ? "bg-blue-500"
                                  : application.creditScore >= 580
                                    ? "bg-yellow-500"
                                    : "bg-red-500"
                            }`}
                          ></div>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(application.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge className={statusStyle(application.status).color}>
                          <div className="flex items-center">
                            {statusStyle(application.status).icon}
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {application.status === "pending" && (
                            <>
                              <Button variant="ghost" size="icon" className="text-green-500">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-500">
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="text-sm text-gray-500">
              Showing {filteredApplications.length} of {recentApplications.length} applications
            </div>
            <Button asChild variant="outline">
              <Link href="/admin/applications">
              View All Applications
              <ChevronRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Alerts and Notifications */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <Bell className="h-5 w-5 mr-2 text-blue-500" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardMetrics.pendingApplications > 5 && (
              <div className="flex items-start p-3 border bg-white rounded-lg">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Pending Applications Queue</div>
                  <div className="text-xs text-gray-700 mt-1">
                    {dashboardMetrics.pendingApplications} applications are awaiting review.
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href="/admin/applications?status=pending">Review now</Link>
                  </Button>
                </div>
              </div>
              )}

              {dashboardMetrics.approvalRate > 0 && (
              <div className="flex items-start p-3 border bg-white rounded-lg">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mr-3">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Portfolio Approval Rate</div>
                  <div className="text-xs text-gray-700 mt-1">
                    Current approval rate is {dashboardMetrics.approvalRate}% across {dashboardMetrics.totalApplications} applications.
                  </div>
                </div>
              </div>
              )}

              <div className="flex items-start p-3 border bg-white rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                  <Calendar className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Disbursement Queue</div>
                  <div className="text-xs text-gray-700 mt-1">
                    Approved loans ready for M-Pesa disbursement are managed on the disbursements page.
                  </div>
                  <Button asChild size="sm" variant="outline" className="mt-2">
                    <Link href="/admin/loans">Open disbursements</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

