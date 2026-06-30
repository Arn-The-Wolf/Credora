import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"

export default function Loading() {
  return (
    <AdminLayout title="Disbursements">
      <TableSkeleton rows={5} cols={6} />
    </AdminLayout>
  )
}
