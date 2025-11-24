# Student Business Management Platform

A comprehensive full-stack platform for managing student enrollments, courses, payments, sessions, and communications. Built with React + TypeScript frontend and Python Flask backend, powered by Supabase.

## 🚀 Features

### For Students

- **Dashboard**: View upcoming sessions, assignments, and announcements
- **Session Management**: Join Zoom sessions, view recordings, track attendance
- **Assignments**: Submit assignments, view grades and feedback
- **Payments**: Secure payment processing, payment history, receipt generation
- **Certificates**: Automatic certificate generation upon course completion
- **Support**: Create and track support tickets with real-time updates
- **Profile Management**: Update personal information and preferences

### For Administrators

- **CRM**: Contact management with tagging, message threading, and advanced search
- **Session Scheduling**: Create and manage Zoom sessions with automatic participant notifications
- **Assignment Management**: Create assignments, grade submissions, provide feedback
- **Payment Management**: Generate payment links, track payments, handle refunds
- **Certificate Generator**: Bulk certificate generation with QR verification
- **Automation Workflows**: 8 pre-configured workflows for common tasks
- **Support Panel**: Manage student tickets with priority levels and SLA tracking
- **Analytics Dashboard**: Real-time insights into business metrics
- **User Management**: Admin verification workflow with email approval

## 📋 Table of Contents

- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

## 🛠 Technology Stack

### Frontend

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Shadcn/UI** component library
- **React Router** for navigation
- **Supabase Client** for real-time data

### Backend

- **Python 3.11+**
- **Flask** web framework
- **Supabase** (PostgreSQL + Auth + Storage)
- **APScheduler** for background jobs
- **WeasyPrint** for PDF generation

### Infrastructure

- **PostgreSQL 15** (via Supabase)
- **Row Level Security (RLS)**
- **Rate Limiting** for API protection
- **Audit Logging** for security

## 📦 Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Supabase Account (free tier available)
- Git

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Jayant71/Student-Business.git
cd Student-Business
```

### 2. Frontend Setup

```bash
npm install
npm run dev
```

Frontend available at `http://localhost:5173`

### 3. Backend Setup

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cd ..
```

## ⚙️ Environment Configuration

### Frontend (.env in root)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:5000/api
```

### Backend (.env in backend/)

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
FLASK_ENV=development
SECRET_KEY=your_secret_key_here
MOCK_MODE=true
```

See `.env.example` files for complete configuration.

## 🗄 Database Setup

### 1. Create Supabase Project

Visit [supabase.com](https://supabase.com) and create a new project

### 2. Run Migrations

```bash
# Using Supabase CLI:
supabase db push

# Or execute migration files manually in Supabase SQL Editor
```

25 migration files in `supabase/migrations/` set up the complete schema.

### 3. Create Initial Admin

After migrations, create your first admin:

```sql
-- After signing up, run:
UPDATE profiles
SET role = 'admin'
WHERE id = 'your_user_id_here';
```

## 🚀 Running the Application

### Development

**Terminal 1 - Frontend:**

```bash
npm run dev
```

**Terminal 2 - Backend:**

```bash
cd backend
python app.py
```

### Production Build

**Frontend:**

```bash
npm run build
npm run preview
```

**Backend:**

```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 📁 Project Structure

```
Student-Business/
├── backend/              # Python Flask API
│   ├── middleware/       # Rate limiting, validation
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic
│   └── utils/            # Utilities
├── components/           # React components
│   ├── admin/            # Admin dashboard
│   ├── student/          # Student dashboard
│   └── ui/               # Reusable UI
├── src/                  # Additional React code
│   ├── context/          # State management
│   ├── hooks/            # Custom hooks
│   └── services/         # API clients
└── supabase/
    └── migrations/       # Database schemas
```

## 🔄 Mock Services

Development mode includes mock services:

- Mock Payment Processing
- Mock Email Notifications
- Mock WhatsApp Messages
- Mock Voice Calls

Enable with `MOCK_MODE=true` in backend/.env

## 📚 API Documentation

See `API_DOCUMENTATION.md` for complete API reference.

**Base URL**: `http://localhost:5000/api`
**Authentication**: Bearer token in Authorization header
**Rate Limits**: Configured per endpoint

## 🚢 Deployment

### Heroku

```bash
heroku create your-app-name
heroku config:set SUPABASE_URL=your_url
git push heroku main
```

### Vercel (Frontend)

```bash
vercel --prod
```

### Docker

```bash
docker build -t student-business .
docker run -p 5000:5000 --env-file .env student-business
```

## 🔐 Security

- Row Level Security on all tables
- Rate limiting on API endpoints
- Input validation and sanitization
- Admin verification workflow
- Audit logging
- JWT authentication

## 📊 Features

### Completed (Phase 1-6)

- ✅ Core data integration
- ✅ Mock service infrastructure
- ✅ Session management
- ✅ Automation workflows
- ✅ Certificate generation
- ✅ CRM enhancements
- ✅ Notification system
- ✅ Support tickets
- ✅ Security hardening
- ✅ Performance optimization
- ✅ Error handling

### Future (Phase 7)

- ⏳ Real API integrations
- ⏳ Advanced analytics
- ⏳ Mobile app

## 📧 Support

Check documentation:

- API_DOCUMENTATION.md
- ADMIN_GUIDE.md
- STUDENT_GUIDE.md
- DEVELOPER_GUIDE.md

---

**Built with ❤️ for efficient student business management**
