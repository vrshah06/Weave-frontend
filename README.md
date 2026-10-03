# Weave Frontend Dashboard

Modern React (Vite + TailwindCSS) Web Application for managing Weave Appointment Reminder Automation.

## Features
- **Live Dashboard**: Real-time status monitoring, progress meters, live streaming activity logs.
- **Appointments Management**: Interactive CSV import, chronological sorting, selection toggles.
- **Patient Directory**: Searchable patient records with phone & reminder status tracking.
- **Automation Control**: Toggle between Dry Run & Production Send mode, launch/stop automation runs.
- **Audit & Analytics**: Execution history logs and retry tracking for failed reminder attempts.

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: TailwindCSS + Lucide Icons
- **Routing**: React Router v6
- **Real-time**: EventSource (SSE) / REST API Proxy

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The application will start on `http://localhost:3000` and proxy `/api` requests to the backend server at `http://localhost:5000`.

### 3. Build for Production
```bash
npm run build
```
