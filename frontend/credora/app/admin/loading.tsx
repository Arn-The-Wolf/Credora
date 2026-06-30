import AdminLayout from "@/components/admin-layout"
import { AdminPageSkeleton } from "@/components/page-skeletons"

export default function AdminLoading() {
  return (
    <AdminLayout title="Admin">
      <AdminPageSkeleton />
    </AdminLayout>
  )
}
