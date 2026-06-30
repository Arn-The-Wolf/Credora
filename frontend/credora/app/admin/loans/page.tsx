import { Suspense } from "react"
import AdminLoans from "@/components/admin-loans"
import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"

export default function AdminLoansPage() {
  return (
    <Suspense
      fallback={
        <AdminLayout title="Disbursements">
          <TableSkeleton rows={5} cols={6} />
        </AdminLayout>
      }
    >
      <AdminLoans />
    </Suspense>
  )
}
