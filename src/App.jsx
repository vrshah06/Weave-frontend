import React, { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";

// Pages
import Dashboard from "./pages/Dashboard";
import Appointments from "./pages/Appointments";
import Patients from "./pages/Patients";
import Automation from "./pages/Automation";
import History from "./pages/History";
import Confirmations from "./pages/Confirmations";
import FailedRetry from "./pages/FailedRetry";
import Settings from "./pages/Settings";

import { getLatestRun, createRun, stopRun as apiStopRun, createRunEventSource } from "./api";

// Map RunStatus → simple UI status words the existing components already understand
function deriveUiStatus(run) {
  if (!run) return "idle";
  switch (run.status) {
    case "QUEUED":   return "starting";
    case "RUNNING":  return "running";
    case "STOPPED":  return "stopping";
    case "COMPLETED": return "completed";
    case "FAILED":   return "failed";
    case "CANCELLED": return "cancelled";
    case "INTERRUPTED": return "failed";
    default:         return "idle";
  }
}

function buildState(run) {
  if (!run) {
    return {
      status: "idle", mode: "DRY_RUN", total: 0, processed: 0,
      sent: 0, failed: 0, skipped: 0, remaining: 0,
      currentPatient: null, startedAt: null, completedAt: null,
      error: null, runId: null, appointmentDate: null, logs: [],
    };
  }
  const c = run.counts || {};
  return {
    status: deriveUiStatus(run),
    mode: run.mode || "DRY_RUN",
    total: c.total || 0,
    processed: c.processed || 0,
    sent: (c.sent || 0) + (c.dryRunVerified || 0),
    failed: c.failed || 0,
    skipped: c.skipped || 0,
    remaining: c.remaining || 0,
    currentPatient: null,
    startedAt: run.startedAt || run.queuedAt,
    completedAt: run.finishedAt,
    error: run.error,
    runId: run.id,
    appointmentDate: run.appointmentDate,
  };
}

export default function App() {
  const [state, setState] = useState(buildState(null));
  const esRef = useRef(null);

  // Subscribe to SSE for a specific run
  const subscribeToRun = useCallback((runId) => {
    // Clean up any previous connection
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    if (!runId) return;

    const es = createRunEventSource(runId);
    esRef.current = es;

    es.addEventListener("run", (e) => {
      try {
        const run = JSON.parse(e.data);
        setState((prev) => ({ ...prev, ...buildState(run) }));
      } catch (err) { console.error("SSE run parse error:", err); }
    });

    es.addEventListener("log", (e) => {
      try {
        const log = JSON.parse(e.data);
        setState((prev) => ({
          ...prev,
          logs: [...prev.logs, {
            id: log.id,
            time: new Date(log.createdAt).toLocaleTimeString(),
            patient: log.appointmentId ? log.message.split("]")[0]?.replace("[", "").trim() : "System",
            action: log.event,
            status: log.level.toLowerCase(),
            message: log.message,
          }],
        }));
      } catch (err) { console.error("SSE log parse error:", err); }
    });

    es.addEventListener("end", () => { es.close(); esRef.current = null; });
    es.onerror = () => { es.close(); esRef.current = null; };
  }, []);

  // Fetch initial status on mount
  useEffect(() => {
    getLatestRun()
      .then((run) => {
        const s = buildState(run);
        setState((prev) => ({ ...prev, ...s, logs: prev.logs }));
        // If the run is still active, subscribe to its SSE stream
        if (["QUEUED", "RUNNING"].includes(run.status)) {
          subscribeToRun(run.id);
        }
      })
      .catch(() => { /* no runs yet, stay idle */ });

    return () => { if (esRef.current) esRef.current.close(); };
  }, [subscribeToRun]);

  const handleStart = async (date = null) => {
    try {
      const appointmentDate = date || state.appointmentDate || new Date().toISOString().split("T")[0];
      const run = await createRun(appointmentDate, state.mode);
      setState((prev) => ({ ...prev, ...buildState(run), logs: [] }));
      subscribeToRun(run.id);
    } catch (err) {
      console.error("Error starting automation:", err);
      setState((prev) => ({ ...prev, error: err.message }));
    }
  };

  const handleStop = async () => {
    try {
      if (!state.runId) return;
      const run = await apiStopRun(state.runId);
      setState((prev) => ({ ...prev, ...buildState(run) }));
    } catch (err) {
      console.error("Error stopping automation:", err);
    }
  };

  const handleModeChange = (mode) => {
    setState((prev) => ({ ...prev, mode }));
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased">
        <Navbar status={state.status} mode={state.mode} />

        <div className="flex flex-1">
          <Sidebar />

          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <Routes>
              <Route
                path="/"
                element={
                  <Dashboard
                    state={state}
                    onStart={() => handleStart()}
                    onStop={handleStop}
                    onModeChange={handleModeChange}
                  />
                }
              />
              <Route
                path="/appointments"
                element={<Appointments onStartWithDate={(date) => handleStart(date)} />}
              />
              <Route path="/patients" element={<Patients />} />
              <Route path="/automation" element={<Automation state={state} />} />
              <Route path="/history" element={<History />} />
              <Route path="/confirmations" element={<Confirmations />} />
              <Route path="/failed" element={<FailedRetry />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}
