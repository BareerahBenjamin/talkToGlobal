-- Add an editable title/role to profiles so each user can set their own
-- headline instead of a hardcoded "AI Founder". Falls back to Founder DNA
-- position or a neutral default in the UI when empty.
alter table public.profiles
  add column if not exists title text;
