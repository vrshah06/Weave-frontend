import React, { useState, useEffect } from "react";
import { RefreshCw, AlertTriangle, CheckSquare, Square, Play, CheckCircle2 } from "lucide-react";
import { fetchAppointments, requeueAppointments, createRun } from "../api";

export default function FailedRetry() {
  const [appointments, setAppointments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [message, setMessage] = useState(null);

  const loadFailedAppointments = () => {
    setLoading(true);
    // Try to get today's date, or whatever the logic dictates. 
    // Usually a retry would pull from all dates, but the new API requires a date for /appointments.
    // For now we assume we want to query today's failed. (A real fix might need a /appointments/failed route in backend)
    const today = new Date().toISOString().split("T")[0];
    
    // Fetch all statuses for today, filter to failed/skipped/needs_review locally
    fetchAppointments(today)
      .then((data) => {
        const failedOrUnconfirmed = (data.appointments || []).filter(
          (a) => ["FAILED", "SKIPPED", "NEEDS_REVIEW"].includes(a.status)
        );
        setAppointments(failedOrUnconfirmed);
        setSelectedIds(failedOrUnconfirmed.map((a) => a.id));
      })
      .catch((err) => console.error("Error fetching failed appointments:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFailedAppointments();
  }, []);

  const handleToggleSingle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleToggleAll = (selectAll) => {
    if (selectAll) {
      setSelectedIds(appointments.map((a) => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleRetrySubmit = async () => {
    if (selectedIds.length === 0) return;
    setRetrying(true);
    setMessage(null);

    try {
      const res = await requeueAppointments(selectedIds);
      // Immediately start a new run for today
      const today = new Date().toISOString().split("T")[0];
      await createRun(today, "SEND");
      setMessage({ type: "success", text: `Successfully requeued ${res.updated} appointment(s) and queued a new run!` });
      loadFailedAppointments();
    } catch (err) {
      setMessage({ type: "error", text: `Retry Error: ${err.message}` });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Failed & Unconfirmed Queue</h2>
            <p className="text-xs text-slate-500">Batch retry creates Attempt #2, Attempt #3 without overwriting history</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRetrySubmit}
          disabled={selectedIds.length === 0 || retrying}
          className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
          <span>{retrying ? "Launching Retry..." : `Retry Selected (${selectedIds.length})`}</span>
        </button>
      </div>

      {/* MESSAGE NOTIFICATION */}
      {message && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-sm ${
          message.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="font-bold">Dismiss</button>
        </div>
      )}

      {/* CONTROLS */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleAll(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
          >
            <CheckSquare className="h-3.5 w-3.5 text-rose-600" />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleAll(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5"
          >
            <Square className="h-3.5 w-3.5 text-slate-400" />
            <span>Clear All</span>
          </button>
        </div>
        <span className="text-xs text-slate-500">
          Selected: <strong className="text-rose-600">{selectedIds.length}</strong> / {appointments.length}
        </span>
      </div>

      {/* TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Select</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Appointment Date</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading failed appointments...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-emerald-600 font-semibold">
                    ✓ No failed or unconfirmed messages for today! All reminders are clean.
                  </td>
                </tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(a.id)}
                        onChange={() => handleToggleSingle(a.id)}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{a.patientName}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{a.appointmentDate}</td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{a.appointmentTime}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{a.phone}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
