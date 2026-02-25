DO $$
BEGIN
  IF to_regclass('public.ai_planner_responses') IS NOT NULL
     AND to_regclass('public.ai_responses') IS NULL THEN
    ALTER TABLE public.ai_planner_responses RENAME TO ai_responses;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.idx_ai_planner_responses_user_created') IS NOT NULL
     AND to_regclass('public.idx_ai_responses_user_created') IS NULL THEN
    ALTER INDEX public.idx_ai_planner_responses_user_created RENAME TO idx_ai_responses_user_created;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.idx_ai_planner_responses_feature_created') IS NOT NULL
     AND to_regclass('public.idx_ai_responses_feature_created') IS NULL THEN
    ALTER INDEX public.idx_ai_planner_responses_feature_created RENAME TO idx_ai_responses_feature_created;
  END IF;
END $$;
