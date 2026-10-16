"use client";

import { useState } from "react";
import { Eye, AlertTriangle, ShieldCheck, Activity, Terminal } from "lucide-react";
import { LogDetailsModal, LogDetailItem } from "./log-details-modal";
import { Button } from "@/components/ui/button";

interface LogsTableViewProps {
  tab: "activity" | "audit" | "errors";
  logs: any[];
}

export function LogsTableView({ tab, logs }: LogsTableViewProps) {
  const [selectedLog, setSelectedLog] = useState<LogDetailItem | null>(null);

  if (!logs || logs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-bgSubtle text-muted">
          {tab === "errors" ? (
            <AlertTriangle size={24} className="text-emerald-600 dark:text-emerald-400" />
          ) : tab === "audit" ? (
            <ShieldCheck size={24} className="text-brand" />
          ) : (
            <Activity size={24} className="text-brand" />
          )}
        </div>
        <h4 className="text-base font-semibold text-fg">No records found</h4>
        <p className="text-xs text-muted max-w-sm mx-auto">
          {tab === "errors"
            ? "No system or worker errors recorded under the selected filter criteria."
            : tab === "audit"
            ? "No administrative audit events recorded under this filter."
            : "No user activity records match your current search and date range."}
        </p>
      </div>
    );
  }

  const openActivityModal = (log: any) => {
    setSelectedLog({
      id: log.id,
      type: "activity",
      title: log.message || log.type,
      timestamp: log.created_at,
      userEmail: log.user?.email || null,
      userName: log.user?.name || null,
      sourceOrAction: log.type,
      message: log.message,
      meta: log.meta,
    });
  };

  const openAuditModal = (log: any) => {
    setSelectedLog({
      id: log.id,
      type: "audit",
      title: `${log.action} on ${log.target_type}`,
      timestamp: log.created_at,
      userEmail: log.admin?.email || null,
      userName: log.admin?.name || "Admin",
      sourceOrAction: log.action,
      message: `Action executed on target [${log.target_type}:${log.target_id || "N/A"}]`,
      beforeState: log.before_state,
      afterState: log.after_state,
      context: {
        ip: log.ip_address,
        userAgent: log.user_agent,
        targetType: log.target_type,
        targetId: log.target_id,
      },
    });
  };

  const openErrorModal = (log: any) => {
    setSelectedLog({
      id: log.id,
      type: "error",
      title: log.message?.slice(0, 80) || "System Error",
      timestamp: log.created_at,
      userEmail: log.user?.email || null,
      userName: log.user?.name || null,
      sourceOrAction: log.source,
      message: log.message,
      stack: log.stack,
      context: log.context,
      resolvedAt: log.resolved_at,
    });
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-bgSubtle text-muted border-b border-border text-[11px] uppercase tracking-wider font-semibold">
              {tab === "activity" && (
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Message</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              )}

              {tab === "audit" && (
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">IP / Client</th>
                  <th className="py-3 px-4 text-right">Diff</th>
                </tr>
              )}

              {tab === "errors" && (
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Error Message</th>
                  <th className="py-3 px-4">User / Scope</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-border font-normal">
              {tab === "activity" &&
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => openActivityModal(log)}
                    className="hover:bg-surfaceHover transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.user ? (
                        <div className="space-y-0.5">
                          <span className="font-medium text-fg block">{log.user.name || "User"}</span>
                          <span className="text-[11px] text-muted font-mono">{log.user.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted font-mono text-[11px]">{log.user_id?.slice(0, 8)}...</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60">
                        {log.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="text-fg font-medium truncate">{log.message}</div>
                      {log.entity_type && (
                        <span className="text-[10px] text-muted">
                          Entity: {log.entity_type} {log.entity_id ? `(${log.entity_id})` : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="!p-1.5 h-7 w-7 inline-flex items-center justify-center hover:text-brand"
                        title="View event metadata"
                        aria-label="View event metadata"
                        onClick={(e) => {
                          e.stopPropagation();
                          openActivityModal(log);
                        }}
                      >
                        <Eye size={13} />
                      </Button>
                    </td>
                  </tr>
                ))}

              {tab === "audit" &&
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => openAuditModal(log)}
                    className="hover:bg-surfaceHover transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.admin ? (
                        <div className="space-y-0.5">
                          <span className="font-medium text-fg block">{log.admin.name || "Admin"}</span>
                          <span className="text-[11px] text-muted font-mono">{log.admin.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted font-mono text-[11px]">{log.admin_id?.slice(0, 8)}...</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-fg font-medium">{log.target_type}</div>
                      {log.target_id && (
                        <span className="font-mono text-[10px] text-muted block truncate max-w-[120px]">
                          {log.target_id}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted font-mono text-[11px]">
                      {log.ip_address || "Internal"}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs !py-1 !px-2.5 inline-flex items-center gap-1"
                        title="View state diff"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAuditModal(log);
                        }}
                      >
                        <Eye size={12} /> View Diff
                      </Button>
                    </td>
                  </tr>
                ))}

              {tab === "errors" &&
                logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => openErrorModal(log)}
                    className="hover:bg-surfaceHover transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-muted font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/60">
                        <Terminal size={11} /> {log.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="text-rose-600 dark:text-rose-400 font-medium truncate">{log.message}</div>
                      {log.stack && (
                        <span className="text-[10px] text-muted font-mono block truncate">
                          {log.stack.split("\n")[0]}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {log.user ? (
                        <span className="font-mono text-[11px] text-fg truncate block max-w-[140px]">
                          {log.user.email}
                        </span>
                      ) : (
                        <span className="text-muted text-[11px]">System scope</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.resolved_at ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60">
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                          Unresolved
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="text-xs !py-1 !px-2.5 inline-flex items-center gap-1"
                        title="View stacktrace and context"
                        onClick={(e) => {
                          e.stopPropagation();
                          openErrorModal(log);
                        }}
                      >
                        <Eye size={12} /> Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <LogDetailsModal item={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
