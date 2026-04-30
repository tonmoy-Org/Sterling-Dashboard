# Sterling Septic & Plumbing LLC Dashboard

A comprehensive management and automation dashboard designed for Sterling Septic & Plumbing LLC. This platform unifies operational tracking, technician performance metrics, and automated data scraping into a single, professional administrative interface.

## 🚀 Key Features

### 📊 Performance & Analytics
*   **Invoice Proficiency Tracking:** Monitor technician efficiency through automated proficiency calculations and invoice metrics.
*   **RME Reports:** Detailed reporting and analysis for operational workflows.
*   **Dispatch KPI:** Track dispatcher performance and booking metrics.

### 🛠️ Operations Management
*   **Locates Dashboard:** Unified interface for managing customer information and work orders.
*   **Tank Repairs:** Dedicated module for tracking and managing repair tasks.
*   **Customer Center:** A centralized hub for managing customer interactions and history.
*   **Recycle Bin:** Safeguard against accidental data loss with standardized restoration workflows.

### 🤖 Automation Suite
*   **Intelligent Scrapers:** Robust Python-based scrapers (using Playwright) for automated data ingestion from external platforms like FieldEdge.
*   **Dynamic Rules Engine:** Configurable scraper rules via JSON for high flexibility and maintainability.

## 🛠️ Technology Stack

### Frontend
*   **Framework:** React with Vite
*   **UI Library:** Material UI (MUI)
*   **State Management:** TanStack Query (React Query)
*   **Icons:** Lucide React
*   **Styling:** Vanilla CSS & Theme-based styling

### Backend
*   **Framework:** Django / Django REST Framework (DRF)
*   **Automation:** Playwright (Python)
*   **Database:** PostgreSQL (Standard for Django production)

## 📦 Project Structure

```text
├── Backend/          # Django API, Models, and Automation Scrapers
├── Fontend/          # React Application and UI Components
└── automation/       # Playwright-based scraping infrastructure
```

## ⚙️ Getting Started

### Prerequisites
*   Node.js (v18+)
*   Python (v3.10+)
*   Git

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

## 🛡️ Best Practices
*   **UI Consistency:** Standardized column naming (e.g., "Customer Info") and confirm-before-action dialogs.
*   **Error Handling:** Integrated incident reporting for automation failures with automated email notifications.
*   **Performance:** Optimized scroll behavior and responsive layouts for administrative tasks.

## 📄 License
Internal use only for Sterling Septic & Plumbing LLC.
