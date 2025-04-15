import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';

import { useGetUnreadCount } from 'src/actions/mail';

// Styled component for the label
const StyledLabel = styled(Chip)(({ theme }) => ({
  height: 24,
  minWidth: 24,
  borderRadius: 12,
  padding: theme.spacing(0, 0.75),
  '& .MuiChip-label': {
    padding: 0,
  },
}));

export function MailNavLabel() {
  const { unreadCount } = useGetUnreadCount();
  
  if (unreadCount === 0) {
    return null;
  }

  return (
    <StyledLabel
      size="small"
      color="error"
      variant="filled"
      label={unreadCount}
    />
  );
} 