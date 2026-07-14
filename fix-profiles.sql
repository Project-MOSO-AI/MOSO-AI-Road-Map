-- First: check if there are duplicate triggers or functions
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'auth';

SELECT proname, proowner::regrole, prosecdef
FROM pg_proc WHERE proname = 'handle_new_user';
