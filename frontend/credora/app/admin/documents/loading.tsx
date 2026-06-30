import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"

export default function Loading() {
  return (
    <AdminLayout title="Documents">
      <TableSkeleton rows={6} cols={5} />
    </AdminLayout>
  )
}
