# CRM-EMR Integration Dashboard - Frontend

React-based frontend for managing IntakeQ appointments and VTiger CRM leads.

## Quick Start

```bash
npm install
npm run dev
```

App runs on `http://localhost:5173`

## Features

- ✨ 3-Step Setup Wizard
- 📊 Real-time Metrics Dashboard
- 🎯 Nested Routing
- 🎨 Tailwind CSS v4
- 🔄 API Retry Logic
- 📱 Responsive Design

## Routing

```
/clients                                          → Dashboard
/clients/:clientId                                → Client Details
/clients/:clientId/appointments/:clientEmail      → Appointments
/clients/:clientId/appointments/:clientEmail/:id  → Details
```

## Tech Stack

- React 19 + Vite 7
- React Router DOM 7
- Tailwind CSS 4
- Axios + React Hot Toast
- Lucide Icons
