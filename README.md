# CRM-EMR Integration Dashboard

A comprehensive web application for synchronizing and managing appointments from IntakeQ (EMR) and leads from VTiger CRM.

## Features

### ✨ Setup Wizard
- **3-Step Configuration Process**
  - Step 1: CRM Configuration (VTiger credentials)
  - Step 2: EMR Setup (IntakeQ API credentials)
  - Step 3: Data Fetch & Sync
- Test connections before proceeding
- Automated data synchronization

### 📊 Dashboard
- **Real-time Metrics**
  - Total Clients
  - Total Appointments
  - Matched Appointments (linked to CRM leads)
  - Unmatched Appointments
- Client management with status indicators
- Recent activity feed
- One-click "Fetch All" to sync all clients

### 🔄 Data Synchronization
- Fetch appointments from IntakeQ API
- Fetch leads from VTiger CRM API
- Automatic email-based matching between appointments and leads
- Update VTiger leads with appointment statistics
- Retry logic with exponential backoff for API failures
- Handle rate limiting (429), authentication (403), and server errors (500/502)

### 📱 Nested Views
All accessible from single URL: `http://localhost:5173/clients`

1. **Dashboard** (`/clients`)
   - View all clients
   - Aggregate statistics
   - Quick actions

2. **Client Details** (`/clients/:clientId`)
   - Client-specific metrics
   - List of all clients (patient emails) with appointments
   - Shows appointment counts per client

3. **Client Appointments** (`/clients/:clientId/appointments/:clientEmail`)
   - All appointments for a specific client (patient)
   - Filter by status: All, Confirmed, Cancelled/Missed
   - Interactive metric cards to filter

4. **Appointment Details** (`/clients/:clientId/appointments/:clientEmail/:appointmentId`)
   - Complete appointment information
   - **For Confirmed Appointments:**
     - Date, time, duration
     - Service details
     - Practitioner information
     - Location
     - Invoice details (ID & number)
     - Additional notes
   - **For Cancelled/Missed Appointments:**
     - All above details
     - Cancellation reason
     - Cancellation note
     - Cancellation date
   - Visual status badges

## Tech Stack

### Frontend
- **React 19** - UI framework
- **React Router DOM 7** - Nested routing
- **Tailwind CSS v4** - Styling with `@tailwindcss/vite`
- **Lucide React** - Icon library
- **Axios** - HTTP client with retry logic
- **React Hot Toast** - Toast notifications
- **Vite** - Build tool

### Backend
- **Node.js + Express** - REST API
- **Prisma ORM** - Database management
- **MySQL** - Database
- **Axios** - External API calls (IntakeQ, VTiger)

## Project Structure

```
hospital/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── SetupWizard.jsx       # 3-step configuration wizard
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx          # Main dashboard with metrics
│   │   │   ├── ClientDetails.jsx      # Client-specific view
│   │   │   ├── ClientAppointments.jsx # Appointments list with filters
│   │   │   └── AppointmentDetails.jsx # Single appointment details
│   │   ├── services/
│   │   │   └── api.js                 # API client with retry logic
│   │   ├── App.jsx                    # Main app with routing
│   │   ├── main.jsx                   # Entry point
│   │   └── index.css                  # Global styles
│   └── package.json
│
└── backend/
    ├── services/
    │   ├── appointments.routes.js     # Appointment sync endpoints
    │   ├── leads.routes.js            # Lead sync endpoints
    │   ├── clients.routes.js          # Client CRUD + credentials
    │   ├── compare.routes.js          # Match appointments to leads
    │   ├── appointmentFetcher.js      # IntakeQ API integration
    │   ├── appointmentSaver.js        # Bulk DB operations
    │   ├── leadFetcher.js             # VTiger API integration
    │   └── appointmentMapper.js       # Data transformation
    ├── utils/
    │   ├── prismaClient.js            # Prisma instance
    │   ├── vtigerSession.js           # VTiger session management
    │   ├── serializePrisma.js         # BigInt serialization
    │   └── fileStore.js               # File-based state
    ├── prisma/
    │   └── schema.prisma              # Database schema
    └── index.js                       # Server entry point
```

## API Endpoints

### Client Management
- `GET /api/clients` - Get all clients with stats
- `POST /api/clients` - Create new client
- `POST /api/clients/:id/vtiger` - Update VTiger credentials
- `POST /api/clients/:id/intakeq` - Update IntakeQ credentials
- `GET /api/clients/:id/appointments` - Get appointments (paginated)
- `GET /api/clients/:id/leads` - Get leads (paginated)

### Data Synchronization
- `POST /api/appointments/sync` - Sync appointments from IntakeQ
- `POST /api/leads/sync` - Sync leads from VTiger
- `POST /api/compare/sync` - Match appointments with leads & update CRM

### Debug Endpoints
- `GET /api/appointments/all/:clientName` - Get all appointments (file-based)
- `GET /api/leads/all/:clientName` - Get all leads (file-based)

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- MySQL 8+
- IntakeQ API key
- VTiger CRM credentials (URL, username, access key)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Start server
npm run dev
```

Backend runs on `http://localhost:3000`

### Frontend Setup

```bash
cd frontend

# Install dependencies  
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## Usage Guide

### 1. Add a New Client

1. Click **"Add Client"** button on dashboard
2. Follow the 3-step wizard:
   - **Step 1:** Enter VTiger CRM credentials and test connection
   - **Step 2:** Enter IntakeQ API credentials and test connection
   - **Step 3:** Click "Fetch All Data" to sync

### 2. Fetch/Refresh Data

- Click **"Fetch All"** button on dashboard to sync all clients
- Or sync individual clients from their detail pages
- System will:
  - Fetch appointments from IntakeQ
  - Fetch leads from VTiger
  - Match appointments to leads by email
  - Update VTiger with appointment counts

### 3. View Client Details

1. Click on any client in the dashboard
2. See metrics: Total Appointments, Leads, Matched, Unmatched
3. View list of all patient emails with appointment counts
4. Click on any patient email to see their appointments

### 4. Filter Appointments

1. Navigate to a patient's appointments page
2. Click metric cards to filter:
   - **Total Appointments** - Show all
   - **Total Confirmed** - Show only confirmed
   - **Total Cancelled** - Show only cancelled/missed

### 5. View Appointment Details

1. Click on any appointment in the list
2. See all appointment information:
   - Date, time, duration
   - Service and practitioner
   - Location
   - Invoice details (if confirmed)
   - Cancellation details (if cancelled)

## Error Handling

The application includes comprehensive error handling:

### Frontend
- **Retry Logic**: Automatic retry with exponential backoff for:
  - Network errors
  - Server errors (5xx)
  - Rate limiting (429)
  - Max 3 retries per request
- **Toast Notifications**: User-friendly error messages
- **Loading States**: Visual feedback during operations
- **Graceful Degradation**: Continue operation even if some requests fail

### Backend
- **VTiger Session Management**: 24-hour session caching
- **Rate Limiting**: Respect API rate limits with delays
- **Bulk Operations**: Use `createMany` with `skipDuplicates` for performance
- **Transaction Safety**: Atomic database operations
- **Error Logging**: Detailed console logging for debugging

## Data Matching Logic

Appointments are matched to leads using:
1. **Email Matching**: Case-insensitive email comparison
2. **Status Normalization**:
   - "Confirmed", "Confirm" → Confirmed
   - "Canceled", "Cancelled", "Missed" → Cancelled
3. **Deduplication**: Prevent double-counting across multiple leads
4. **HTML Generation**: Build detailed appointment HTML for CRM

### VTiger Fields Updated
- `cf_943`: "yes" (Appointment Booked indicator)
- `cf_945`: Count of appointments
- `cf_947`: HTML with appointment details (confirmed & cancelled separated)
- `cf_941`: Status EMR (preserved from existing value)

## Database Schema

### Client
- `id`: Primary key
- `name`: Client/Practice name
- `intakeQKey`: IntakeQ API key
- `intakeQBaseUrl`: IntakeQ API base URL
- `vtigerUrl`: VTiger webservice URL
- `vtigerUsername`: VTiger username
- `vtigerAccessKey`: VTiger access key
- `active`: Boolean status

### Appointment
- `id`: Primary key
- `clientId`: Foreign key to Client
- `intakeQId`: IntakeQ appointment ID (unique)
- `clientName`: Patient name
- `clientEmail`: Patient email (indexed)
- `status`: Appointment status
- `startDate`, `endDate`: Timestamps (BigInt)
- `serviceName`: Service type
- `practitionerName`: Provider name
- `invoiceId`, `invoiceNumber`: Billing info
- `fullCancellationReason`: Cancellation details
- `rawData`: JSON backup

### Lead
- `id`: Primary key
- `clientId`: Foreign key to Client
- `vtigerId`: VTiger lead ID (unique)
- `email`: Lead email (indexed)
- `firstname`, `lastname`: Name fields
- `cf_941`: Status EMR
- `cf_943`: Appointment Booked flag
- `cf_945`: Appointment count
- `cf_947`: Appointment details HTML (Text)
- `rawData`: JSON backup

## Performance Optimizations

- **Code Splitting**: Lazy-loaded routes (potential future enhancement)
- **Pagination**: Backend pagination for large datasets
- **Bulk Inserts**: Use Prisma `createMany` with `skipDuplicates`
- **Session Caching**: 24-hour VTiger session cache
- **Indexed Queries**: Email and ID fields indexed
- **Retry with Backoff**: Reduce redundant failed requests

## Development

### Frontend
```bash
npm run dev    # Start dev server
npm run build  # Production build
npm run lint   # Lint code
```

### Backend
```bash
npm run dev    # Start with nodemon
npx prisma studio  # Open Prisma Studio (DB GUI)
npx prisma migrate dev  # Create new migration
```

## Troubleshooting

### "BigInt cannot be serialized"
- Fixed with `serializePrisma.js` utility
- Converts BigInt fields to strings before JSON response

### "assigned_user_id does not have a value"
- VTiger requires certain fields for updates
- Include `assigned_user_id`, `firstname`, `lastname`, `company`, `cf_941` in update payload

### "Status counts don't match (151 ≠ 153)"
- Some appointments have status "Missed" which wasn't initially classified
- Updated `isCancelledStatus()` to include "missed" and no-show variants

### 429 Rate Limit Errors
- Backend implements delays between requests
- Frontend retry logic with exponential backoff
- Wait 2-3 seconds between client syncs

## Future Enhancements

- [ ] Real-time WebSocket updates
- [ ] Appointment calendar view
- [ ] Export data to CSV/Excel
- [ ] Advanced filtering and search
- [ ] User authentication and roles
- [ ] Multi-tenancy support
- [ ] Analytics and reporting dashboard
- [ ] Email/SMS notifications
- [ ] Appointment scheduling integration

## License

MIT

## Support

For issues or questions, please create an issue in the repository.

---

Built with ❤️ using React, Tailwind CSS, Node.js, and Prisma
