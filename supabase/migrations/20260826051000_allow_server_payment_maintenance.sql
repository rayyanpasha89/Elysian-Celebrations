-- The application never exposes payment deletion: corrections use the audited
-- void action. The service role still needs delete privilege for deterministic
-- test-fixture teardown and account-retention maintenance performed by trusted
-- server code.

grant delete on table public.payments to service_role;

comment on table public.payments is
  'Directional booking ledger. Application corrections are voided, never deleted. DELETE remains service-role-only for fixture teardown and controlled retention maintenance.';
