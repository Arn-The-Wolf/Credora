"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  ArrowUpDown,
} from "lucide-react"
import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"
import { api, ApplicationResponse } from "@/lib/api"
import { formatKES } from "@/lib/format"
import Link from "next/link"

function withinDateRange(submittedDate: string | undefined, range: string): boolean {
  if (range === "all" || !submittedDate) return true
  const d = new Date(submittedDate)
  const now = new Date()
  if (range === "today") {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return d >= start
  }
  if (range === "week") {
    const start = new Date(now)
    start.setDate(start.getDate() - 7)
    return d >= start
  }
  if (range === "month") {
    const start = new Date(now)
    start.setMonth(start.getMonth() - 1)
    return d >= start
  }
  return true
}

export default function AdminApplications() {
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  const loadApplications = () => {
    setLoading(true)
    api.get<ApplicationResponse[]>(`/admin/applications?status=${statusFilter}`)
      .then((res) => setApplications(res.data))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadApplications()
  }, [statusFilter])

  const updateStatus = async (id: number, status: string, rejectionReason?: string) => {
    await api.patch(`/admin/applications/${id}/status`, { status, rejectionReason })
    loadApplications()
  }

  const bulkUpdateStatus = async (status: string, rejectionReason?: string) => {
    await Promise.all(
      selectedApplications.map((id) =>
        api.patch(`/admin/applications/${id}/status`, { status, rejectionReason })
      )
    )
    setSelectedApplications([])
    loadApplications()
  }

  const filteredApplications = applications.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false
    if (!withinDateRange(app.submittedDate, dateRange)) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      app.referenceId?.toLowerCase().includes(q) ||
      app.customerName?.toLowerCase().includes(q) ||
      app.customerEmail?.toLowerCase().includes(q) ||
      app.loanType?.toLowerCase().includes(q)
    )
  })

  // Status badge styling
  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    approved: { color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> },
    pending: { color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4 text-yellow-500 mr-1" /> },
    processing: { color: "bg-blue-100 text-blue-800", icon: <Clock className="h-4 w-4 text-blue-500 mr-1" /> },
    rejected: { color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4 text-red-500 mr-1" /> },
  }
  const statusStyle = (s: string) => statusConfig[s] ?? { color: "bg-gray-100 text-gray-800", icon: <AlertCircle className="h-4 w-4 mr-1" /> }

  const highDtiCount = applications.filter((a) => (a.debtToIncome ?? 0) > 0.4).length
  const borderlineScoreCount = applications.filter((a) => {
    const score = a.aiCreditScore ?? a.existingCreditScore ?? 0
    return score >= 640 && score <= 680
  }).length

  // Handle checkbox selection
  const toggleSelection = (id: string) => {
    if (selectedApplications.includes(id)) {
      setSelectedApplications(selectedApplications.filter((appId) => appId !== id))
    } else {
      setSelectedApplications([...selectedApplications, id])
    }
  }

  // Handle select all
  const toggleSelectAll = () => {
    if (selectedApplications.length === filteredApplications.length) {
      setSelectedApplications([])
    } else {
      setSelectedApplications(filteredApplications.map((app) => String(app.id)))
    }
  }

  return (
    <AdminLayout title="Loan Applications">
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-2">
            <Button
              variant={selectedApplications.length > 0 ? "default" : "outline"}
              disabled={selectedApplications.length === 0}
              onClick={() => bulkUpdateStatus("approved")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Selected
            </Button>
            <Button
              variant="outline"
              disabled={selectedApplications.length === 0}
              onClick={() => bulkUpdateStatus("rejected", "Bulk rejected by institution reviewer")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject Selected
            </Button>
            <Button variant="outline" disabled={selectedApplications.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search applications"
                className="pl-10 pr-4 w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select defaultValue="all" onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Tabs */}
        <Tabs defaultValue="all" onValueChange={setStatusFilter}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Applications</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Loan Applications</CardTitle>
                  <CardDescription>
                    {statusFilter === "all"
                      ? "All loan applications"
                      : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} applications`}
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Date Range
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedApplications.length === filteredApplications.length &&
                            filteredApplications.length > 0
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">
                          ID
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Loan Type</TableHead>
                      <TableHead>
                        <div className="flex items-center">
                          Amount
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center">
                          Credit Score
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead>DTI Ratio</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <TableSkeleton rows={6} cols={6} />
                        </TableCell>
                      </TableRow>
                    ) : filteredApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          No applications found
                        </TableCell>
                      </TableRow>
                    ) : (
                    filteredApplications.map((application) => (
                      <TableRow key={application.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedApplications.includes(String(application.id))}
                            onCheckedChange={() => toggleSelection(String(application.id))}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{application.referenceId}</TableCell>
                        <TableCell>
                          <div>
                            <div>{application.customerName}</div>
                            <div className="text-xs text-gray-500">{application.customerEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>{application.loanType}</TableCell>
                        <TableCell>{formatKES(application.amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {application.aiCreditScore ?? application.existingCreditScore ?? "—"}
                            <div
                              className={`ml-2 w-2 h-2 rounded-full ${
                                (application.aiCreditScore ?? 0) >= 740
                                  ? "bg-green-500"
                                  : (application.aiCreditScore ?? 0) >= 670
                                    ? "bg-blue-500"
                                    : (application.aiCreditScore ?? 0) >= 580
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                              }`}
                            ></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`${
                              (application.debtToIncome ?? 0) <= 0.3
                                ? "text-green-600"
                                : (application.debtToIncome ?? 0) <= 0.36
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {application.debtToIncome ? `${(application.debtToIncome * 100).toFixed(0)}%` : "—"}
                          </div>
                        </TableCell>
                        <TableCell>{application.submittedDate ? new Date(application.submittedDate).toLocaleDateString() : "—"}</TableCell>
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
                            {application.status === "approved" && (
                              <Button asChild size="sm" variant="outline">
                                <Link href={application.loanId ? `/admin/loans?highlight=${application.loanId}` : "/admin/loans"}>
                                  Disburse
                                </Link>
                              </Button>
                            )}
                            {(application.status === "pending" || application.status === "processing") && (
                              <>
                                <Button variant="ghost" size="icon" className="text-green-500" onClick={() => updateStatus(application.id, "approved")}>
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => updateStatus(application.id, "rejected", "Rejected by institution reviewer")}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-4">
              <div className="text-sm text-gray-500">
                Showing {filteredApplications.length} of {applications.length} applications
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        </Tabs>

        {(highDtiCount > 0 || borderlineScoreCount > 0) && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
              Risk Alerts
            </CardTitle>
            <CardDescription>Applications that may require additional review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highDtiCount > 0 && (
              <div className="flex items-start p-3 border bg-white rounded-lg">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">High Debt-to-Income Ratio</div>
                  <div className="text-xs text-gray-700 mt-1">
                    {highDtiCount} application{highDtiCount !== 1 ? "s have" : " has"} a debt-to-income ratio above 40%.
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link href="/admin/applications">View Applications</Link>
                  </Button>
                </div>
              </div>
              )}

              {borderlineScoreCount > 0 && (
              <div className="flex items-start p-3 border bg-white rounded-lg">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <div className="font-medium text-sm">Borderline Credit Scores</div>
                  <div className="text-xs text-gray-700 mt-1">
                    {borderlineScoreCount} application{borderlineScoreCount !== 1 ? "s have" : " has"} credit scores between 640–680.
                  </div>
                  <Button asChild variant="outline" size="sm" className="mt-2">
                    <Link href="/admin/applications">View Applications</Link>
                  </Button>
                </div>
              </div>
              )}
            </div>
          </CardContent>
        </Card>
        )}
      </div>
    </AdminLayout>
  )
}

