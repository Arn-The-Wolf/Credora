import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"

export default function Loading() {
  return (
    <AdminLayout title="Customers">
      <TableSkeleton rows={8} cols={6} />
    </AdminLayout>
  )
}
