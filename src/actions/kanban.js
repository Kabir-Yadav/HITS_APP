import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { useMemo, startTransition, useEffect } from 'react';

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
      try {
        console.log('Fetching kanban board data...');

        // Fetch columns ordered by position with detailed logging
        const columnsQuery = supabase
          .from('kanban_columns')
          .select('*')
          .order('position');
        
        console.log('Columns query:', columnsQuery.toString());

        const { data: columns, error: columnsError, status: columnsStatus } = await columnsQuery;

        console.log('Columns response:', {
          status: columnsStatus,
          data: columns,
          error: columnsError,
          count: columns?.length || 0
        });

        if (columnsError) {
          console.error('Error fetching columns:', columnsError);
          throw columnsError;
        }

        if (!columns || columns.length === 0) {
          console.log('No columns found in the database');
          return {
            board: {
              columns: [],
              tasks: {},
            },
          };
        }

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

        // Log tasks result  
        console.log('Tasks:', tasksData);
        console.log('Tasks error:', tasksError);

        if (tasksError) {
          console.error('Error fetching tasks:', tasksError);
          throw tasksError;
        }

        // Initialize tasks object with empty arrays for all columns
        const tasks = columns.reduce((acc, column) => {
          acc[column.id] = [];
          return acc;
        }, {});

        // Organize tasks by column
        if (tasksData) {
          tasksData.forEach(task => {
            if (task.column_id && Object.prototype.hasOwnProperty.call(tasks, task.column_id)) {
              tasks[task.column_id].push({
                id: task.id,
                name: task.name,
                description: task.description,
                priority: task.priority,
                status: columns.find(col => col.id === task.column_id)?.name || '',
                column_id: task.column_id,
                due: [task.due_start, task.due_end],
                assignee: task.assignees?.map(({ user }) => ({
                  id: user.id,
                  name: user.name || user.email,
                  email: user.email,
                  avatarUrl: user.avatar_url,
                })) || [],
                attachments: task.attachments?.map(att => ({
                  id: att.id,
                  file_name: att.file_name,
                  file_url: att.file_url,
                  file_type: att.file_type,
                  file_size: att.file_size,
                })) || [],
                reporter: task.reporter ? {
                  id: task.reporter.id,
                  name: task.reporter.name || task.reporter.email,
                  email: task.reporter.email,
                  avatarUrl: task.reporter.avatar_url,
                } : null,
                subtasks: task.subtasks || [],
              });
            }
          });
        }

        return {
          board: {
            columns,
            tasks,
          },
        };
      } catch (fetchError) {
        console.error('Error fetching board:', fetchError);
        throw fetchError;
      }
    },
    {
      ...swrOptions,
      refreshInterval: 2000, // Refresh every 2 seconds
      revalidateOnFocus: true, // Revalidate when window regains focus
      revalidateOnReconnect: true, // Revalidate when reconnected to network
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
    // First get the task's attachments before deletion
    const { data: attachments } = await supabase
      .from('kanban_task_attachments')
      .select('file_url')
      .eq('task_id', taskId);

    // Delete task from database
    // This will automatically cascade delete:
    // - kanban_task_assignees
    // - kanban_task_attachments 
    // - kanban_task_subtasks
    const { error } = await supabase
      .from('kanban_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    // Delete attachment files from storage
    if (attachments?.length) {
      const filesToDelete = attachments.map(att => {
        // Extract filename from the URL
        // Example URL: https://.../storage/v1/object/public/kanban-attachments/taskId/filename.jpg
        const urlParts = att.file_url.split('/');
        return `${taskId}/${urlParts[urlParts.length - 1]}`;
      });

      const { error: storageError } = await supabase.storage
        .from('kanban-attachments')
        .remove(filesToDelete);

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

      // Create notifications for new assignees
      await createTaskAssignmentNotification(
        taskId,
        assignees[0].name, // We already have the task name from the first assignee
        assignees.map(a => a.id)
      );
    }

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

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

// ----------------------------------------------------------------------

export async function updateTaskName(taskId, newName) {
  try {
    const { error } = await supabase
      .from('kanban_tasks')
      .update({ name: newName })
      .eq('id', taskId);

    if (error) throw error;

    // Update local state
    mutate(
      KANBAN_CACHE_KEY,
      (currentData) => {
        const { board } = currentData;
        const updatedTasks = {};

        // Update task name in all columns
        Object.keys(board.tasks).forEach((columnId) => {
          updatedTasks[columnId] = board.tasks[columnId].map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  name: newName,
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
    console.error('Error updating task name:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------

export async function testKanbanQueries() {
  // Test columns
  const { data: columns, error: columnsError } = await supabase
    .from('kanban_columns')
    .select('*');
  
  console.log('Test columns:', columns);
  console.log('Test columns error:', columnsError);

  // Test tasks
  const { data: tasks, error: tasksError } = await supabase
    .from('kanban_tasks')
    .select('*');

  console.log('Test tasks:', tasks);
  console.log('Test tasks error:', tasksError);
}

export async function testColumnQuery() {
  try {
    console.log('Testing direct column query...');
    
    // Test direct query with detailed logging
    const query = supabase
      .from('kanban_columns')
      .select('*')
      .order('position');
    
    console.log('Query string:', query.toString());
    
    const { data, error, status } = await query;
    
    console.log('Query response:', {
      status,
      data,
      error,
      count: data?.length || 0
    });

    if (error) {
      console.error('Query error:', error);
    } else if (!data || data.length === 0) {
      console.log('No data returned from query');
    } else {
      console.log('Found columns:', data);
    }

  } catch (error) {
    console.error('Test query error:', error);
  }
}

export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test the connection by getting the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    console.log('Connection test results:', {
      isConnected: !error,
      user: user ? 'Authenticated' : 'Not authenticated',
      error
    });

    return !error;
  } catch (error) {
    console.error('Connection test error:', error);
    return false;
  }
}

export async function createTaskAssignmentNotification(taskId, taskName, assigneeIds) {
  try {
    // First get the task details to ensure we have the latest information
    const { data: taskData, error: taskError } = await supabase
      .from('kanban_tasks')
      .select(`
        *,
        reporter:user_profiles!kanban_tasks_reporter_id_fkey(*)
      `)
      .eq('id', taskId)
      .single();

    if (taskError) throw taskError;

    const notifications = assigneeIds.map(userId => ({
      user_id: userId,
      task_id: taskId,
      task_name: taskData.name,
      notification_type: 'task_assigned',
      message: `New task assigned: ${taskData.name}`,
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('kanban_notifications')
      .insert(notifications);

    if (error) throw error;

    return notifications;
  } catch (error) {
    console.error('Error creating task assignment notification:', error);
    throw error;
  }
}

export function useKanbanNotifications(userId) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // If no userId, return cleanup function early
    if (!userId) {
      return () => {}; // Return empty cleanup function
    }

    let mounted = true; // Add mounted flag for cleanup

    // Initial fetch of notifications
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('kanban_notifications')
          .select(`
            *,
            task:kanban_tasks!inner(
              id,
              name,
              description,
              priority,
              column_id,
              reporter:user_profiles!kanban_tasks_reporter_id_fkey(
                id,
                email,
                name,
                avatar_url
              ),
              assignees:kanban_task_assignees(
                user:user_profiles(
                  id,
                  email,
                  name,
                  avatar_url
                )
              )
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching notifications:', error);
          return;
        }

        if (mounted) {
          setNotifications(data || []);
        }
      } catch (error) {
        console.error('Error in fetchNotifications:', error);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notifications
    const subscription = supabase
      .channel('kanban_notifications')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'kanban_notifications',
        filter: `user_id=eq.${userId}`,
      }, async (payload) => {
        if (!mounted) return;

        if (payload.eventType === 'INSERT') {
          // Fetch the complete notification data with task details
          const { data, error } = await supabase
            .from('kanban_notifications')
            .select(`
              *,
              task:kanban_tasks!inner(
                id,
                name,
                description,
                priority,
                column_id,
                reporter:user_profiles!kanban_tasks_reporter_id_fkey(
                  id,
                  email,
                  name,
                  avatar_url
                ),
                assignees:kanban_task_assignees(
                  user:user_profiles(
                    id,
                    email,
                    name,
                    avatar_url
                  )
                )
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && mounted) {
            setNotifications(prev => [data, ...prev]);
          }
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      })
      .subscribe();

    // Return cleanup function
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [userId]);

  const deleteNotification = async (notificationId) => {
    try {
      // Update local state immediately before the API call
      setNotifications(prev => prev.filter(n => n.id !== notificationId));

      const { error } = await supabase
        .from('kanban_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        // If there's an error, revert the state change
        const { data } = await supabase
          .from('kanban_notifications')
          .select('*')
          .eq('id', notificationId)
          .single();
          
        if (data) {
          setNotifications(prev => [data, ...prev]);
        }
        throw error;
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  };

  return { notifications, deleteNotification };
}
