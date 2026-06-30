import AdminLayout from "@/components/admin-layout"
import { AdminPageSkeleton } from "@/components/page-skeletons"

export default function Loading() {
  return (
    <AdminLayout title="Reports">
      <AdminPageSkeleton />
    </AdminLayout>
  )
}
