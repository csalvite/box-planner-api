ALTER TABLE public.block_exercises
  ADD COLUMN IF NOT EXISTS exercise_id uuid NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'block_exercises_exercise_id_fkey'
  ) THEN
    ALTER TABLE public.block_exercises
      ADD CONSTRAINT block_exercises_exercise_id_fkey
      FOREIGN KEY (exercise_id)
      REFERENCES public.exercises(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_block_exercises_exercise_id
  ON public.block_exercises(exercise_id);
