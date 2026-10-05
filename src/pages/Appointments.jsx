import React, { useState, useEffect } from "react";
import { Calendar as CalendarIcon, CheckSquare, Square, Play, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { fetchDates, fetchAppointments, setExcluded } from "../api";

export default function Appointments({ onStartWithDate }) {
  const [dates, setDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch available dates on mount
  useEffect(() => {
    fetchDates()
      .then((data) => {
        if (data.dates && data.dates.length > 0) {
          setDates(data.dates);
          setSelectedDate(data.dates[0]);
        }
      })
      .catch((err) => console.error("Error fetching dates:", err));
  }, []);

  // Fetch appointments for selected date
  useEffect(() => {
    if (!selectedDate) return;
    setLoading(true);
    fetchAppointments(selectedDate)
      .then((data) => {
        const sorted = (data.appointments || []).sort(
          (a, b) => parseTimeToMinutes(a.appointmentTime) - parseTimeToMinutes(b.appointmentTime)
        );
        setAppointments(sorted);
      })
      .catch((err) => console.error("Error fetching appointments:", err))
      .finally(() => setLoading(false));
  }, [selectedDate]);

  function parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== "string") return 0;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3] ? match[3].toUpperCase() : null;
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Toggle exclusion for single appointment (excluded = !selected)
  const handleToggleSingle = async (id, currentExcluded) => {
    const newExcluded = !currentExcluded;
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, excluded: newExcluded } : a))
    );
    try {
      await setExcluded([id], newExcluded);
    } catch (err) {
      console.error("Error toggling exclusion:", err);
    }
  };

  // Select All = set excluded=false for all, Clear All = set excluded=true for all
  const handleToggleAll = async (selectAll) => {
    const ids = appointments.map((a) => a.id);
    const excluded = !selectAll;
    setAppointments((prev) => prev.map((a) => ({ ...a, excluded })));
    try {
      await setExcluded(ids, excluded);
    } catch (err) {
      console.error("Error toggling all:", err);
    }
  };

  const selectedCount = appointments.filter((a) => !a.excluded).length;

  return (
    <div className="space-y-6">
      {/* HEADER & DATE SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
            <CalendarIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Date-Based Appointment Manager</h2>
            <p className="text-xs text-slate-500">Database source of truth for appointment reminders</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600">Select Date:</label>
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs font-bold text-blue-700 focus:outline-none focus:border-blue-500 shadow-sm"
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleToggleAll(true)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors flex items-center gap-1.5"
          >
            <CheckSquare className="h-3.5 w-3.5 text-blue-600" />
            <span>Select All</span>
          </button>
          <button
            type="button"
            onClick={() => handleToggleAll(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5"
          >
            <Square className="h-3.5 w-3.5 text-slate-400" />
            <span>Clear All</span>
          </button>
          <span className="text-xs text-slate-500 ml-2">
            Selected: <strong className="text-blue-600">{selectedCount}</strong> / {appointments.length}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onStartWithDate(selectedDate)}
          disabled={selectedCount === 0}
          className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span>Start Reminders for Selected Date</span>
        </button>
      </div>

      {/* APPOINTMENTS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider font-semibold">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Select</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Reminder Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Loading appointments from MongoDB...
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No appointments found for date {selectedDate}. Upload a CSV to import records.
                  </td>
                </tr>
              ) : (
                appointments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={!a.excluded}
                        onChange={() => handleToggleSingle(a.id, a.excluded)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{a.patientName}</td>
                    <td className="py-3 px-4 font-mono text-blue-700 font-semibold">{a.appointmentTime}</td>
                    <td className="py-3 px-4 text-slate-600">{a.provider}</td>
                    <td className="py-3 px-4 font-mono text-slate-700">{a.phone}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          a.status === "SENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : a.status === "FAILED"
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : a.status === "SKIPPED"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : a.status === "NEEDS_REVIEW"
                            ? "bg-orange-50 text-orange-700 border border-orange-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
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
