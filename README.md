# EngageAI

AI-Powered Business Operations Platform

EngageAI is a premium, open-source platform designed to orchestrate local business customer operations. It integrates real-time queue management, RSVP check-in flows, customer feedback analysis, and Meta WhatsApp Cloud API automation into a single, unified dashboard.

---

## Overview

### The Problem
Brick-and-mortar operations suffer from fragmented customer touchpoints. Managing waitlist lines, checking in event attendees, and collecting reviews usually requires multiple separate, uncoordinated platforms. This causes long wait times, poor data synchronization, and delayed follow-ups.

### The Solution
EngageAI unifies these features into a single, cohesive hub. When a customer joins a queue, registers for an event, or gives a review, EngageAI uses automated WhatsApp campaigns and LLM-powered sentiment analysis to coordinate the customer flow in real-time, helping businesses save time and keep customers engaged.

---

## Features

### Queue Line
- **QR Queue**: Customers scan dynamic workspace codes to check in.
- **Live Position**: Real-time position tracking and queue status updates.
- **ETA Prediction**: AI-estimated waiting times based on active volume.
- **WhatsApp Notifications**: Instant SMS alerts when joining, serving, or when skipped.

### Event Registry
- **Registration Forms**: Simple registration check-in links.
- **QR Check-In**: Quick check-ins with QR ticket codes.
- **Live Attendance**: Operator console tracking real-time attendances.
- **Feedback Collection**: Instantly sends feedback prompts following events.

### Customer Reviews
- **AI Sentiment**: Extracts score sentiments (`positive`, `neutral`, `negative`) using LLMs.
- **WhatsApp Feedback**: Solicits rating scores directly through message threads.
- **Analytics**: Historical dashboards tracing ratings over time.
- **Review Dashboard**: Unified feedback monitoring board.

### AI
- **Business Insights**: Reports peak-hour statistics and customer satisfaction metrics.
- **Predictions**: Anticipates overflow delays.
- **Automation**: Toggles workspace rules based on event triggers.
- **Copilot**: Side panel recommendations for workspace optimization.

---

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, TanStack Router
- **Backend**: TanStack Start, TypeScript, Nitro
- **Database**: Supabase (PostgreSQL with RLS)
- **AI Engine**: Anthropic Claude AI
- **Messaging**: Meta WhatsApp Cloud API
- **Deployment**: Vercel

---

## Environment Variables

Copy [.env.example](file:///.env.example) to `.env` and fill in your keys:

```env
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

META_APP_ID=YOUR_META_APP_ID
META_APP_SECRET=YOUR_META_APP_SECRET

WHATSAPP_ACCESS_TOKEN=YOUR_WHATSAPP_SYSTEM_USER_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID=YOUR_WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID=YOUR_WHATSAPP_BUSINESS_ACCOUNT_ID
WHATSAPP_VERIFY_TOKEN=YOUR_WEBHOOK_VERIFICATION_TOKEN

JWT_SECRET=YOUR_JWT_SIGNING_SECRET
```

---

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/engageai.git
   cd engageai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Migration**:
   Run the schema migrations located inside `/supabase/migrations` on your remote Supabase instance.

4. **Start the local development server**:
   ```bash
   npm run dev
   ```

---

## Folder Structure

```
engageai/
├── docs/                     # Documentation files
│   ├── Architecture.md
│   ├── API.md
│   ├── Database.md
│   ├── Deployment.md
│   ├── WhatsApp.md
│   └── AI.md
├── public/                   # Static public assets
├── src/                      # Source code directory
│   ├── components/           # UI components
│   │   ├── app/              # Application layout parts
│   │   └── ui/               # Base shadcn/radix elements
│   ├── hooks/                # Custom React hooks
│   ├── integrations/         # Database and third-party setups
│   │   └── supabase/
│   ├── lib/                  # Shared utility code
│   ├── routes/               # File-system routes (TanStack Router)
│   ├── routeTree.gen.ts      # Generated TanStack Route Tree
│   └── start.ts              # TanStack Start server bootstrap
├── supabase/                 # Supabase configuration & migrations
├── .env.example              # Variables guide
├── .gitignore                # Git exclusions
├── LICENSE                   # Open-source MIT License
└── package.json              # Project dependencies
```

---

## Architecture Diagram

```
User (Browser)
      │
      ▼ [HTTPS / HTTP]
React App (TanStack Router Client)
      │
      ▼ [RPC Call / Server Function]
TanStack Start Server (Nitro Runtime)
      ├── [Supabase Database]
      ├── [Claude AI API]
      └── [Meta WhatsApp API]
```

---

## Screenshots

*Screenshots and UI demos go here.*

---

## Future Roadmap

- **AI Voice Agent**: Seamless inbound phone reservation management.
- **Smart Scheduling**: Machine-learning slot allocation calendars.
- **CRM Integration**: Profile matching across branches.
- **Loyalty Engine**: Automate reward tokens for returning clients.
- **Multi-Branch Analytics**: Comparative reporting dashboards.
