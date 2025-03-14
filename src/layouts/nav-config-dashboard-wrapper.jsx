import { useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';

import { useGetBoard } from 'src/actions/kanban';

import { useAuthContext } from 'src/auth/hooks';

import { navData as staticNavData } from './nav-config-dashboard';

// Custom styled counter component
const Counter = (count) => (
  <Box
    component="span"
    sx={{
      ml: 1,
      height: 20,
      minWidth: 20,
      lineHeight: 0,
      borderRadius: 10,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: 'warning.lighter',
      color: 'warning.darker',
      px: 1,
      fontSize: 12,
      fontWeight: 'bold',
    }}
  >
    {`+${count}`}
  </Box>
);

export function useNavData() {
  const { user } = useAuthContext();
  const { board } = useGetBoard();

  // Calculate total tasks assigned to user across all columns (except Archive)
  const totalAssignedTasks = useMemo(() => {
    if (!board || !user) return 0;

    return Object.entries(board.tasks).reduce((total, [columnId, columnTasks]) => {
      // Find the column name for this columnId
      const column = board.columns.find(col => col.id === columnId);
      
      // Skip if column is Archive
      if (column?.name === 'Archive') return total;

      // Count tasks assigned to user in this column
      const assignedTasks = columnTasks.filter(task => 
        task.assignee?.some(assignee => assignee.id === user.id) || 
        task.reporter?.id === user.id
      );
      
      return total + assignedTasks.length;
    }, 0);
  }, [board, user]);

  // Clone and modify the static nav data
  const navData = useMemo(() => {
    const newNavData = [...staticNavData];
    
    // Find the services section
    const servicesSection = newNavData.find(section => section.subheader === 'Services');
    if (servicesSection) {
      // Find and update the Kanban item
      const kanbanItem = servicesSection.items.find(item => item.title === 'Kanban');
      if (kanbanItem && totalAssignedTasks > 0) {
        // Apply the styled counter
        kanbanItem.info = Counter(totalAssignedTasks);
      }
    }

    return newNavData;
  }, [totalAssignedTasks]);

  return navData;
} 