// Centralized API helper for the new FastAPI v1 backend.
// The Vite proxy rewrites /api → /api/v1 and injects the x-api-key header,
// so every call here uses the simple /api prefix.

const BASE = "/api";
// In production on Vercel, the secret is pulled from VITE_API_KEY environment variable.
const API_KEY = import.meta.env.VITE_API_KEY || "dev_secret_key_123";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      "x-api-key": API_KEY,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.detail || body.message || `API ${res.status}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ─── Imports ─────────────────────────────────────────────
export const importCsv = (file) => {
  const form = new FormData();
  form.append("file", file);
  return request("/imports", { method: "POST", body: form });
};

// ─── Appointments ────────────────────────────────────────
export const fetchDates = () => request("/appointments/dates");

export const fetchAppointments = (date, status) => {
  const params = new URLSearchParams({ date });
  if (status) params.append("status", status);
  return request(`/appointments?${params}`);
};

export const setExcluded = (appointmentIds, excluded) =>
  request("/appointments/exclusions", {
    method: "POST",
    body: JSON.stringify({ appointmentIds, excluded }),
  });

export const requeueAppointments = (appointmentIds) =>
  request("/appointments/requeue", {
    method: "POST",
    body: JSON.stringify({ appointmentIds }),
  });

export const markSent = (appointmentIds) =>
  request("/appointments/mark-sent", {
    method: "POST",
    body: JSON.stringify({ appointmentIds }),
  });

// ─── Runs ────────────────────────────────────────────────
export const createRun = (appointmentDate, mode) =>
  request("/runs", {
    method: "POST",
    body: JSON.stringify({ appointmentDate, mode: (mode || "DRY_RUN").toUpperCase() }),
  });

export const listRuns = (limit = 20, offset = 0) =>
  request(`/runs?limit=${limit}&offset=${offset}`);

export const getLatestRun = () => request("/runs/latest");

export const getRun = (runId) => request(`/runs/${runId}`);

export const stopRun = (runId) =>
  request(`/runs/${runId}/stop`, { method: "POST" });

export const getRunItems = (runId) => request(`/runs/${runId}/items`);

export const getRunLogs = (runId) => request(`/runs/${runId}/logs`);

export const createRunEventSource = (runId) =>
  new EventSource(`${BASE}/runs/${runId}/events?apiKey=${API_KEY}`);

// ─── Patients ────────────────────────────────────────────
export const fetchPatients = (search, limit = 50, offset = 0) => {
  const params = new URLSearchParams({ limit, offset });
  if (search) params.append("search", search);
  return request(`/patients?${params}`);
};

export const fetchPatientAppointments = (patientId) =>
  request(`/patients/${patientId}/appointments`);

// ─── Settings ────────────────────────────────────────────
export const fetchSettings = () => request("/settings");

export const updateSettings = (data) =>
  request("/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const fetchMessagePreview = () => request("/settings/message-preview");
