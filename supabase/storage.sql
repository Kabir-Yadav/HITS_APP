-- Create a new bucket for kanban attachments
INSERT INTO storage.buckets (id, name)
VALUES ('kanban-attachments', 'kanban-attachments');

-- Make the bucket public
UPDATE storage.buckets
SET public = true
WHERE name = 'kanban-attachments'; 