-- Migration: Add cover_letter column to runs table
-- Run this SQL against your PostgreSQL database

ALTER TABLE runs ADD COLUMN IF NOT EXISTS cover_letter TEXT;
