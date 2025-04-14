import { useEffect, useMemo } from 'react';

import Box from '@mui/material/Box';

import { useUnreadChat } from 'src/actions/chat';
import { useGetBoard } from 'src/actions/kanban';
import { useGetUnreadCount } from 'src/actions/mail';

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
      bgcolor: 'info.lighter',
      color: 'info.darker',
      px: 1,
      fontSize: 12,
      fontWeight: 'bold',
    }}
  >
    {count}
  </Box>
);

export function useNavData() {
  const { user } = useAuthContext();
  const { board } = useGetBoard();
  const { unreadCount } = useGetUnreadCount();
  const { unreadChatCount, isLoading, error } = useUnreadChat(user.id);

  // Calculate total tasks assigned to user across all columns (except Archive)
  const totalAssignedTasks = useMemo(() => {
    if (!board || !user) return 0;

    return Object.entries(board.tasks).reduce((total, [columnId, columnTasks]) => {
      // Find the column name for this columnId
      const column = board.columns.find((col) => col.id === columnId);

      // Skip if column is Archive
      if (column?.name === 'Archive') return total;

      // Count tasks assigned to user in this column
      const assignedTasks = columnTasks.filter(
        (task) =>
          task.assignee?.some((assignee) => assignee.id === user.id) ||
          task.reporter?.id === user.id
      );

      return total + assignedTasks.length;
    }, 0);
  }, [board, user]);

  // Clone and modify the static nav data
  const navData = useMemo(() => {
    const newNavData = [...staticNavData];

    // Find the services section
    const servicesSection = newNavData.find((section) => section.subheader === 'Services');
    if (servicesSection) {
      // Find and update the Kanban item
      const kanbanItem = servicesSection.items.find((item) => item.title === 'Kanban');
      if (kanbanItem && totalAssignedTasks > 0) {
        kanbanItem.info = Counter(totalAssignedTasks);
      }

      const chatItem = servicesSection.items.find((item) => item.title === 'Chat');
      if (chatItem && unreadChatCount > 0) {
        chatItem.info = Counter(unreadChatCount);
      }

      // Find and update the Mail item with unread count
      const mailItem = servicesSection.items.find((item) => item.title === 'Mail');
      if (mailItem && unreadCount > 0) {
        mailItem.info = Counter(unreadCount);
      }
    }

    return newNavData;
  }, [totalAssignedTasks, unreadCount,unreadChatCount]);

  return navData;
}
