-- Run this in the Supabase SQL Editor to add Ladies Only support to
-- classes already created from the original schema.sql.
alter table classes add column if not exists ladies_only boolean not null default false;
