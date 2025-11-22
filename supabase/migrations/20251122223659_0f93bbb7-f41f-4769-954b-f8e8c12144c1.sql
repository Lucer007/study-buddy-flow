-- Add indexes to improve feed_posts query performance
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_id ON public.feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON public.feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_created ON public.feed_posts(user_id, created_at DESC);

-- Add index for study_sessions queries
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON public.study_sessions(user_id, completed_at DESC);

-- Add index for study_blocks queries
CREATE INDEX IF NOT EXISTS idx_study_blocks_user_date ON public.study_blocks(user_id, block_date, start_time);