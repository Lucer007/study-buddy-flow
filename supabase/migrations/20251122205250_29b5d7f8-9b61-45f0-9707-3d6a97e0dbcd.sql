-- Add class-specific progress tracking columns to classes table
ALTER TABLE public.classes
ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
ADD COLUMN streak integer DEFAULT 0 CHECK (streak >= 0),
ADD COLUMN last_studied_date date DEFAULT NULL;

-- Create function to update class streak (similar to user streak but per class)
CREATE OR REPLACE FUNCTION public.update_class_streak(p_class_id uuid, p_user_id uuid, p_minutes integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
BEGIN
  SELECT last_studied_date, streak
  INTO v_last_date, v_current_streak
  FROM public.classes
  WHERE id = p_class_id AND user_id = p_user_id;

  -- Check if studied today already
  IF v_last_date = CURRENT_DATE THEN
    -- Already studied today, no streak change
    RETURN;
  ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Continuation of streak
    UPDATE public.classes
    SET 
      streak = v_current_streak + 1,
      last_studied_date = CURRENT_DATE
    WHERE id = p_class_id AND user_id = p_user_id;
  ELSE
    -- Streak broken, restart
    UPDATE public.classes
    SET 
      streak = 1,
      last_studied_date = CURRENT_DATE
    WHERE id = p_class_id AND user_id = p_user_id;
  END IF;
  
  -- Also update user's total minutes (keep global stats)
  UPDATE public.profiles
  SET total_minutes = total_minutes + p_minutes
  WHERE user_id = p_user_id;
END;
$$;