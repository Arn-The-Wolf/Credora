import Layout from "@/components/layout"
import { DashboardSkeleton } from "@/components/page-skeletons"

export default function DashboardLoading() {
  return (
    <Layout title="Dashboard">
      <DashboardSkeleton />
    </Layout>
  )
}
