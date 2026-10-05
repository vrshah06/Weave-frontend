import React, { useState, useEffect } from "react";
import { History as HistoryIcon, Calendar, CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { listRuns } from "../api";

export default function History() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    listRuns()
      .then((data) => {
        setRuns(data.items || []);
        setTotalCount(data.total || 0);
      })
      .catch((err) => console.error("Error fetching runs:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <HistoryIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Automation Run History</h2>
            <p className="text-xs text-slate-500">Audit logs for all past execution runs</p>
          </div>
        </div>
        <span className="text-xs font-mono text-slate-500">{totalCount} Runs Recorded</span>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4">Run Date</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Selected</th>
                <th className="py-3 px-4">Sent/Verified</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4">Skipped</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading historical runs from MongoDB...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No past automation runs found.
                  </td>
                </tr>
              ) : (
                runs.map((r) => {
                  const counts = r.counts || {};
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        {new Date(r.queuedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 uppercase font-semibold text-blue-700">{r.mode}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{counts.total || 0}</td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        {r.mode === "SEND" ? counts.sent : counts.dryRunVerified}
                      </td>
                      <td className="py-3 px-4 font-bold text-rose-600">{counts.failed || 0}</td>
                      <td className="py-3 px-4 font-bold text-amber-600">{counts.skipped || 0}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            r.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : ["FAILED", "CANCELLED", "INTERRUPTED"].includes(r.status)
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {r.status}
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
}
