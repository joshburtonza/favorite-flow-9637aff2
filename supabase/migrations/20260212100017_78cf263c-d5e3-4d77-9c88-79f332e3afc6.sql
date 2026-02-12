-- Add view_file_costing to the app_permission enum
ALTER TYPE public.app_permission ADD VALUE IF NOT EXISTS 'view_file_costing';