"use client"

import { useSearchParams } from "next/navigation"
import { useState, Suspense } from "react"
import { api, getErrorMessage } from "@/lib/api"
import Link from "next/link"

function ResetForm() {
  const params = useSearchParams()
  const token = params.get("token") || ""
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data } = await api.post<{ message: string }>("/auth/reset-password", { token, newPassword: password })
      setMessage(data.message)
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={submit} className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <input type="password" placeholder="New password (10+ chars, mixed case, number, symbol)"
          className="w-full border rounded-lg px-4 py-3" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit" className="w-full bg-[#061525] text-white py-3 rounded-lg">Update password</button>
        {message && <p className="text-green-700">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
        <Link href="/login" className="text-blue-600 underline">Back to login</Link>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  )
}
