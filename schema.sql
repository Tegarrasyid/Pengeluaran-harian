-- Jalankan SQL ini di Supabase > SQL Editor.
-- Membuat tabel pengeluaran + Row Level Security agar setiap user hanya melihat datanya sendiri.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_date date not null,
  category text not null,
  description text not null,
  amount numeric(15,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists expenses_user_date_idx
on public.expenses(user_id, expense_date);

alter table public.expenses enable row level security;

drop policy if exists "Users can view own expenses" on public.expenses;
create policy "Users can view own expenses"
on public.expenses for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own expenses" on public.expenses;
create policy "Users can insert own expenses"
on public.expenses for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own expenses" on public.expenses;
create policy "Users can update own expenses"
on public.expenses for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own expenses" on public.expenses;
create policy "Users can delete own expenses"
on public.expenses for delete
to authenticated
using (auth.uid() = user_id);
