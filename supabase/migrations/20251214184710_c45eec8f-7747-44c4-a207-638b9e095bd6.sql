-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'shipping';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'file_costing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'operations';