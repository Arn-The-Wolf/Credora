"use client"

import { useEffect, useState } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, ScheduleEntry, getErrorMessage } from "@/lib/api"
import { formatKES } from "@/lib/format"

interface Props {
  loanId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function PaymentScheduleDialog({ loanId, open, onOpenChange }: Props) {
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !loanId) return
    api.get<ScheduleEntry[]>(`/loans/${loanId}/schedule`)
      .then((r) => setSchedule(r.data))
      .catch((e) => setError(getErrorMessage(e)))
  }, [open, loanId])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Payment Schedule</SheetTitle>
        </SheetHeader>
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((row) => (
              <TableRow key={row.installment}>
                <TableCell>{row.installment}</TableCell>
                <TableCell>{row.dueDate}</TableCell>
                <TableCell>{formatKES(row.payment)}</TableCell>
                <TableCell>{row.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  )
}
