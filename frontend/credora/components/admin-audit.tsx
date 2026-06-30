"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import AdminLayout from "@/components/admin-layout"
import { TableSkeleton } from "@/components/page-skeletons"
import { api, AuditLogEntry } from "@/lib/api"

export default function AdminAudit() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<AuditLogEntry[]>("/admin/audit-logs")
      .then((r) => setLogs(r.data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout title="Audit Log">
      <Card>
        <CardHeader>
          <CardTitle>Institution audit trail</CardTitle>
          <CardDescription>Recent actions by officers and system events (last 100)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={8} cols={5} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No audit events yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{log.actorEmail || "System"}</div>
                          <Badge variant="outline" className="text-xs mt-1">{log.actorType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono">{log.action}</TableCell>
                        <TableCell className="text-sm">
                          {log.resourceType}
                          {log.resourceId != null && ` #${log.resourceId}`}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 max-w-xs truncate">{log.details || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
