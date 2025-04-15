import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';

import { useGetUnreadCount } from 'src/actions/mail';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const LABEL_ICONS = {
  all: 'fluent:mail-24-filled',
  inbox: 'solar:inbox-bold',
  unread: 'solar:inbox-unread-bold',
  trash: 'solar:trash-bin-trash-bold',
  drafts: 'solar:file-text-bold',
  spam: 'solar:danger-bold',
  sent: 'iconamoon:send-fill',
  starred: 'eva:star-fill',
  important: 'material-symbols:label-important-rounded',
  social: 'solar:tag-horizontal-bold-duotone',
  promotions: 'solar:tag-horizontal-bold-duotone',
  forums: 'solar:tag-horizontal-bold-duotone',
};

// ----------------------------------------------------------------------

export function MailNavItem({ selected, label, onClickNavItem, ...other }) {
  const { unreadCount } = useGetUnreadCount();

  const labelIcon = LABEL_ICONS[label.id];

  return (
    <Box component="li" sx={{ display: 'flex' }}>
      <ListItemButton
        disableGutters
        onClick={onClickNavItem}
        sx={{
          pl: 1,
          pr: 1.5,
          gap: 2,
          borderRadius: 0.75,
          color: 'text.secondary',
          ...(selected && { color: 'text.primary' }),
        }}
        {...other}
      >
        <Iconify icon={labelIcon} width={22} sx={{ color: label.color }} />

        <Box
          component="span"
          sx={{
            flexGrow: 1,
            textTransform: 'capitalize',
            typography: selected ? 'subtitle2' : 'body2',
          }}
        >
          {label.name}
        </Box>

        {label.id === 'unread' && unreadCount > 0 && (
          <Box component="span" sx={{ typography: 'caption' }}>
            {unreadCount}
          </Box>
        )}
      </ListItemButton>
    </Box>
  );
}
