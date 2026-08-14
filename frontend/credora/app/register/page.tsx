"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { User, Mail, Lock, Phone, Home, Briefcase, DollarSign, Building, Globe, FileText } from "lucide-react"
import { api, getErrorMessage, setAuth } from "@/lib/api"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function SignUpPage() {
  const [userType, setUserType] = useState<"applicant" | "bank">("applicant")
  const [error, setError] = useState<string>("")
  const [success, setSuccess] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // Applicant form state
  const [applicantForm, setApplicantForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    address: "",
    employmentStatus: "",
    monthlyIncome: "",
    idPassportNumber: "",
    acceptTerms: false,
    acceptPrivacy: false,
  })

  // Bank form state
  const [bankForm, setBankForm] = useState({
    institutionName: "",
    registrationLicenseNumber: "",
    contactPersonName: "",
    businessAddress: "",
    institutionWebsite: "",
    institutionEmail: "",
    password: "",
    phoneNumber: "",
  })

  const [isClient, setIsClient] = useState(false)

  // Initialize the router only on the client side to prevent NextRouter not mounted error
  const router = useRouter()

  useEffect(() => {
    setIsClient(true) // Set flag when the component is mounted in the client-side
  }, [])

  // Handle redirection when success message is set
  useEffect(() => {
    if (success && success.includes("Redirecting")) {
      const redirectTimer = setTimeout(() => {
        router.push("/login")
      }, 1500)

      return () => clearTimeout(redirectTimer)
    }
  }, [success, router])

  const handleApplicantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setApplicantForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleBankChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setBankForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (userType === "applicant") {
        const { fullName, email, password, phoneNumber, address, employmentStatus, monthlyIncome, idPassportNumber } =
          applicantForm

        if (
          !fullName ||
          !email ||
          !password ||
          !phoneNumber ||
          !address ||
          !employmentStatus ||
          !monthlyIncome ||
          !idPassportNumber ||
          !applicantForm.acceptTerms ||
          !applicantForm.acceptPrivacy
        ) {
          setError("Please fill in all required fields and accept terms & privacy policy.")
          setLoading(false)
          return
        }
        const passwordCheck = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$/
        if (!passwordCheck.test(password)) {
          setError("Password must be 10+ characters with upper, lower, digit, and special character.")
          setLoading(false)
          return
        }

        const response = await api.post<{ message: string }>("/auth/signup", applicantForm)

        if (response.status === 200 || response.status === 201) {
          try {
            const login = await api.post("/auth/login", { email, password })
            setAuth(login.data.token, "applicant", login.data.user, true)
            document.cookie = `credora_token=${login.data.token}; path=/; max-age=86400; SameSite=Lax`
            setSuccess("Account created! Redirecting to dashboard...")
            router.push("/dashboard")
            return
          } catch {
            setSuccess(response.data.message || "Account created. Please sign in.")
          }
        }
      } else {
        const {
          institutionName,
          registrationLicenseNumber,
          contactPersonName,
          businessAddress,
          institutionWebsite,
          institutionEmail,
          password,
          phoneNumber,
        } = bankForm

        if (
          !institutionName ||
          !registrationLicenseNumber ||
          !contactPersonName ||
          !businessAddress ||
          !institutionWebsite ||
          !institutionEmail ||
          !password ||
          !phoneNumber
        ) {
          setError("Please fill in all required fields.")
          setLoading(false)
          return
        }

        const passwordCheck = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{10,}$/
        if (!passwordCheck.test(password)) {
          setError("Password must be 10+ characters with upper, lower, digit, and special character.")
          setLoading(false)
          return
        }

        const response = await api.post("/auth/signup-institution", bankForm)

        if (response.status === 200 || response.status === 201) {
          if (response.data?.token) {
            setAuth(response.data.token, "institution", response.data.institution, true)
            document.cookie = `credora_token=${response.data.token}; path=/; max-age=86400; SameSite=Lax`
            setSuccess("Institution account created! Redirecting...")
            router.push("/admin")
            return
          }
          setSuccess("Institution account created successfully! Redirecting to login page...")
          setBankForm({
            institutionName: "",
            registrationLicenseNumber: "",
            contactPersonName: "",
            businessAddress: "",
            institutionWebsite: "",
            institutionEmail: "",
            password: "",
            phoneNumber: "",
          })
        }
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0F2FF] to-[#F8F9FC] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-3 bg-[#061525]"></div>
        <h1 className="text-3xl font-bold text-center mb-2 text-[#0A1124]">Create an Account</h1>
        <p className="text-center text-gray-600 mb-8">Join our platform to access loan services</p>

        {/* User Type Selection */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-100 p-1.5 rounded-xl flex w-full max-w-md">
            <button
              type="button"
              onClick={() => setUserType("applicant")}
              className={cn(
                "flex-1 py-3.5 px-4 rounded-lg text-center font-medium transition-all",
                userType === "applicant" ? "bg-white text-[#061525] shadow-sm" : "text-gray-600 hover:text-gray-800",
              )}
            >
              Loan Applicant
            </button>
            <button
              type="button"
              onClick={() => setUserType("bank")}
              className={cn(
                "flex-1 py-3.5 px-4 rounded-lg text-center font-medium transition-all",
                userType === "bank" ? "bg-white text-[#061525] shadow-sm" : "text-gray-600 hover:text-gray-800",
              )}
            >
              Financial Institution
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8 rounded">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Google Sign Up Button */}
        <div className="max-w-md mx-auto mb-8">
          <button
            type="button"
            onClick={() => signIn("google", { callbackUrl: userType === "applicant" ? "/dashboard" : "/admin" })}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 py-3.5 rounded-xl hover:bg-gray-50 transition-colors text-base disabled:opacity-70"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-6 h-6" />
            Sign up with Google
          </button>
        </div>

        <div className="flex items-center my-8 max-w-md mx-auto">
          <div className="flex-1 h-px bg-gray-300"></div>
          <span className="px-6 text-gray-500">OR</span>
          <div className="flex-1 h-px bg-gray-300"></div>
        </div>

        {/* Applicant Form */}
        {userType === "applicant" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <User className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name *"
                  value={applicantForm.fullName}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Mail className="text-[#061525] min-w-5" size={22} />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address *"
                  value={applicantForm.email}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Lock className="text-[#061525] min-w-5" size={22} />
                <input
                  type="password"
                  name="password"
                  placeholder="Password *"
                  value={applicantForm.password}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Phone className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="phoneNumber"
                  placeholder="Phone Number *"
                  value={applicantForm.phoneNumber}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Home className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="address"
                  placeholder="Home Address *"
                  value={applicantForm.address}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Briefcase className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="employmentStatus"
                  placeholder="Employment Status *"
                  value={applicantForm.employmentStatus}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <DollarSign className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="monthlyIncome"
                  placeholder="Monthly Income *"
                  value={applicantForm.monthlyIncome}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <FileText className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="idPassportNumber"
                  placeholder="ID Number *"
                  value={applicantForm.idPassportNumber}
                  onChange={handleApplicantChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-600 px-1">
              <p className="text-xs text-gray-500">Use 10+ characters with upper, lower, a number, and a special character (example: Password123!).</p>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={applicantForm.acceptTerms}
                  onChange={(e) => setApplicantForm((p) => ({ ...p, acceptTerms: e.target.checked }))} />
                I accept the Terms of Service
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={applicantForm.acceptPrivacy}
                  onChange={(e) => setApplicantForm((p) => ({ ...p, acceptPrivacy: e.target.checked }))} />
                I accept the Privacy Policy (Kenya Data Protection Act)
              </label>
            </div>
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#061525] text-white py-3.5 rounded-xl transition-all font-medium text-base shadow-lg shadow-blue-200 disabled:opacity-70"
              >
                {loading ? "Creating Account..." : "Create Applicant Account"}
              </button>
            </div>
          </form>
        )}

        {/* Bank Form */}
        {userType === "bank" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Building className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="institutionName"
                  placeholder="Institution Name *"
                  value={bankForm.institutionName}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Building className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="registrationLicenseNumber"
                  placeholder="Registration Number *"
                  value={bankForm.registrationLicenseNumber}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <User className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="contactPersonName"
                  placeholder="Contact Name *"
                  value={bankForm.contactPersonName}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Mail className="text-[#061525] min-w-5" size={22} />
                <input
                  type="email"
                  name="institutionEmail"
                  placeholder="Email Address *"
                  value={bankForm.institutionEmail}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Lock className="text-[#061525] min-w-5" size={22} />
                <input
                  type="password"
                  name="password"
                  placeholder="Password *"
                  value={bankForm.password}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Phone className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="phoneNumber"
                  placeholder="Phone Number *"
                  value={bankForm.phoneNumber}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Home className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="businessAddress"
                  placeholder="Institution Address *"
                  value={bankForm.businessAddress}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
              <div className="flex items-center border-2 border-gray-200 rounded-xl px-5 py-4 focus-within:border-[#061525] focus-within:ring-2 focus-within:ring-[#061525]/20 transition-all">
                <Globe className="text-[#061525] min-w-5" size={22} />
                <input
                  type="text"
                  name="institutionWebsite"
                  placeholder="Website URL"
                  value={bankForm.institutionWebsite}
                  onChange={handleBankChange}
                  className="w-full ml-3 outline-none text-[#333] text-base"
                />
              </div>
            </div>
            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#061525] text-white py-3.5 rounded-xl transition-all font-medium text-base shadow-lg shadow-blue-200 disabled:opacity-70"
              >
                {loading ? "Creating Account..." : "Create Institution Account"}
              </button>
            </div>
          </form>
        )}

        {/* Already have an account link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#061525] hover:underline font-medium">
              Log In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

