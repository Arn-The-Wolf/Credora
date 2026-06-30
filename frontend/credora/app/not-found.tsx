import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a1525] to-[#1a2b45] text-white p-6">
      <h1 className="text-6xl font-bold">404</h1>
      <p className="mt-4 text-xl text-blue-100">Page not found</p>
      <p className="mt-2 text-gray-400 text-center max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <div className="mt-8 flex gap-4">
        <Button asChild className="bg-white text-[#0a1525] hover:bg-blue-100">
          <Link href="/">Home</Link>
        </Button>
        <Button asChild variant="outline" className="border-white text-white hover:bg-white/10">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
