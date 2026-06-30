"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { api, type AdminApplicationDetail, getErrorMessage } from "@/lib/api"
import { formatKES } from "@/lib/format"
import { formatCollateralSummary } from "@/lib/collateral"

interface Props {
  applicationId: number | null
  open: boolean
  onClose: () => void
  onUpdated: () => void
}

export default function AdminApplicationDetail({ applicationId, open, onClose, onUpdated }: Props) {
  const [detail, setDetail] = useState<AdminApplicationDetail | null>(null)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open || !applicationId) return
    setLoading(true)
    api.get<AdminApplicationDetail>(`/admin/applications/${applicationId}`)
      .then((r) => setDetail(r.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [open, applicationId])

  const updateStatus = async (status: string, rejectionReason?: string) => {
    if (!applicationId) return
    await api.patch(`/admin/applications/${applicationId}/status`, { status, rejectionReason })
    onUpdated()
    onClose()
  }

  const assign = async () => {
    if (!applicationId) return
    await api.patch(`/admin/applications/${applicationId}/assign`)
    onUpdated()
    api.get<AdminApplicationDetail>(`/admin/applications/${applicationId}`).then((r) => setDetail(r.data))
  }

  const addNote = async () => {
    if (!applicationId || !note.trim()) return
    await api.post(`/admin/applications/${applicationId}/notes`, { content: note, noteType: "NOTE" })
    setNote("")
    const { data } = await api.get<AdminApplicationDetail>(`/admin/applications/${applicationId}`)
    setDetail(data)
  }

  const app = detail

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Application {app?.referenceId ?? ""}</SheetTitle>
        </SheetHeader>
        {loading && <p className="text-sm text-gray-500 mt-4">Loading…</p>}
        {error && <p className="text-sm text-red-600 mt-4">{error}</p>}
        {app && (
          <div className="space-y-4 mt-4">
            <div className="flex gap-2 flex-wrap">
              <Badge>{app.status}</Badge>
              <Badge variant="outline" className="capitalize">{app.loanType}</Badge>
              {app.aiRecommendation && <Badge variant="secondary">AI: {app.aiRecommendation}</Badge>}
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Loan</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>{formatKES(app.amount)} · {app.termMonths} months · {app.purpose}</p>
                <p>Customer: {app.customerName} ({app.customerEmail})</p>
                <p>AI score: {app.aiCreditScore ?? "—"} · APR {app.estimatedApr ?? "—"}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Collateral</CardTitle></CardHeader>
              <CardContent className="text-sm">
                <p>{app.collateralSummary || formatCollateralSummary(app.loanType, app.sectorDetails)}</p>
                {app.collaterals && app.collaterals.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {app.collaterals.map((c) => (
                      <li key={c.id} className="border rounded p-2">
                        <span className="font-medium capitalize">{c.collateralType}</span> — {c.description}
                        {c.identifier && <span className="text-gray-500"> · ID {c.identifier}</span>}
                        <span className="block text-xs text-gray-500">Lien: {c.lienStatus}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            {app.sectorDetails && Object.keys(app.sectorDetails).length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Sector details</CardTitle></CardHeader>
                <CardContent className="text-sm space-y-1">
                  {Object.entries(app.sectorDetails).filter(([k]) => !k.startsWith("loan_type")).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b py-1">
                      <span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-medium text-right max-w-[55%]">{v}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={assign}>Assign to me</Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus("approved")}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => updateStatus("more_info_required")}>Request info</Button>
              <Button size="sm" variant="destructive" onClick={() => updateStatus("rejected", "Rejected by reviewer")}>Reject</Button>
            </div>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Officer notes</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
                <Button size="sm" onClick={addNote} disabled={!note.trim()}>Save note</Button>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {(app.notes ?? []).map((n) => (
                    <div key={n.id} className="text-xs border rounded p-2">
                      <span className="font-medium">{n.officerEmail}</span>
                      <p>{n.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
