-- Fix: 0001_init.sql created tables via the SQL Editor without granting base
-- table-level privileges to anon/authenticated/service_role. RLS policies
-- alone are not enough — Postgres GRANT is a separate, prior gate ("can this
-- role touch this table at all") that RLS then further restricts by row.
-- service_role bypasses RLS but still needs the base GRANT to be attempted.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to anon, authenticated, service_role;

-- So any tables added in future migrations get the same grants automatically.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;
alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
