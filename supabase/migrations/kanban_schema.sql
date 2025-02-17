-- Create kanban_columns table
CREATE TABLE kanban_columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_tasks table
CREATE TABLE kanban_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  description TEXT,
  column_id UUID REFERENCES kanban_columns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  priority VARCHAR CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_task_assignees table
CREATE TABLE kanban_task_assignees (
  task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- Create kanban_task_attachments table
CREATE TABLE kanban_task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  file_name VARCHAR NOT NULL,
  file_path VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create kanban_task_subtasks table
CREATE TABLE kanban_task_subtasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID REFERENCES kanban_tasks(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create view for task details
CREATE VIEW kanban_task_details AS
SELECT 
  t.id,
  t.name,
  t.description,
  t.column_id,
  t.position,
  t.priority,
  t.due_date,
  t.created_by,
  t.created_at,
  t.updated_at,
  c.name as status,
  JSONB_AGG(DISTINCT jsonb_build_object(
    'id', u.id,
    'name', up.full_name,
    'email', u.email,
    'avatar_url', up.avatar_url
  )) FILTER (WHERE u.id IS NOT NULL) as assignees,
  JSONB_AGG(DISTINCT jsonb_build_object(
    'id', ta.id,
    'file_name', ta.file_name,
    'file_path', ta.file_path,
    'file_type', ta.file_type,
    'file_size', ta.file_size
  )) FILTER (WHERE ta.id IS NOT NULL) as attachments,
  JSONB_AGG(DISTINCT jsonb_build_object(
    'id', ts.id,
    'name', ts.name,
    'is_completed', ts.is_completed
  )) FILTER (WHERE ts.id IS NOT NULL) as subtasks
FROM kanban_tasks t
LEFT JOIN kanban_columns c ON t.column_id = c.id
LEFT JOIN kanban_task_assignees kta ON t.id = kta.task_id
LEFT JOIN auth.users u ON kta.user_id = u.id
LEFT JOIN user_profiles up ON u.id = up.id
LEFT JOIN kanban_task_attachments ta ON t.id = ta.task_id
LEFT JOIN kanban_task_subtasks ts ON t.id = ts.id
GROUP BY t.id, c.name;

-- Create RLS policies
ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_task_subtasks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Allow read access to all authenticated users"
ON kanban_columns FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all authenticated users"
ON kanban_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all authenticated users"
ON kanban_task_assignees FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all authenticated users"
ON kanban_task_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow read access to all authenticated users"
ON kanban_task_subtasks FOR SELECT
TO authenticated
USING (true);

-- Add write policies as needed for your use case 