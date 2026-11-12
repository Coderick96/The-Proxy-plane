-- Optional hosted recovery scheduler. Requires ai_recovery.sql first.
-- No provider API call or application credential is stored in this job.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create extension if not exists pg_cron;
do $scheduler$
declare existing cron.job%rowtype;
begin
 if to_regprocedure('public.pp_ai_reconcile(integer)') is null then
  raise exception 'Install the reviewed AI recovery functions before this scheduler';
 end if;
 select * into existing from cron.job where jobname='proxy-plane-ai-recovery';
 if found then
  if existing.command <> 'set statement_timeout = ''30s''; set lock_timeout = ''5s''; select public.pp_ai_reconcile(20);' or existing.schedule <> '* * * * *' or not existing.active then
   raise exception 'Existing recovery job differs; review before changing it';
  end if;
 else
  perform cron.schedule('proxy-plane-ai-recovery','* * * * *','set statement_timeout = ''30s''; set lock_timeout = ''5s''; select public.pp_ai_reconcile(20);');
 end if;
end $scheduler$;
commit;
-- Verify actual execution via cron.job_run_details before attesting scheduler readiness.
-- Rollback only this job: select cron.unschedule(jobid) from cron.job where jobname='proxy-plane-ai-recovery';
-- Keep the extension and application ledgers intact.
