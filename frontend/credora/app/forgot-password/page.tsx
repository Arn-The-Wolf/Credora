"use client"

import { useState } from "react"
import { api, getErrorMessage } from "@/lib/api"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const { data } = await api.post<{ message: string }>("/auth/forgot-password", { email })
      setMessage(data.message)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form onSubmit={submit} className="max-w-md w-full bg-white p-8 rounded-xl shadow space-y-4">
        <h1 className="text-2xl font-bold text-[#061525]">Forgot password</h1>
        <p className="text-sm text-gray-600">Enter your email and we will send a reset link.</p>
        <input
          type="email"
          required
          placeholder="Email address"
          className="w-full border rounded-lg px-4 py-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={loading} className="w-full bg-[#061525] text-white py-3 rounded-lg">
          {loading ? "Sending..." : "Send reset link"}
        </button>
        {message && <p className="text-green-700 text-sm">{message}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <Link href="/login" className="text-sm text-blue-600 underline block text-center">Back to login</Link>
      </form>
    </div>
  )
}
