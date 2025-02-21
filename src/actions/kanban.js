import useSWR, { mutate } from 'swr';
import { useMemo, startTransition } from 'react';

import { supabase } from 'src/lib/supabase';
import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const enableServer = false;

const KANBAN_ENDPOINT = endpoints.kanban;

const KANBAN_CACHE_KEY = 'kanban_board';

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

// ----------------------------------------------------------------------

export function useGetBoard() {
  const { data, isLoading, error, isValidating } = useSWR(
    KANBAN_CACHE_KEY,
    async () => {
      // Fetch columns ordered by position
      const { data: columns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position');

      if (columnsError) throw columnsError;

      // Fetch tasks with assignees, attachments, and subtasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('kanban_tasks')
        .select(`
          *,
          assignees:kanban_task_assignees(
            user:user_profiles(*)
          ),
          attachments:kanban_task_attachments(*),
          reporter:user_profiles!kanban_tasks_reporter_id_fkey(*),
          subtasks:kanban_task_subtasks(*)
        `)
        .order('created_at');

      if (tasksError) throw tasksError;

      // Organize tasks by column
      const tasks = columns.reduce((acc, column) => {
        acc[column.id] = tasksData
          .filter(task => task.column_id === column.id)
          .map(task => ({
            id: task.id,
            name: task.name,
            description: task.description,
            priority: task.priority,
            status: column.name,
            column_id: task.column_id,
            due: [task.due_start, task.due_end],
            assignee: task.assignees?.map(({ user }) => ({
              id: user.id,
              name: user.name || user.email,
              email: user.email,
              avatarUrl: user.avatar_url,
            })) || [],
            attachments: task.attachments?.map(att => att.file_url) || [],
            reporter: task.reporter ? {
              id: task.reporter.id,
              name: task.reporter.name || task.reporter.email,
              avatarUrl: task.reporter.avatar_url,
            } : null,
            subtasks: task.subtasks || [], // Add subtasks to the task object
          }));
        return acc;
      }, {});

      return {
        board: {
          columns,
          tasks,
        },
      };
    }
  );

  const memoizedValue = useMemo(
    () => ({
      board: {
        tasks: data?.board.tasks ?? {},
        columns: data?.board.columns ?? [],
      },
      boardLoading: isLoading,
      boardError: error,
      boardValidating: isValidating,
      boardEmpty: !isLoading && !isValidating && !data?.board.columns.length,
    }),
    [data?.board.columns, data?.board.tasks, error, isLoading, isValidating]
  );

  return memoizedValue;
}

// ----------------------------------------------------------------------

export async function createColumn(columnData) {
  // Get current max position
  const { data: existingColumns } = await supabase
    .from('kanban_columns')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);

  const nextPosition = existingColumns?.[0]?.position + 1 || 0;

  // Create new column with position
  const { data: newColumn, error } = await supabase
    .from('kanban_columns')
    .insert([{ 
      name: columnData.name,
      position: nextPosition 
    }])
    .select()
    .single();

  if (error) throw error;

  mutate(
    KANBAN_CACHE_KEY,
    (currentData) => {
      const { board } = currentData;
      const updatedColumns = [...board.columns, newColumn];
      const tasks = { ...board.tasks, [newColumn.id]: [] };

      return { 
        ...currentData, 
        board: { 
          ...board, 
          columns: updatedColumns, 
          tasks 
        } 
      };
    },
    false
  );
}

// ----------------------------------------------------------------------

export async function updateColumn(columnId, columnName) {
  startTransition(() => {
    mutate(
      KANBAN_CACHE_KEY,
      async (currentData) => {
        // Update column in database
        const { error } = await supabase
          .from('kanban_columns')
          .update({ name: columnName })
          .eq('id', columnId);

        if (error) throw error;

        const { board } = currentData;

        // Update column in local state
        const columns = board.columns.map((column) =>
          column.id === columnId ? { ...column, name: columnName } : column
        );

        return {
          ...currentData,
          board: {
            ...board,
            columns,
          },
        };
      },
      false
    );
  });
}

// ----------------------------------------------------------------------

export async function moveColumn(updateColumns) {
  try {
    // First update positions to temporary values to avoid conflicts
    const tempUpdates = updateColumns.map((column, index) => ({
      id: column.id,
      name: column.name,
      position: -1 * (index + 1)
    }));

    await supabase
      .from('kanban_columns')
      .upsert(tempUpdates, { onConflict: 'id' });

    // Then update to final positions
    const finalUpdates = updateColumns.map((column, index) => ({
      id: column.id,
      name: column.name,
      position: index
    }));

    const { error } = await supabase
      .from('kanban_columns')
      .upsert(finalUpdates, { onConflict: 'id' });

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        return {
          ...currentData,
          board: {
            ...board,
            columns: updateColumns.map((column, index) => ({
              ...column,
              position: index
            }))
          }
        };
      },
      false
    );
  } catch (error) {
    console.error('Error moving columns:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function clearColumn(columnId) {
  try {
    // Delete all tasks in the column from database
    const { error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('column_id', columnId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        return { 
          ...currentData, 
          board: { 
            ...board, 
            tasks: { 
              ...board.tasks, 
              [columnId]: [] 
            } 
          } 
        };
      },
      false
    );
  } catch (error) {
    console.error('Error clearing column:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function deleteColumn(columnId) {
  try {
    // Delete the column from database
    // (This will automatically delete associated tasks due to ON DELETE CASCADE)
    const { error } = await supabase
      .from('kanban_columns')
      .delete()
      .eq('id', columnId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;

        // Remove column from columns array
        const columns = board.columns.filter((column) => column.id !== columnId);

        // Remove tasks for the deleted column
        const { [columnId]: deletedTasks, ...remainingTasks } = board.tasks;

        return { 
          ...currentData, 
          board: { 
            ...board, 
            columns,
            tasks: remainingTasks 
          } 
        };
      },
      false
    );
  } catch (error) {
    console.error('Error deleting column:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function createTask(columnId, taskData) {
  try {
    // Create the task in the database
    const { data: task, error: taskError } = await supabase
      .from('kanban_tasks')
      .insert([{
        name: taskData.name,
        description: taskData.description || '',
        column_id: columnId,
        priority: taskData.priority,
        due_start: taskData.due[0],
        due_end: taskData.due[1],
        reporter_id: taskData.reporter.id,
      }])
      .select()
      .single();

    if (taskError) throw taskError;

    // Update the local state optimistically
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const columnTasks = board.tasks[columnId] || [];

        const newTask = {
          id: task.id,
          name: task.name,
          description: task.description,
          priority: task.priority,
          due: [task.due_start, task.due_end],
          assignee: [],
          attachments: [],
          reporter: taskData.reporter,
        };

        return {
          ...currentData,
          board: {
            ...board,
            tasks: {
              ...board.tasks,
              [columnId]: [newTask, ...columnTasks],
            },
          },
        };
      },
      false
    );

    return task;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function updateTask(columnId, taskData) {
  /**
   * Work on server
   */
  if (enableServer) {
    const data = { columnId, taskData };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'update-task' } });
  }

  /**
   * Work in local
   */
  startTransition(() => {
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;

        // tasks in column
        const tasksInColumn = board.tasks[columnId];

        // find and update task
        const updateTasks = tasksInColumn.map((task) =>
          task.id === taskData.id
            ? {
                // Update data when found
                ...task,
                ...taskData,
              }
            : task
        );

        const tasks = { ...board.tasks, [columnId]: updateTasks };

        return { ...currentData, board: { ...board, tasks } };
      },
      false
    );
  });
}

// ----------------------------------------------------------------------

export async function moveTask(updateTasks) {
  try {
    // Find which tasks have changed columns and update them in the database
    const updates = [];
    
    Object.entries(updateTasks).forEach(([columnId, tasks]) => {
      tasks.forEach(task => {
        // Always update the column_id and include all required fields when task is moved
        updates.push({
          id: task.id,
          name: task.name,
          column_id: columnId,
          priority: task.priority,
          description: task.description || '',
          reporter_id: task.reporter?.id, // Include reporter_id
          due_start: task.due?.[0] || null,
          due_end: task.due?.[1] || null
        });
      });
    });

    // Batch update all moved tasks
    if (updates.length > 0) {
      const { error } = await supabase
        .from('kanban_tasks')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw error;
    }

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;

        // Update tasks with new column info and status
        const updatedTasks = {};
        Object.entries(updateTasks).forEach(([columnId, tasks]) => {
          updatedTasks[columnId] = tasks.map(task => ({
            ...task,
            column_id: columnId,
            status: board.columns.find(col => col.id === columnId)?.name || task.status
          }));
        });

        return { 
          ...currentData, 
          board: { 
            ...board, 
            tasks: updatedTasks 
          } 
        };
      },
      false
    );
  } catch (error) {
    console.error('Error moving tasks:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function deleteTask(columnId, taskId) {
  try {
    // Delete task from database
    // This will automatically cascade delete:
    // - kanban_task_assignees
    // - kanban_task_attachments 
    // - kanban_task_subtasks
    // due to ON DELETE CASCADE constraints
    const { error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    // Delete any uploaded files from storage
    const { data: attachments } = await supabase
      .from('kanban_task_attachments')
      .select('file_url')
      .eq('task_id', taskId);

    if (attachments?.length) {
      // Extract file paths from URLs
      const filePaths = attachments.map(att => {
        const url = new URL(att.file_url);
        return url.pathname.split('/').pop(); // Get filename from URL
      });

      // Delete files from storage
      const { error: storageError } = await supabase.storage
        .from('kanban-attachments')
        .remove(filePaths);

      if (storageError) {
        console.error('Error deleting attachment files:', storageError);
      }
    }

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;

        // Remove task from column
        const tasks = {
          ...board.tasks,
          [columnId]: board.tasks[columnId].filter((task) => task.id !== taskId),
        };

        return { 
          ...currentData, 
          board: { 
            ...board,
            tasks 
          } 
        };
      },
      false
    );
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function moveTaskBetweenColumns(task, sourceColumnId, targetColumnId) {
  try {
    // Update task column in database first
    const { error } = await supabase
      .from('kanban_tasks')
      .update({ column_id: targetColumnId })
      .eq('id', task.id);

    if (error) throw error;

    // Then update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        
        // Remove task from source column
        const sourceColumnTasks = board.tasks[sourceColumnId].filter(t => t.id !== task.id);
        
        // Add task to target column with updated status
        const updatedTask = {
          ...task,
          status: board.columns.find(col => col.id === targetColumnId)?.name || task.status
        };
        
        const targetColumnTasks = [updatedTask, ...(board.tasks[targetColumnId] || [])];

        // Update both columns
        const updatedTasks = {
          ...board.tasks,
          [sourceColumnId]: sourceColumnTasks,
          [targetColumnId]: targetColumnTasks,
        };

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false // Don't revalidate immediately
    );
  } catch (error) {
    console.error('Error moving task between columns:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function updateTaskPriority(taskId, priority) {
  try {
    // Update priority in database
    const { error } = await supabase
      .from('kanban_tasks')
      .update({ priority })
      .eq('id', taskId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Update the task priority in all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) =>
            task.id === taskId ? { ...task, priority } : task
          );
        });

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false
    );
  } catch (error) {
    console.error('Error updating task priority:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function updateTaskDescription(taskId, description) {
  try {
    // Update description in database
    const { error } = await supabase
      .from('kanban_tasks')
      .update({ description })
      .eq('id', taskId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Update the task description in all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) =>
            task.id === taskId ? { ...task, description } : task
          );
        });

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false
    );
  } catch (error) {
    console.error('Error updating task description:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function updateTaskDueDate(taskId, dueStart, dueEnd) {
  try {
    // Update due dates in database
    const { error } = await supabase
      .from('kanban_tasks')
      .update({
        due_start: dueStart?.toISOString() || null,
        due_end: dueEnd?.toISOString() || null
      })
      .eq('id', taskId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Update the task due dates in all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) =>
            task.id === taskId 
              ? { 
                  ...task, 
                  due: [
                    dueStart?.toISOString() || null,
                    dueEnd?.toISOString() || null
                  ] 
                } 
              : task
          );
        });

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false
    );
  } catch (error) {
    console.error('Error updating task due dates:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function createSubtask(taskId, subtaskName) {
  try {
    const { data: subtask, error } = await supabase
      .from('kanban_task_subtasks')
      .insert([{
        task_id: taskId,
        name: subtaskName,
      }])
      .select()
      .single();

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Update the subtask in all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) =>
            task.id === taskId 
              ? { 
                  ...task, 
                  subtasks: [...(task.subtasks || []), subtask]
                } 
              : task
          );
        });

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false
    );

    return subtask;
  } catch (error) {
    console.error('Error creating subtask:', error);
    throw error;
  }
}

export async function updateSubtask(subtaskId, updates) {
  try {
    const { error } = await supabase
      .from('kanban_task_subtasks')
      .update(updates)
      .eq('id', subtaskId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Update the subtask in all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) => ({
            ...task,
            subtasks: (task.subtasks || []).map((subtask) =>
              subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
            ),
          }));
        });

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false
    );
  } catch (error) {
    console.error('Error updating subtask:', error);
    throw error;
  }
}

export async function deleteSubtask(subtaskId) {
  try {
    const { error } = await supabase
      .from('kanban_task_subtasks')
      .delete()
      .eq('id', subtaskId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Remove the subtask from all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) => ({
            ...task,
            subtasks: (task.subtasks || []).filter((subtask) => subtask.id !== subtaskId),
          }));
        });

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false
    );
  } catch (error) {
    console.error('Error deleting subtask:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function updateTaskAssignees(taskId, assignees) {
  try {
    // First delete existing assignees
    const { error: deleteError } = await supabase
      .from('kanban_task_assignees')
      .delete()
      .eq('task_id', taskId);

    if (deleteError) throw deleteError;

    // Then insert new assignees
    if (assignees.length > 0) {
      const { error: insertError } = await supabase
        .from('kanban_task_assignees')
        .insert(
          assignees.map(assignee => ({
            task_id: taskId,
            user_id: assignee.id
          }))
        );

      if (insertError) throw insertError;
    }

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Update assignees in all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  assignee: assignees.map(user => ({
                    id: user.id,
                    name: user.name,
                    avatarUrl: user.avatarUrl,
                  })),
                }
              : task
          );
        });

        return {
          ...currentData,
          board: {
            ...board,
            tasks: updatedTasks,
          },
        };
      },
      false
    );
  } catch (error) {
    console.error('Error updating task assignees:', error);
    throw error;
  }
}
