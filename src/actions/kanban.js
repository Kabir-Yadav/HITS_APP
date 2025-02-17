import useSWR, { mutate } from 'swr';
import { useMemo, startTransition } from 'react';

import { supabase } from 'src/lib/supabase';
import axios, { fetcher, endpoints } from 'src/lib/axios';

// ----------------------------------------------------------------------

const enableServer = false;

const KANBAN_ENDPOINT = endpoints.kanban;

const swrOptions = {
  revalidateIfStale: enableServer,
  revalidateOnFocus: enableServer,
  revalidateOnReconnect: enableServer,
};

// ----------------------------------------------------------------------

export function useGetBoard() {
  const { data, isLoading, error, isValidating } = useSWR(
    'kanban-board',
    async () => {
      // Fetch columns
      const { data: columns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .order('position');

      if (columnsError) throw columnsError;

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('kanban_task_details')
        .select('*');

      if (tasksError) throw tasksError;

      // Organize tasks by column
      const tasks = columns.reduce((acc, column) => {
        acc[column.id] = tasksData
          .filter(task => task.column_id === column.id)
          .sort((a, b) => a.position - b.position);
        return acc;
      }, {});

      return {
        board: {
          columns,
          tasks
        }
      };
    }
  );

  const memoizedValue = useMemo(
    () => ({
      board: {
        tasks: data?.board.tasks ?? {},
        columns: data?.board.columns ?? []
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
  const { data: columns } = await supabase
    .from('kanban_columns')
    .select('position')
    .order('position', { ascending: false })
    .limit(1);

  const position = (columns?.[0]?.position || 0) + 1;

  const { data, error } = await supabase
    .from('kanban_columns')
    .insert([{ ...columnData, position }])
    .select()
    .single();

  if (error) throw error;

  mutate('kanban-board');
  return data;
}

// ----------------------------------------------------------------------

export async function updateColumn(columnId, columnName) {
  const { error } = await supabase
    .from('kanban_columns')
    .update({ name: columnName })
    .eq('id', columnId);

  if (error) throw error;

  mutate('kanban-board');
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

// ----------------------------------------------------------------------

export async function deleteColumn(columnId) {
  const { error } = await supabase
    .from('kanban_columns')
    .delete()
    .eq('id', columnId);

  if (error) throw error;

  mutate('kanban-board');
}

// ----------------------------------------------------------------------

export async function createTask(columnId, taskData) {
  const { data: tasks } = await supabase
    .from('kanban_tasks')
    .select('position')
    .eq('column_id', columnId)
    .order('position', { ascending: false })
    .limit(1);

  const position = (tasks?.[0]?.position || 0) + 1;

  const { data, error } = await supabase
    .from('kanban_tasks')
    .insert([{ 
      ...taskData,
      column_id: columnId,
      position,
      created_by: supabase.auth.user()?.id
    }])
    .select()
    .single();

  if (error) throw error;

  // Handle assignees if any
  if (taskData.assignee?.length) {
    const assigneeData = taskData.assignee.map(user => ({
      task_id: data.id,
      user_id: user.id
    }));

    const { error: assigneeError } = await supabase
      .from('kanban_task_assignees')
      .insert(assigneeData);

    if (assigneeError) throw assigneeError;
  }

  mutate('kanban-board');
  return data;
}

// ----------------------------------------------------------------------

export async function updateTask(columnId, taskData) {
  const { error } = await supabase
    .from('kanban_tasks')
    .update({
      name: taskData.name,
      description: taskData.description,
      priority: taskData.priority,
      due_date: taskData.due[0]
    })
    .eq('id', taskData.id);

  if (error) throw error;

  // Update assignees
  if (taskData.assignee) {
    // Remove existing assignees
    await supabase
      .from('kanban_task_assignees')
      .delete()
      .eq('task_id', taskData.id);

    // Add new assignees
    const assigneeData = taskData.assignee.map(user => ({
      task_id: taskData.id,
      user_id: user.id
    }));

    if (assigneeData.length) {
      const { error: assigneeError } = await supabase
        .from('kanban_task_assignees')
        .insert(assigneeData);

      if (assigneeError) throw assigneeError;
    }
  }

  mutate('kanban-board');
}

// ----------------------------------------------------------------------

export async function moveTask(updateTasks) {
  /**
   * Work in local
   */
  startTransition(() => {
    mutate(
      KANBAN_ENDPOINT,
      (currentData) => {
        const { board } = currentData;

        // Find the column containing the task and update its status
        Object.keys(updateTasks).forEach((columnId) => {
          updateTasks[columnId] = updateTasks[columnId].map(task => ({
            ...task,
            status: board.columns.find(col => col.id === columnId)?.name || task.status
          }));
        });

        return { 
          ...currentData, 
          board: { 
            ...board, 
            tasks: updateTasks 
          } 
        };
      },
      false
    );
  });

  /**
   * Work on server
   */
  if (enableServer) {
    const data = { updateTasks };
    await axios.post(KANBAN_ENDPOINT, data, { params: { endpoint: 'move-task' } });
  }
}

// ----------------------------------------------------------------------

export async function deleteTask(columnId, taskId) {
  const { error } = await supabase
    .from('kanban_tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw error;

  mutate('kanban-board');
}

// ----------------------------------------------------------------------

export async function moveTaskBetweenColumns(task, sourceColumnId, targetColumnId) {
  const { error } = await supabase.rpc('move_task_between_columns', {
    p_task_id: task.id,
    p_source_column_id: sourceColumnId,
    p_target_column_id: targetColumnId
  });

  if (error) throw error;

  mutate('kanban-board');
}
