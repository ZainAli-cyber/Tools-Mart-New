-- Profile image + lock unique customer IDs. Safe to re-run.
alter table public.customers
  add column if not exists avatar text;

create or replace function public.protect_customer_code()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.customer_code is distinct from old.customer_code then
    new.customer_code := old.customer_code;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_protect_code on public.customers;
create trigger customers_protect_code
  before update on public.customers
  for each row execute function public.protect_customer_code();
