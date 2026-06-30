"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CheckCircle, Banknote } from "lucide-react"
import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"
import { api, getErrorMessage } from "@/lib/api"
import { formatKES } from "@/lib/format"

interface AdminLoan {
  id: number
  referenceId: string
  applicationRef?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  principal: number
  status: string
  disbursementStatus: string
  monthlyPayment: number
  createdAt?: string
}

export default function AdminLoans() {
  const searchParams = useSearchParams()
  const highlightId = searchParams.get("highlight")
  const [loans, setLoans] = useState<AdminLoan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [disbursing, setDisbursing] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    api.get<AdminLoan[]>("/admin/loans?status=pending_disbursement")
      .then((r) => setLoans(r.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const disburse = async (loan: AdminLoan) => {
    if (!loan.customerPhone) {
      setError("Customer phone number is required for M-Pesa disbursement")
      return
    }
    setDisbursing(loan.id)
    setError("")
    try {
      await api.post(`/admin/loans/${loan.id}/disburse`, {
        phoneNumber: loan.customerPhone,
      })
      load()
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setDisbursing(null)
    }
  }

  return (
    <AdminLayout title="Loan Disbursement">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Pending Disbursements</h1>
            <p className="text-gray-500">Approve and release funds to borrowers after application approval</p>
          </div>
          <Button variant="outline" onClick={load}>Refresh</Button>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" /> Loans awaiting disbursement ({loans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={5} cols={6} />
            ) : loans.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                <p>No loans pending disbursement</p>
                <p className="text-sm mt-1">Approved applications appear here after admin approval</p>
                <Button asChild className="mt-4" variant="outline">
                  <Link href="/admin/applications">Review applications</Link>
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Monthly</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id} className={highlightId === String(loan.id) ? "bg-blue-50" : undefined}>
                      <TableCell>
                        <div className="font-medium">{loan.referenceId}</div>
                        <div className="text-xs text-gray-500">{loan.applicationRef}</div>
                      </TableCell>
                      <TableCell>
                        <div>{loan.customerName}</div>
                        <div className="text-xs text-gray-500">{loan.customerEmail}</div>
                      </TableCell>
                      <TableCell>{formatKES(loan.principal)}</TableCell>
                      <TableCell>{formatKES(loan.monthlyPayment)}</TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-800">{loan.disbursementStatus}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={disbursing === loan.id || !loan.customerPhone}
                          title={!loan.customerPhone ? "Customer phone required" : undefined}
                          onClick={() => disburse(loan)}
                        >
                          {disbursing === loan.id ? "Disbursing…" : "Disburse"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
