import useSWR, { mutate } from 'swr';
import { useMemo, startTransition } from 'react';

import { supabase } from 'src/lib/supabase'; 
import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const enableServer = false;

const KANBAN_ENDPOINT = endpoints.kanban;

const CACHE_KEY = 'KANBAN_BOARD';

// ----------------------------------------------------------------------

// Fetch board data
export async function fetchBoardData() {
  // Get columns
  const { data: columns, error: columnsError } = await supabase
    .from('kanban_columns')
    .select('*')
    .order('order_position');

  if (columnsError) throw columnsError;

  // Get tasks with assignees and attachments
  const { data: tasks, error: tasksError } = await supabase
    .from('kanban_tasks')
    .select(`
      *,
      assignees:task_assignees(
        user:user_profiles(*)
      ),
      attachments:task_attachments(*)
    `);

  if (tasksError) throw tasksError;

  // Organize tasks by column
  const tasksByColumn = {};
  columns.forEach(column => {
    tasksByColumn[column.id] = tasks.filter(task => task.column_id === column.id);
  });

  return {
    board: {
      columns,
      tasks: tasksByColumn
    }
  };
}

// ----------------------------------------------------------------------

// Get board data hook
export function useGetBoard() {
  const { data, isLoading, error, isValidating } = useSWR(
    CACHE_KEY,
    fetchBoardData,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );

  const memoizedValue = useMemo(
    () => ({
      board: {
        columns: data?.board.columns || [],
        tasks: data?.board.tasks || {}
      },
      boardLoading: isLoading,
      boardError: error,
      boardValidating: isValidating,
      boardEmpty: !isLoading && !data?.board.columns.length,
    }),
    [data, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

// Create new column
export async function createColumn(columnData) {
  const { data, error } = await supabase
    .from('kanban_columns')
    .insert([columnData])
    .select()
    .single();

  if (error) throw error;

  mutate(CACHE_KEY);
  return data;
}

// ----------------------------------------------------------------------

// Update column
export async function updateColumn(columnId, columnName) {
  const { error } = await supabase
    .from('kanban_columns')
    .update({ name: columnName })
    .eq('id', columnId);

  if (error) throw error;
  
  mutate(CACHE_KEY);
}

// ----------------------------------------------------------------------

// Delete column
export async function deleteColumn(columnId) {
  const { error } = await supabase
    .from('kanban_columns')
    .delete()
    .eq('id', columnId);

  if (error) throw error;

  mutate(CACHE_KEY);
}

// ----------------------------------------------------------------------

// Create task
export async function createTask(columnId, taskData) {
  // First get the column to get its name for the status
  const { data: column, error: columnError } = await supabase
    .from('kanban_columns')
    .select('name')
    .eq('id', columnId)
    .single();

  if (columnError) throw columnError;

  // Prepare task data
  const newTask = {
    name: taskData.name,
    description: taskData.description || '',
    column_id: columnId,
    priority: taskData.priority || 'medium',
    due_date: taskData.due?.[0] || null, // Use first date from due array if exists
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Insert the task
  const { data: task, error: taskError } = await supabase
    .from('kanban_tasks')
    .insert([newTask])
    .select()
    .single();

  if (taskError) throw taskError;

  // Handle assignees if any
  if (taskData.assignee?.length) {
    const assigneeData = taskData.assignee.map(user => ({
      task_id: task.id,
      user_id: user.id,
      assigned_at: new Date().toISOString()
    }));

    const { error: assigneeError } = await supabase
      .from('task_assignees')
      .insert(assigneeData);

    if (assigneeError) throw assigneeError;
  }

  // Fetch the complete task with its relationships
  const { data: completeTask, error: fetchError } = await supabase
    .from('kanban_tasks')
    .select(`
      *,
      assignees:task_assignees(
        user:user_profiles(*)
      ),
      attachments:task_attachments(*)
    `)
    .eq('id', task.id)
    .single();

  if (fetchError) throw fetchError;

  mutate(CACHE_KEY);
  return completeTask;
}

// ----------------------------------------------------------------------

// Update task
export async function updateTask(columnId, taskData) {
  const { data, error } = await supabase
    .from('kanban_tasks')
    .update({
      name: taskData.name,
      description: taskData.description,
      priority: taskData.priority,
      due_date: taskData.due_date,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskData.id)
    .select()
    .single();

  if (error) throw error;

  // Handle assignees if changed
  if (taskData.assignee?.length) {
    // First remove existing assignees
    const { error: deleteError } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskData.id);

    if (deleteError) throw deleteError;

    // Then add new assignees
    const assigneeData = taskData.assignee.map(user => ({
      task_id: taskData.id,
      user_id: user.id,
      assigned_at: new Date().toISOString()
    }));

    const { error: assigneeError } = await supabase
      .from('task_assignees')
      .insert(assigneeData);

    if (assigneeError) throw assigneeError;
  }

  mutate(CACHE_KEY);
  return data;
}

// ----------------------------------------------------------------------

// Delete task
export async function deleteTask(columnId, taskId) {
  const { error } = await supabase
    .from('kanban_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;

  mutate(CACHE_KEY);
}

// ----------------------------------------------------------------------

// Move task between columns
export async function moveTaskBetweenColumns(task, sourceColumnId, targetColumnId) {
  const { error } = await supabase
    .from('kanban_tasks')
    .update({ 
      column_id: targetColumnId,
      updated_at: new Date().toISOString()
    })
    .eq('id', task.id);

  if (error) throw error;

  mutate(CACHE_KEY);
}

// ----------------------------------------------------------------------

export async function moveColumn(updateColumns) {
  /**
   * Work in local
   */
  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;

        return { ...currentData, board: { ...board, columns: updateColumns } };
      },
      false
    );
  });

  /**
   * Work on server
   */
  if (enableServer) {
    const data = { updateColumns };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'move-column' } });
  }
}

// ----------------------------------------------------------------------

export async function clearColumn(columnId) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { columnId };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'clear-column' } });
  }

  /**
   * Work in local
   */
  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;

        // remove all tasks in column
        const tasks = { ...board.tasks, [columnId]: [] };

        return { ...currentData, board: { ...board, tasks } };
      },
      false
    );
  });
}

export const moveTask = moveTaskBetweenColumns;
