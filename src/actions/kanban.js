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

  // Get tasks with assignees, attachments, and subtasks
  const { data: tasks, error: tasksError } = await supabase
    .from('kanban_tasks')
    .select(`
      *,
      assignees:task_assignees(
        user:user_profiles(*)
      ),
      attachments:task_attachments(*),
      subtasks:kanban_subtasks(*)
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
  try {
    // First update the task basic info
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

    mutate(CACHE_KEY); // Refresh the board data
    return data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error; // Re-throw to handle in the component
  }
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

// ----------------------------------------------------------------------

// Add subtask
export async function addSubtask(taskId, subtaskName) {
  try {
    const { data, error } = await supabase
      .from('kanban_subtasks')
      .insert({
        task_id: taskId,
        name: subtaskName,
        is_completed: false,
        created_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error) throw error;

    mutate(CACHE_KEY, async (currentData) => {
      if (!currentData) return currentData;
      
      const newData = JSON.parse(JSON.stringify(currentData));
      
      // Add the new subtask to the corresponding task
      Object.values(newData.board.tasks).forEach(tasks => {
        tasks.forEach(task => {
          if (task.id === taskId) {
            task.subtasks = [...(task.subtasks || []), data];
          }
        });
      });
      
      return newData;
    }, false);

    return data;
  } catch (error) {
    console.error('Error adding subtask:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

// Update subtask completion status
export async function updateSubtaskStatus(subtaskId, isCompleted) {
  try {
    const { data, error } = await supabase
      .from('kanban_subtasks')
      .update({
        is_completed: isCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('id', subtaskId)
      .select('*') // Make sure to select all fields
      .single();

    if (error) throw error;

    mutate(CACHE_KEY, async (currentData) => {
      if (!currentData) return currentData;
      
      // Deep clone the current data
      const newData = JSON.parse(JSON.stringify(currentData));
      
      // Update the subtask in all tasks
      Object.values(newData.board.tasks).forEach(tasks => {
        tasks.forEach(task => {
          if (task.subtasks) {
            task.subtasks = task.subtasks.map(st => 
              st.id === subtaskId ? data : st
            );
          }
        });
      });
      
      return newData;
    }, false);

    return data;
  } catch (error) {
    console.error('Error updating subtask status:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

// Delete subtask
export async function deleteSubtask(subtaskId) {
  try {
    const { error } = await supabase
      .from('kanban_subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) throw error;

    mutate(CACHE_KEY);
  } catch (error) {
    console.error('Error deleting subtask:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

// Add this new function to update subtask name
export async function updateSubtaskName(subtaskId, newName) {
  try {
    const { data, error } = await supabase
      .from('kanban_subtasks')
      .update({
        name: newName,
        updated_at: new Date().toISOString()
      })
      .eq('id', subtaskId)
      .select()
      .single();

    if (error) throw error;

    mutate(CACHE_KEY);
    return data;
  } catch (error) {
    console.error('Error updating subtask name:', error);
    throw error;
  }
}
