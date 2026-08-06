# System Architecture

EngageAI is built on a modern, unified full-stack architecture that co-locates client-side views and server-side logic in a single type-safe code repository.

## Overview Diagram

```
[ User Browser ]
       │
       ▼ (HTTPS / HTTP)
[ React Client (TanStack Router) ]
       │
       ▼ (RPC Call / server functions)
[ TanStack Start Backend (Node.js/Nitro) ]
       ├── [ Supabase Database (PostgreSQL) ]
       ├── [ Anthropic Claude AI (LLM Engine) ]
       └── [ Meta WhatsApp Cloud API ]
```

---

## Component Layers

### 1. Frontend (Client-side)
- **Framework**: React 19, Vite, TailwindCSS (for modern, performant styling).
- **Routing**: TanStack Router (fully type-safe routes, loaders, params, and navigation).
- **State & Queries**: TanStack Query (`@tanstack/react-query`) for local caching and server state syncing.

### 2. Backend (Server-side)
- **Server Engine**: TanStack Start + Nitro Server.
- **Server Functions**: Type-safe RPC endpoints (`createServerFn`) that execute securely on the server and are called seamlessly by the client.
- **Security Context**: Validates JWT/Supabase auth cookies, prevents data leakage, and executes high-privilege operations (Meta API access, AI calculations).

### 3. Database
- **Provider**: Supabase (PostgreSQL).
- **Schema Management**: Multi-tenant structure containing workspaces, members, profiles, queues, events, feedback logs, and automation rules.
- **Security**: Row Level Security (RLS) enabled on all tables, bound to member workspace membership via SQL functions.

### 4. Third-Party Integrations
- **AI Processing**: Claude AI integration for sentiment classification and automated suggestions.
- **Messaging Service**: Meta WhatsApp Cloud API for automated notifications (queue confirmations, check-in passes, alerts, and feedback loop triggers).
