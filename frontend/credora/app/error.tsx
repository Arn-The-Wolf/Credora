"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-gray-600 text-center max-w-md">
        We could not load this page. Please try again.
      </p>
      <Button className="mt-6 bg-[#0a1525] hover:bg-[#1a2b45]" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
