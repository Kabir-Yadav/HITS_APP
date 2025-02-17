CREATE OR REPLACE FUNCTION move_task_between_columns(
  p_task_id UUID,
  p_source_column_id UUID,
  p_target_column_id UUID
) RETURNS void AS $$
BEGIN
  -- Update task's column and recalculate position
  UPDATE kanban_tasks
  SET 
    column_id = p_target_column_id,
    position = (
      SELECT COALESCE(MAX(position), 0) + 1
      FROM kanban_tasks
      WHERE column_id = p_target_column_id
    )
  WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql; 