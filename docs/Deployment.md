# Deployment Guide

EngageAI is built to deploy on Vercel and Supabase.

---

## 1. Supabase Database Setup

1. **Create Project**: Start a new project on the Supabase dashboard.
2. **Schema Migration**:
   - Go to the **SQL Editor** on your Supabase dashboard.
   - Execute the SQL files located inside the `supabase/migrations/` directory in chronological order, or push them using the Supabase CLI:
     ```bash
     supabase link --project-ref <your-project-id>
     supabase db push
     ```

---

## 2. Frontend & API Deployment (Vercel)

This project is co-located with TanStack Start, which generates a Node/Nitro engine compatible with Vercel Serverless Functions.

1. **Import Project**: Link your Git repository on Vercel.
2. **Environment Variables**: Populate all keys from `.env.example`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_APP_SECRET`
   - `WHATSAPP_APP_ID`
3. **Build Settings**: Vercel automatically detects the builder. Use defaults or standard Vite configs.
4. **Deploy**: Trigger production deploy.
