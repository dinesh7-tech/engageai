-- Smoke Tests for Business OS Provisioning and RLS Architecture
-- Run this block inside your SQL editor to verify RLS and creation logic.
-- IMPORTANT: Make sure the migration file (20260806030000_fix_rls_recursion.sql) has been run first!

DO $$
DECLARE
  v_test_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_operator_user_id uuid := '00000000-0000-0000-0000-000000000002';
  v_workspace_id uuid;
  v_queue_id uuid;
  v_event_id uuid;
  v_feedback_id uuid;
BEGIN
  -- 1. Create test users in auth.users first (to satisfy profiles and memberships foreign keys)
  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (
    v_test_user_id,
    'smoke_test_user@example.com',
    '{"full_name": "Smoke Test User"}'::jsonb,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email, raw_user_meta_data, aud, role)
  VALUES (
    v_operator_user_id,
    'smoke_operator@example.com',
    '{"full_name": "Smoke Test Operator"}'::jsonb,
    'authenticated',
    'authenticated'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Simulate authentication context for auth.uid()
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_test_user_id)::text, true);

  -- 2. Call the RPC to create a workspace (this tests workspace, profile check/upsert, member, and provisioning status creation in a single transaction)
  v_workspace_id := public.create_workspace_transaction(
    'Smoke Test Workspace'::text,
    'Other'::text,
    'Asia/Kolkata'::text,
    'IN'::text
  );

  RAISE NOTICE 'Workspace created with ID: %', v_workspace_id;

  -- 3. Verify helper functions/RLS evaluations
  IF NOT public.is_workspace_member(v_workspace_id) THEN
    RAISE EXCEPTION 'is_workspace_member returned false for active member';
  END IF;

  IF NOT public.is_workspace_owner(v_workspace_id) THEN
    RAISE EXCEPTION 'is_workspace_owner returned false for active owner';
  END IF;

  -- 4. Verify adding a member as the owner
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_operator_user_id, 'operator');

  -- 5. Test queue insert
  INSERT INTO public.queue_entries (workspace_id, token, customer_name, status)
  VALUES (v_workspace_id, 'SMK-1', 'Test Customer', 'waiting')
  RETURNING id INTO v_queue_id;

  -- 6. Test event insert
  INSERT INTO public.events (workspace_id, name, status)
  VALUES (v_workspace_id, 'Smoke Test Event', 'upcoming')
  RETURNING id INTO v_event_id;

  -- 7. Test feedback insert
  INSERT INTO public.feedback_entries (workspace_id, customer_name, rating, status)
  VALUES (v_workspace_id, 'Test Customer', 5, 'pending')
  RETURNING id INTO v_feedback_id;

  -- Verify negative check for non-member
  PERFORM set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-000000000009'::uuid)::text, true);

  IF public.is_workspace_member(v_workspace_id) THEN
    RAISE EXCEPTION 'Security breach: Non-member identified as member';
  END IF;

  IF public.is_workspace_owner(v_workspace_id) THEN
    RAISE EXCEPTION 'Security breach: Non-owner identified as owner';
  END IF;

  -- Clean up test data (re-authenticate as owner to delete)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_test_user_id)::text, true);
  DELETE FROM public.feedback_entries WHERE id = v_feedback_id;
  DELETE FROM public.events WHERE id = v_event_id;
  DELETE FROM public.queue_entries WHERE id = v_queue_id;
  DELETE FROM public.workspace_members WHERE workspace_id = v_workspace_id;
  DELETE FROM public.workspace_provisioning_status WHERE workspace_id = v_workspace_id;
  DELETE FROM public.onboarding_checklist WHERE workspace_id = v_workspace_id;
  DELETE FROM public.workspaces WHERE id = v_workspace_id;
  
  -- Delete users from auth.users (cascades to profiles)
  DELETE FROM auth.users WHERE id = v_test_user_id;
  DELETE FROM auth.users WHERE id = v_operator_user_id;

  RAISE NOTICE 'Smoke tests completed successfully!';
END;
$$;
