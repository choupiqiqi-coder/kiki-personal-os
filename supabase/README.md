# Supabase

The migrations in this directory define the MVP database foundation.

- `0001_core.sql`: profiles, goals, tasks, daily workflow, AI artifacts and approvals.
- `0002_content.sql`: the core content production chain.
- `0003_memory_health.sql`: Memory Lite and Health Lite records.

All user-owned tables enable Row Level Security and restrict access to the authenticated owner. Apply these migrations to a local or hosted Supabase project after configuring the Supabase CLI or dashboard connection.
