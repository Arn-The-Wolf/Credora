"use client"

import { useSearchParams } from "next/navigation"
import { useState, useEffect, Suspense } from "react"
import { api, getErrorMessage } from "@/lib/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, CheckCircle } from "lucide-react"

function VerifyEmailForm() {
  const params = useSearchParams()
  const token = params.get("token") || ""
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [verifying, setVerifying] = useState(false)

  const verify = async () => {
    if (!token) {
      setError("Missing verification token. Check your email link.")
      return
    }
    setVerifying(true)
    setError("")
    try {
      const { data } = await api.post<{ message: string }>("/auth/verify-email", { token })
      setMessage(data.message)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setVerifying(false)
    }
  }

  useEffect(() => {
    if (token) verify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0a1525] to-[#1a2b45]">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 space-y-4 text-center">
          {verifying && !message && !error && (
            <>
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-blue-600" />
              <h1 className="text-xl font-bold">Verifying your email…</h1>
            </>
          )}
          {message && (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
              <h1 className="text-xl font-bold text-green-800">Email verified</h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          {!message && !verifying && (
            <>
              <h1 className="text-2xl font-bold">Verify your email</h1>
              <p className="text-gray-500 text-sm">Open the link from your email or paste the token below.</p>
              <Button onClick={verify} className="w-full bg-[#0a1525]">
                Verify Email
              </Button>
            </>
          )}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Link href="/login" className="text-blue-600 underline block text-sm">Back to login</Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>}>
      <VerifyEmailForm />
    </Suspense>
  )
}
