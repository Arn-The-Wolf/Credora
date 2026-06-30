"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, getErrorMessage } from "@/lib/api"

interface Notification {
  id: number
  title?: string
  message: string
  category?: string
  read?: boolean
  createdAt?: string
}

export default function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>([])
  const [error, setError] = useState("")

  const load = () => {
    api.get<Notification[]>("/notifications")
      .then((r) => setItems(r.data))
      .catch((e) => setError(getErrorMessage(e)))
  }

  useEffect(() => { load() }, [])

  const unread = items.filter((n) => !n.read).length

  const markRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      load()
    } catch { /* ignore */ }
  }

  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={() => setOpen(!open)} className="relative">
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
            {unread}
          </span>
        )}
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          <div className="p-3 border-b font-medium">Notifications</div>
          {error && <p className="p-3 text-sm text-red-600">{error}</p>}
          {items.length === 0 && <p className="p-4 text-sm text-gray-500">No notifications</p>}
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-3 border-b text-sm cursor-pointer hover:bg-gray-50 ${!n.read ? "bg-blue-50" : ""}`}
              onClick={() => !n.read && markRead(n.id)}
            >
              {n.title && <div className="font-medium">{n.title}</div>}
              <div className="text-gray-600">{n.message}</div>
              {n.createdAt && <div className="text-xs text-gray-400 mt-1">{n.createdAt.slice(0, 10)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
