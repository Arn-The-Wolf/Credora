"use client"

import { useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { api, getErrorMessage } from "@/lib/api"
import Link from "next/link"

function VerifyEmailForm() {
  const params = useSearchParams()
  const token = params.get("token") || ""
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const verify = async () => {
    try {
      const { data } = await api.post<{ message: string }>("/auth/verify-email", { token })
      setMessage(data.message)
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-4 text-center">
        <h1 className="text-2xl font-bold">Verify your email</h1>
        {message ? <p className="text-green-700">{message}</p> : (
          <button onClick={verify} className="bg-[#061525] text-white px-6 py-3 rounded-lg">
            Verify Email
          </button>
        )}
        {error && <p className="text-red-600">{error}</p>}
        <Link href="/login" className="text-blue-600 underline block">Back to login</Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  )
}
