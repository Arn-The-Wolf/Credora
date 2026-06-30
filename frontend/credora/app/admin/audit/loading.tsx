import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"

export default function Loading() {
  return (
    <AdminLayout title="Audit Log">
      <TableSkeleton rows={8} cols={5} />
    </AdminLayout>
  )
}
