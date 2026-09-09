import React, { useMemo, useState } from "react";
import { useInventory } from "../context/InventoryContext";
import { formatDate } from "../utils/formatters";
import {
  FileText,
  Search,
  RotateCw,
  CheckCircle2,
} from "lucide-react";

export const AuditLogsView: React.FC = () => {
  const {
    auditLogs,
    refreshAuditLogs,
    loading,
  } = useInventory();

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("ALL");
  const [actionFilter, setActionFilter] = useState("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  /*
  |--------------------------------------------------------------------------
  | Normalize PostgreSQL / Prisma audit log fields
  |--------------------------------------------------------------------------
  |
  | The backend uses:
  |
  | logId
  | userId
  | action
  | module
  | recordId
  | description
  | ipAddress
  | timestamp
  |
  | Older frontend data may use:
  |
  | LogID
  | UserID
  | Action
  | Module
  | RecordID
  | Description
  | IPAddress
  | Timestamp
  |
  */

  const normalizeLog = (log: any) => {
    return {
      logId:
        log?.logId ??
        log?.LogID ??
        "",

      userId:
        log?.userId ??
        log?.UserID ??
        log?.CreatedBy ??
        log?.createdBy ??
        "",

      action:
        log?.action ??
        log?.Action ??
        "",

      module:
        log?.module ??
        log?.Module ??
        "",

      recordId:
        log?.recordId ??
        log?.RecordID ??
        "",

      description:
        log?.description ??
        log?.Description ??
        "",

      ipAddress:
        log?.ipAddress ??
        log?.IPAddress ??
        "",

      timestamp:
        log?.timestamp ??
        log?.Timestamp ??
        log?.createdAt ??
        log?.CreatedAt ??
        null,

      user:
        log?.user ??
        null,

      status:
        log?.status ??
        log?.Status ??
        "Success",
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Normalized audit logs
  |--------------------------------------------------------------------------
  */

  const normalizedLogs = useMemo(() => {
    return (auditLogs ?? []).map(normalizeLog);
  }, [auditLogs]);

  /*
  |--------------------------------------------------------------------------
  | Modules
  |--------------------------------------------------------------------------
  */

  const modules = useMemo(() => {
    const values = new Set<string>();

    normalizedLogs.forEach((log) => {
      if (log.module) {
        values.add(String(log.module));
      }
    });

    return Array.from(values).sort();
  }, [normalizedLogs]);

  /*
  |--------------------------------------------------------------------------
  | Actions
  |--------------------------------------------------------------------------
  */

  const actions = useMemo(() => {
    const values = new Set<string>();

    normalizedLogs.forEach((log) => {
      if (log.action) {
        values.add(String(log.action));
      }
    });

    return Array.from(values).sort();
  }, [normalizedLogs]);

  /*
  |--------------------------------------------------------------------------
  | Filter logs
  |--------------------------------------------------------------------------
  */

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();

    return normalizedLogs.filter((log) => {
      const description = String(
        log.description ?? ""
      ).toLowerCase();

      const recordId = String(
        log.recordId ?? ""
      ).toLowerCase();

      const logId = String(
        log.logId ?? ""
      ).toLowerCase();

      const userId = String(
        log.userId ?? ""
      ).toLowerCase();

      const action = String(
        log.action ?? ""
      ).toLowerCase();

      const module = String(
        log.module ?? ""
      ).toLowerCase();

      const userName = String(
        log.user?.fullName ?? ""
      ).toLowerCase();

      const userEmail = String(
        log.user?.email ?? ""
      ).toLowerCase();

      const matchSearch =
        !q ||
        description.includes(q) ||
        recordId.includes(q) ||
        logId.includes(q) ||
        userId.includes(q) ||
        action.includes(q) ||
        module.includes(q) ||
        userName.includes(q) ||
        userEmail.includes(q);

      const matchModule =
        moduleFilter === "ALL" ||
        log.module === moduleFilter;

      const matchAction =
        actionFilter === "ALL" ||
        log.action === actionFilter;

      return (
        matchSearch &&
        matchModule &&
        matchAction
      );
    });
  }, [
    normalizedLogs,
    search,
    moduleFilter,
    actionFilter,
  ]);

  // Reset to the first page whenever the active filters change.
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, moduleFilter, actionFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredLogs.length / logsPerPage)
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedLogs = useMemo(() => {
    const start = (safeCurrentPage - 1) * logsPerPage;
    return filteredLogs.slice(start, start + logsPerPage);
  }, [filteredLogs, safeCurrentPage]);

  const pageStart =
    filteredLogs.length === 0
      ? 0
      : (safeCurrentPage - 1) * logsPerPage + 1;

  const pageEnd = Math.min(
    safeCurrentPage * logsPerPage,
    filteredLogs.length
  );

  const visiblePages = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
      return pages;
    }

    pages.push(1);

    if (safeCurrentPage > 4) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, safeCurrentPage - 1);
    const end = Math.min(totalPages - 1, safeCurrentPage + 1);

    for (let i = start; i <= end; i += 1) {
      pages.push(i);
    }

    if (safeCurrentPage < totalPages - 3) {
      pages.push("ellipsis");
    }

    pages.push(totalPages);

    return pages;
  }, [safeCurrentPage, totalPages]);

  /*
  |--------------------------------------------------------------------------
  | User display
  |--------------------------------------------------------------------------
  */

  const getUserDisplay = (log: any) => {
    if (log?.user?.fullName) {
      return log.user.fullName;
    }

    if (log?.user?.email) {
      return log.user.email;
    }

    if (log?.userId) {
      return log.userId;
    }

    return "System";
  };

  /*
  |--------------------------------------------------------------------------
  | Status display
  |--------------------------------------------------------------------------
  */

  const getStatus = (log: any) => {
    const status = String(
      log?.status ?? "Success"
    ).trim();

    return status || "Success";
  };

  return (
    <div className="min-h-full bg-[#f7f7f5] px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">

        {/* Header */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-black/40">
              <FileText className="h-3.5 w-3.5" />
              Security / Activity
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#171717]">
              Audit Logs
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-black/50">
              Monitor system activity, user actions, record changes and security events.
            </p>
          </div>

          <button
            onClick={() => refreshAuditLogs()}
            disabled={loading.auditLogs}
            className="group inline-flex h-11 items-center justify-center gap-2 self-start rounded-xl border border-black/10 bg-white px-5 text-xs font-bold text-black/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 lg:self-auto"
          >
            <RotateCw
              className={`h-4 w-4 transition-transform ${loading.auditLogs ? "animate-spin" : "group-hover:rotate-90"
                }`}
            />
            {loading.auditLogs ? "Loading..." : "Refresh Logs"}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="group rounded-2xl border border-black/5 bg-[#171717] p-5 text-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <FileText className="h-5 w-5 text-white/80" />
              </div>
              <span className="rounded-lg bg-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/50">
                Total
              </span>
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-white/45">
              Total Activity
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">
              {normalizedLogs.length}
            </p>
            <p className="mt-1 text-xs text-white/40">Recorded system events</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
              Successful Events
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {normalizedLogs.filter(
                (log) => getStatus(log).toLowerCase() === "success"
              ).length}
            </p>
            <p className="mt-1 text-xs text-black/40">Completed successfully</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileText className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
              Active Modules
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {modules.length}
            </p>
            <p className="mt-1 text-xs text-black/40">Modules generating activity</p>
          </div>

          <div className="group rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Search className="h-5 w-5" />
            </div>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
              Current Results
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-[#171717]">
              {filteredLogs.length}
            </p>
            <p className="mt-1 text-xs text-black/40">Matching active filters</p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, action, description, record ID..."
                className="h-11 w-full rounded-xl border border-black/10 bg-[#f8f8f6] pl-11 pr-4 text-sm text-[#171717] outline-none transition-all placeholder:text-black/35 focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
              />
            </div>

            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm text-[#171717] outline-none transition-all focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
            >
              <option value="ALL">All Modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-11 rounded-xl border border-black/10 bg-[#f8f8f6] px-3 text-sm text-[#171717] outline-none transition-all focus:border-black/25 focus:bg-white focus:ring-4 focus:ring-black/5"
            >
              <option value="ALL">All Actions</option>
              {actions.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-black/40">
            <span>
              Showing <strong className="text-black/75">{filteredLogs.length}</strong>{" "}
              of <strong className="text-black/75">{normalizedLogs.length}</strong> audit logs
            </span>

            {(search || moduleFilter !== "ALL" || actionFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setModuleFilter("ALL");
                  setActionFilter("ALL");
                }}
                className="rounded-lg border border-black/10 px-3 py-1.5 font-semibold text-black/55 transition hover:bg-[#f7f7f5] hover:text-black"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Audit Ledger */}
        <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-black/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#171717]">System Activity</h3>
              <p className="mt-0.5 text-xs text-black/40">
                Record of actions performed in the inventory system
              </p>
            </div>
            <div className="rounded-lg bg-[#f7f7f5] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black/50">
              {filteredLogs.length} events
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left">
              <thead className="border-b border-black/5 bg-[#fafaf8]">
                <tr className="text-[10px] font-bold uppercase tracking-[0.16em] text-black/40">
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Action</th>
                  <th className="px-5 py-3.5">Module</th>
                  <th className="px-5 py-3.5">Record ID</th>
                  <th className="px-5 py-3.5">Description</th>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-20 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7f7f5]">
                        <FileText className="h-6 w-6 text-black/20" />
                      </div>
                      <p className="mt-4 text-sm font-bold text-black/60">
                        No audit logs found
                      </p>
                      <p className="mt-1 text-xs text-black/35">
                        {normalizedLogs.length > 0
                          ? "No logs match the current filters."
                          : "No system activity has been recorded yet."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => {
                    const status = getStatus(log);
                    const isSuccess = status.toLowerCase() === "success";

                    return (
                      <tr
                        key={log.logId || `${log.timestamp}-${log.userId}-${log.action}`}
                        className="group transition-colors hover:bg-[#fafaf8]"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="text-xs font-medium text-black/65">
                            {log.timestamp ? formatDate(log.timestamp) : "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-lg border border-black/5 bg-[#f3f3f0] px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-black/65">
                            {log.action || "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="text-xs font-bold text-[#171717]">
                            {log.module || "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-mono text-[10px] text-black/40">
                            {log.recordId || "—"}
                          </span>
                        </td>

                        <td className="max-w-[330px] px-5 py-4">
                          <p
                            className="truncate text-xs font-medium text-black/70"
                            title={log.description || ""}
                          >
                            {log.description || "—"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <div className="max-w-[190px]">
                            <p
                              className="truncate text-xs font-semibold text-black/70"
                              title={getUserDisplay(log)}
                            >
                              {getUserDisplay(log)}
                            </p>
                            {log.userId && (
                              <p className="mt-0.5 truncate font-mono text-[9px] text-black/35">
                                {log.userId}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide ${isSuccess
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-rose-100 bg-rose-50 text-rose-700"
                              }`}
                          >
                            {isSuccess && <CheckCircle2 className="h-3.5 w-3.5" />}
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredLogs.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-black/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-black/45">
                Showing{" "}
                <strong className="text-black/70">{pageStart}</strong>
                {" – "}
                <strong className="text-black/70">{pageEnd}</strong>
                {" of "}
                <strong className="text-black/70">{filteredLogs.length}</strong>
                {" audit logs"}
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold text-black/60 transition hover:bg-[#f7f7f5] hover:text-black disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Previous
                </button>

                <div className="flex items-center gap-1">
                  {visiblePages.map((page, index) =>
                    page === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="flex h-9 w-8 items-center justify-center text-xs text-black/35"
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`h-9 min-w-9 rounded-lg px-2 text-xs font-bold transition ${safeCurrentPage === page
                          ? "bg-[#171717] text-white shadow-sm"
                          : "border border-black/10 bg-white text-black/55 hover:bg-[#f7f7f5] hover:text-black"
                          }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold text-black/60 transition hover:bg-[#f7f7f5] hover:text-black disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
