import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"

export default function Loading() {
  return (
    <AdminLayout title="Applications">
      <TableSkeleton rows={8} cols={7} />
    </AdminLayout>
  )
}
