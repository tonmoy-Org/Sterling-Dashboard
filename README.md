# Sterling Septic & Plumbing LLC Dashboard

A **private, full-stack internal management platform** built exclusively for **Sterling Septic & Plumbing LLC** — a field-service company. It unifies day-to-day operations, technician performance, automation data ingestion, and administrative oversight into a single, role-based web application. It eliminates manual data entry and spreadsheet juggling by automatically scraping data from external platforms (FieldEdge, Fleetmatics, Online RME, Yelp, etc.) and presenting it in clean, actionable dashboards.

---

## 🎯 Core Purpose

| Goal | How It's Achieved |
|---|---|
| Centralize operational data | One dashboard instead of multiple disconnected tools |
| Automate data collection | Playwright-based Python scrapers run on a schedule |
| Track technician performance | Invoice proficiency, time tracking, scorecards |
| Manage customer & work order lifecycle | Locates, Tank Repairs, Work Orders, RME Reports |
| Monitor business health | Reviews, Dispatch KPIs, health-check system |
| Role-based access control | SuperAdmin / Manager / Tech portals with JWT auth |

---

## 👥 User Roles & Portals

The application has **three distinct role-based portals**, each with its own layout, navigation, and feature set:

### 🔴 SuperAdmin Portal
The most powerful access level — full system control, all data, all scrapers, all users.

| Module | Description |
|---|---|
| **Dashboard Home** | System-wide KPI overview, scraper status, health indicators |
| **Invoice Proficiency** | Technician invoice metrics, efficiency scores, ranking |
| **Dispatch KPI** | Dispatcher booking stats, conversion metrics |
| **Review Tracking** | Google & Yelp review monitoring, sentiment aggregation |
| **Time Tracking** | Fleetmatics + Work Orders time data, technician hours |
| **Customer Center** | Full customer history, work order linkage |
| **CallRail Integration** | Live call data, webhook inspector, call log viewer |
| **Tank Repairs** | Repair task management and status tracking |
| **User Management** | Create/edit/delete all user accounts across all roles |
| **Tech User View** | Deep-dive into individual technician profiles and data |
| **Approvals** | Pending approval workflows |
| **Scorecards** | Team performance scorecards |
| **Scheduling** | Job scheduling management |
| **Leads** | Lead tracking |
| **Quotes** | Quote management |
| **Dispatch** | Live dispatch view |
| **Inventory** | Parts and materials inventory |
| **Vehicles & Tools** | Fleet and equipment management |
| **Logistics Map** | Geographic job/vehicle overview |
| **Installations** | Installation job tracking |
| **Forms** | Internal digital forms |
| **Training** | Team training resources |
| **Library** | Document/resource library |
| **Risk Management** | Operational risk tracking |
| **Performance** | Company-wide performance analytics |
| **Tasks** | Internal task management |

### 🟡 Manager Portal
Focused on team oversight and reporting, without full system control.

| Module | Description |
|---|---|
| **Manager Dashboard** | Team summary, KPIs, key metrics at a glance |
| **Tech User Management** | View and manage technician accounts |
| **RSS Reports** | RSS-based operational reports |
| **TOS Reports** | Terms of service / compliance reports |
| **Profile** | Manager's own profile |

### 🟢 Tech Portal
Limited view for field technicians — their own data only.

| Module | Description |
|---|---|
| **Tech Dashboard** | Personal performance summary |
| **My Scorecard** | Individual technician scorecard |
| **RME Reports** | Personal RME report history |
| **Resources Library** | Access to training and reference materials |
| **Team Daily Checklist** | Daily operational checklist |
| **Vehicles — List / Trucks / Photos / Inventory** | Fleet management for technicians |
| **Profile** | Personal profile management |

---

## 🤖 Automation Engine (The Scraper Suite)

All scrapers are **Python + Playwright** (headless browser automation), run **asynchronously**, and are **orchestrated by APScheduler** — which triggers the full suite automatically on a configurable interval (default: every 10 minutes).

### Scraper Registry

| Scraper | Source Platform | What It Collects |
|---|---|---|
| **FieldEdge Scraper** | FieldEdge (field service software) | Work orders, customer locates data |
| **Work Orders Scraper** | FieldEdge / Work Order System | Today's work orders |
| **Work Orders Tags Scraper** | FieldEdge | Tags associated with work orders |
| **Work Orders Time Tracking Scraper** | FieldEdge | Time logs per work order |
| **Online RME Scraper** | Online RME platform | Septic report check statuses, service history, report links |
| **Dispatcher Booked Scraper** | Internal / FieldEdge | Dispatcher booking completions |
| **Invoice Proficiency Scraper** | FieldEdge invoices | Technician invoice amounts, parts used, proficiency scores |
| **Fleetmatics Time Tracking Scraper** | Fleetmatics (GPS/fleet tracking) | Vehicle activity, technician hours, stop/drive data |
| **Review Tracker Scraper** | Google Reviews | Star ratings, review text, response status |
| **Yelp Review Scraper** | Yelp | Yelp-specific reviews (runs on a longer 1-day interval) |

### How Scrapers Are Protected

- **Lock File System** — A `scraper.lock` file prevents multiple simultaneous runs across multiple server workers. Stale locks older than 45 minutes are auto-cleaned.
- **Individual Trigger Support** — Each scraper can also be triggered individually via API endpoints (manual triggers from the dashboard UI).
- **Error Isolation** — Each scraper runs in its own `try/finally` block; a failure in one doesn't stop others.
- **Email Notifications** — Incident reporting via **Resend** email API when scrapers encounter critical errors.

---

## 🛠️ Technology Stack

### Frontend

| Library | Purpose |
|---|---|
| **React 18** | UI component framework |
| **Vite** | Ultra-fast dev server & build tool |
| **Material UI (MUI)** | Component library (DataGrid, Dialogs, Tabs, etc.) |
| **TanStack Query (React Query)** | Server-state management, caching, auto-refetch |
| **React Router** | Client-side routing |
| **Lucide React** | Icon system |
| **react-helmet-async** | SEO meta tags per page |

### Backend

| Library | Purpose |
|---|---|
| **Django 5.2** | Core web framework |
| **Django REST Framework (DRF)** | RESTful API construction |
| **Simple JWT** | JWT authentication (login tokens) |
| **django-cors-headers** | Cross-origin requests (React ↔ Django) |
| **APScheduler** | Background job scheduling for scrapers |
| **Playwright** | Headless browser automation for scrapers |
| **mysqlclient** | MySQL database driver |
| **BeautifulSoup4** | HTML parsing within scrapers |
| **Resend** | Transactional email (error notifications) |
| **SerpAPI** | Google search/review data access |
| **drf-yasg / drf-spectacular** | Auto-generated Swagger API docs |
| **python-dotenv** | Environment variable management |

### Database

- **MySQL** — All scraped data, user accounts, work orders, reviews, call logs, time records, and proficiency scores are persisted in MySQL tables managed by Django ORM migrations.

---

## ⚙️ Backend Django Apps

| App | Responsibility |
|---|---|
| `accounts` | User authentication, JWT, role management |
| `locates` | Customer locates / work site data from FieldEdge |
| `tank_repair` | Tank repair job tracking |
| `work_order` | Work order CRUD and status management |
| `dispatcher_booked` | Dispatcher booking records |
| `invoice_proficiency` | Invoice metrics & technician proficiency scores |
| `time_tracking` | Fleetmatics + WO time tracking data |
| `reviews` | Google & Yelp review storage |
| `callrail` | CallRail webhook receiver, call log storage |
| `status` | System health checks (scheduled) |
| `tasks` | Internal task management |
| `automation` | The entire scraper engine (Playwright-based) |
| `core` | Django settings, URL routing, scheduler bootstrap |

### Scheduled Jobs (APScheduler)

| Job | Interval |
|---|---|
| Full Scraper Suite | Every N minutes (default: 10, set via `.env`) |
| System Health Checker | Every N minutes (default: 5) |
| Yelp Review Scraper | Every N minutes (default: 1440 = 1 day) |

---

## 📦 Project Structure

```text
Sterling-Dashboard/
├── Backend/
│   ├── accounts/               # Auth, JWT, users
│   ├── automation/
│   │   ├── scrapers/           # All 10 Playwright scrapers
│   │   ├── config/             # Scraper config / rules (JSON)
│   │   ├── services/           # Shared scraper services
│   │   ├── utils/              # Scraper utility helpers
│   │   └── main.py             # Orchestrator entry point
│   ├── callrail/               # CallRail webhook + call logs
│   ├── core/                   # Settings, URLs, scheduler, WSGI
│   ├── dispatcher_booked/      # Dispatcher booking data
│   ├── invoice_proficiency/    # Invoice proficiency metrics
│   ├── locates/                # Locates / work site data
│   ├── reviews/                # Google + Yelp reviews
│   ├── status/                 # Health check system
│   ├── tank_repair/            # Tank repair tracking
│   ├── tasks/                  # Internal tasks
│   ├── time_tracking/          # Time tracking data
│   ├── work_order/             # Work order management
│   └── requirements.txt
└── Fontend/
    └── src/
        ├── App.jsx             # Root — ThemeProvider, AuthProvider, QueryClient
        ├── auth/               # JWT auth context, protected route guards
        ├── context/            # Global snackbar, scraping status context
        ├── pages/
        │   ├── superadmin/     # All SuperAdmin pages & features
        │   ├── manager/        # Manager portal pages
        │   ├── tech/           # Technician portal pages
        │   ├── login/          # Login page
        │   └── error/          # 404 / error pages
        ├── components/         # Shared components (DataTable, Loader, etc.)
        ├── api/                # Axios API call functions per module
        ├── hooks/              # Custom React hooks
        ├── styles/             # MUI custom theme + global CSS
        └── utils/              # Helper functions
```

---

## 🔗 CallRail Integration

- **Webhook Receiver** — Django endpoint receives inbound call events from CallRail in real-time
- **Webhook Inspector** — SuperAdmin UI to inspect raw webhook payloads
- **Call Log Viewer** — Tabular view of all call records stored in the database
- **Fully MUI-based UI** — Clean DataGrid interface with filtering

---

## 🩺 System Health Monitoring

The `status` app runs automated health checks every 5 minutes:
- Checks connectivity to external services
- Logs scraper run statuses
- Surfaces issues in the SuperAdmin dashboard home

---

## 📡 API Documentation

The backend exposes a full **Swagger UI** at `/swagger/` and **ReDoc** at `/redoc/`, auto-generated from DRF serializers via `drf-yasg`.

---

## 🔒 Security & Best Practices

| Practice | Implementation |
|---|---|
| JWT Authentication | `djangorestframework-simplejwt` |
| Role-based access | Frontend route guards + backend permission classes |
| CORS protection | `django-cors-headers` with origin whitelist |
| Scraper anti-collision | Lock file system with stale-lock cleanup |
| Error reporting | Email alerts via Resend on scraper failures |
| Environment secrets | `.env` file + `python-dotenv` |
| UI Consistency | Standardized column naming, confirm-before-action dialogs |

---

## ⚙️ Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- MySQL
- Git

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/ahmedyartanveer/Sterling-Dashboard.git
   cd Sterling-Dashboard
   ```

2. **Frontend Setup**
   ```bash
   cd Fontend
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd Backend
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py runserver
   ```

---

## 🚀 Deployment

- **Frontend** — Vite build → `dist/` folder → served via IIS (Windows Server, `web.config` present)
- **Backend** — Django → served via IIS with `web.config` WSGI config
- **Database** — MySQL
- **Scheduler** — Starts automatically with Django app (`core/apps.py` bootstraps APScheduler on startup)
- **Scraper Lock** — Filesystem-based lock file prevents scheduler + manual trigger collisions

---

## 📄 License

Internal use only for Sterling Septic & Plumbing LLC.
