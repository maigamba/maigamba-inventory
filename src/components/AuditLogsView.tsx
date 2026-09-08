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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">

      {/* ================================================================
                HEADER
            ================================================================ */}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] tracking-tight">
            System Audit Trail
          </h2>

          <p className="text-xs text-black/60 font-light mt-1">
            Security audit logs tracking product creations,
            price changes, sales, returns, and logins.
          </p>
        </div>

        <button
          onClick={() => refreshAuditLogs()}
          disabled={loading.auditLogs}
          className="p-2.5 rounded-sm border border-black/15 bg-white hover:bg-[#f4f0ea] text-[#1a1a1a] shadow-xs flex items-center gap-2 text-[10px] uppercase tracking-wider font-semibold self-start sm:self-auto transition-colors"
        >
          <RotateCw
            className={`w-4 h-4 ${loading.auditLogs
              ? "animate-spin text-black"
              : ""
              }`}
          />

          <span>
            {loading.auditLogs
              ? "Loading..."
              : "Refresh Logs"}
          </span>
        </button>
      </div>

      {/* ================================================================
                FILTERS
            ================================================================ */}

      <div className="bg-white p-4 rounded-sm border border-black/10 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">

        {/* Search */}

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search user, action, description, record..."
            className="w-full pl-9 pr-3 py-2 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
          />
        </div>

        {/* Module */}

        <div>
          <select
            value={moduleFilter}
            onChange={(e) =>
              setModuleFilter(e.target.value)
            }
            className="w-full py-2 px-3 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
          >
            <option value="ALL">
              All Modules
            </option>

            {modules.map((module) => (
              <option
                key={module}
                value={module}
              >
                {module}
              </option>
            ))}
          </select>
        </div>

        {/* Action */}

        <div>
          <select
            value={actionFilter}
            onChange={(e) =>
              setActionFilter(e.target.value)
            }
            className="w-full py-2 px-3 bg-[#fcfaf7] border border-black/15 rounded-sm focus:bg-white focus:ring-1 focus:ring-black text-[#1a1a1a]"
          >
            <option value="ALL">
              All Actions
            </option>

            {actions.map((action) => (
              <option
                key={action}
                value={action}
              >
                {action}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ================================================================
                SUMMARY
            ================================================================ */}

      <div className="flex items-center justify-between text-xs text-black/50">
        <span>
          Showing{" "}
          <strong className="text-black/80">
            {filteredLogs.length}
          </strong>{" "}
          of{" "}
          <strong className="text-black/80">
            {normalizedLogs.length}
          </strong>{" "}
          audit log
          {normalizedLogs.length === 1
            ? ""
            : "s"}
        </span>
      </div>

      {/* ================================================================
                TABLE
            ================================================================ */}

      <div className="bg-white rounded-sm border border-black/10 shadow-xs overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-xs">

            {/* ----------------------------------------------------
                            TABLE HEADER
                        ---------------------------------------------------- */}

            <thead className="bg-[#fcfaf7] border-b border-black/10 text-black/60 font-semibold uppercase tracking-[0.15em] text-[10px]">

              <tr>

                <th className="py-3 px-4">
                  Timestamp
                </th>

                <th className="py-3 px-4">
                  Action
                </th>

                <th className="py-3 px-4">
                  Module
                </th>

                <th className="py-3 px-4">
                  Record ID
                </th>

                <th className="py-3 px-4">
                  Description
                </th>

                <th className="py-3 px-4">
                  User
                </th>

                <th className="py-3 px-4">
                  Status
                </th>

              </tr>

            </thead>

            {/* ----------------------------------------------------
                            TABLE BODY
                        ---------------------------------------------------- */}

            <tbody className="divide-y divide-black/5 text-black/80">

              {filteredLogs.length === 0 ? (

                <tr>

                  <td
                    colSpan={7}
                    className="py-12 text-center text-black/40 font-light"
                  >

                    <FileText className="w-8 h-8 text-black/20 mx-auto mb-2" />

                    <p className="font-semibold text-black/60">
                      No audit logs recorded
                    </p>

                    {normalizedLogs.length > 0 && (
                      <p className="text-[11px] mt-1">
                        No logs match the current filters.
                      </p>
                    )}

                  </td>

                </tr>

              ) : (

                filteredLogs.map((log) => {

                  const status =
                    getStatus(log);

                  const isSuccess =
                    status.toLowerCase() ===
                    "success";

                  return (
                    <tr
                      key={
                        log.logId ||
                        `${log.timestamp}-${log.userId}-${log.action}`
                      }
                      className="hover:bg-[#fcfaf7]/70 transition-colors"
                    >

                      {/* Timestamp */}

                      <td className="py-3 px-4 text-black/60 font-light whitespace-nowrap">
                        {log.timestamp
                          ? formatDate(
                            log.timestamp
                          )
                          : "—"}
                      </td>

                      {/* Action */}

                      <td className="py-3 px-4">

                        <span className="px-2 py-0.5 rounded-sm font-mono text-[9px] font-bold bg-[#f4f0ea] text-black/80 border border-black/10 uppercase">
                          {log.action ||
                            "—"}
                        </span>

                      </td>

                      {/* Module */}

                      <td className="py-3 px-4 font-serif font-semibold text-[#1a1a1a]">
                        {log.module ||
                          "—"}
                      </td>

                      {/* Record ID */}

                      <td className="py-3 px-4 font-mono text-black/50 text-[11px] whitespace-nowrap">
                        {log.recordId ||
                          "—"}
                      </td>

                      {/* Description */}

                      <td className="py-3 px-4 text-black/80 max-w-sm">
                        <div
                          className="truncate"
                          title={
                            log.description ||
                            ""
                          }
                        >
                          {log.description ||
                            "—"}
                        </div>
                      </td>

                      {/* User */}

                      <td className="py-3 px-4 text-black/60 font-light">

                        <div className="font-medium text-black/80">
                          {getUserDisplay(
                            log
                          )}
                        </div>

                        {log.userId && (
                          <div className="font-mono text-[9px] text-black/40 mt-0.5">
                            {
                              log.userId
                            }
                          </div>
                        )}

                      </td>

                      {/* Status */}

                      <td className="py-3 px-4">

                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm border ${isSuccess
                            ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                            : "text-red-800 bg-red-50 border-red-200"
                            }`}
                        >

                          {isSuccess && (
                            <CheckCircle2 className="w-3 h-3" />
                          )}

                          <span>
                            {
                              status
                            }
                          </span>

                        </span>

                      </td>

                    </tr>
                  );
                })
              )}

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};