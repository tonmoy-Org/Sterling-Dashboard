# Sterling Dashboard - Frontend

The Sterling Dashboard Frontend is a modern, responsive web application built to streamline operations, dispatching, and management workflows for the enterprise. It features robust role-based access control, realtime KPI tracking, comprehensive work order management, and integrations with backend scrapers.

## 🚀 Features

- **Role-Based Access Control (RBAC):** Tailored dashboards and features for Super Admins, Managers, and Technicians.
- **Dispatch KPI Monitoring:** Real-time visibility into dispatcher performance (automated via scraper logs).
- **RME Reports & Inspections:** Complete tracker for specialized compliance reports, complete with lock/wait-to-lock states.
- **Tank Repairs & Locates Tracking:** Track ongoing repair jobs through highly-detailed multi-stage workflows (Creation -> Permitting -> Approved -> Testing -> Completion).
- **Notification System:** Realtime status and system update notification tracker.
- **Recycle Bin Ecosystem:** Soft-deletion implementations across all models with bulk restore and permanent delete capabilities.
- **Modern UI/UX:** Clean, intuitive interface built with Material UI (MUI) components and animated visual cues.

## 🛠️ Tech Stack

This project is built using:

- **Library:** [React](https://reactjs.org/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **UI Framework:** [Material UI (MUI)](https://mui.com/)
- **Data Fetching:** [TanStack React Query](https://tanstack.com/query/latest)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **HTTP Client:** [Axios](https://axios-http.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Date Formatting:** date-fns / Moment.js

## 📁 Directory Structure

```text
src/
├── api/
│   ├── axios.js            # Base Axios instance with auth interceptors
│   └── services/           # Dedicated API service modules (repairs, dispatch, RME, etc.)
├── auth/                   # Authentication Provider and role management
├── components/             # Reusable UI components (Modals, Loaders, Layouts)
├── context/                # Global contexts (e.g., GlobalSnackbarContext)
├── hooks/                  # Custom React hooks
├── pages/                  # Route components separated by Role/Feature
│   ├── superadmin/         # Superadmin dashboard and features
│   ├── manager/            # Manager-specific tools and views
│   └── tech/               # Technician-focused views
├── App.jsx                 # Root component and Routing configuration
├── main.jsx                # Application entry point
└── index.css               # Global styling
```

## 🔌 API Architecture

The application uses a centralized API service pattern to manage all remote data interactions efficiently:

1. **`api/axios.js`** handles base URL configuration, headers, request authorization tokens, and global error interceptors.
2. **`api/services/`** isolates endpoint logic into distinct entities (e.g., `workOrdersApi`, `repairsApi`, `dispatchKpiApi`, `rmeApi`).
3. Services are consumed exclusively inside React components via **TanStack React Query**, granting automatic caching, background refetching, mutation logic, and optimistic UI updates.

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository and navigate into the `Fontend` directory:
   ```bash
   cd Sterling-Dashboard/Fontend
   ```

2. Install the application dependencies:
   ```bash
   npm install
   ```

3. Set up the local environment variables. Create a `.env` file in the root of `Fontend` containing your backend server URL (example):
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

### Running Locally

To start the Vite development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Building for Production

To create an optimized production bundle:
```bash
npm run build
```
This will compile all assets and place them inside the `dist/` directory.

## 📦 Scripts

- `npm run dev`: Starts the local development server.
- `npm run build`: Bundles the application using Rollup/Vite.
- `npm run lint`: Performs ESLint checks.
- `npm run preview`: Previews the production build locally.
