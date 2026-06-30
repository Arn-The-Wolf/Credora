"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, User } from "lucide-react"
import { getStoredAuth } from "@/lib/api"
import NotificationsPanel from "@/components/notifications-panel"

interface AdminHeaderProps {
  title: string
}

export default function AdminHeader({ title }: AdminHeaderProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const auth = getStoredAuth()
  const userData = auth?.userData as {
    fullName?: string
    email?: string
    institutionName?: string
    institutionEmail?: string
  } | null
  const displayName = userData?.institutionName || userData?.fullName || "Admin"
  const displayEmail = userData?.institutionEmail || userData?.email || ""

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (search.trim()) {
      router.push(`/admin/applications?search=${encodeURIComponent(search.trim())}`)
    }
  }

  return (
    <div className="flex justify-between items-center p-6 border-b bg-white">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center space-x-4">
        <form onSubmit={onSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </form>
        <NotificationsPanel />
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center text-white">
            <User className="h-5 w-5" />
          </div>
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium leading-tight">{displayName}</p>
            {displayEmail && <p className="text-xs text-gray-500">{displayEmail}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
