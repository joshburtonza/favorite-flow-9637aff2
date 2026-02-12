
-- Add row_index column for deterministic row ordering
ALTER TABLE public.custom_rows ADD COLUMN row_index INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows with stable ordering
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (
    PARTITION BY table_id 
    ORDER BY created_at ASC, id ASC
  ) - 1 AS rn
  FROM custom_rows
)
UPDATE custom_rows SET row_index = numbered.rn
FROM numbered WHERE custom_rows.id = numbered.id;

-- Index for performance
CREATE INDEX idx_custom_rows_table_order ON custom_rows(table_id, row_index);
