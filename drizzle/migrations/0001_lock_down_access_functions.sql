revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.has_access(uuid) from public, anon;
revoke execute on function public.claim_access() from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.has_access(uuid) to authenticated;
grant execute on function public.claim_access() to authenticated;