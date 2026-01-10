-- Add 'deleted' to document_status enum (separate transaction)
ALTER TYPE document_status ADD VALUE IF NOT EXISTS 'deleted';