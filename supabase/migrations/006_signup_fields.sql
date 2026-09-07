-- New signup fields: date of birth and liability waiver acceptance.
alter table clients add column if not exists date_of_birth date;
alter table clients add column if not exists liability_accepted_at timestamptz;
