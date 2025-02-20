-- Create kanban_columns table
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  position INTEGER
);

-- Create kanban_tasks table
CREATE TABLE kanban_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  description TEXT,
  column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
  priority VARCHAR CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  due_start TIMESTAMP WITH TIME ZONE,
  due_end TIMESTAMP WITH TIME ZONE,
  reporter_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create kanban_task_assignees table
CREATE TABLE kanban_task_assignees (
  task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, user_id)
);

-- Create kanban_task_attachments table
CREATE TABLE kanban_task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_url VARCHAR NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default columns
INSERT INTO kanban_columns (name) VALUES 
('Backlog'),
('In Progress'), 
('Review'),
('Done');

-- Update existing columns with position
UPDATE kanban_columns 
SET position = subquery.position 
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as position 
  FROM kanban_columns
) as subquery 
WHERE kanban_columns.id = subquery.id;

-- Make position not null after setting initial values
ALTER TABLE kanban_columns 
ALTER COLUMN position SET NOT NULL;

-- Add index for faster ordering
CREATE INDEX idx_kanban_columns_position ON kanban_columns(position);

-- Add unique constraint to position
ALTER TABLE kanban_columns 
ADD CONSTRAINT unique_column_position UNIQUE (position); 