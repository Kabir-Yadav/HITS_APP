import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import { Button, IconButton, MenuItem, MenuList } from '@mui/material';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

import { CollapseButton } from './styles';

// ----------------------------------------------------------------------

export function ChatRoomSingle({ participant }) {
  const collapse = useBoolean(true);

  const router = useRouter();
  const menuActions = usePopover();

  const handleview = () => {
    router.push(paths.dashboard.user.cards)
    menuActions.onClose();
  };

  const renderInfo = () => (
    <Box sx={{ position: 'relative', pb: 3, pt: 5 }}>
      <IconButton
        color={menuActions.open ? 'inherit' : 'default'}
        onClick={menuActions.onOpen}
        sx={{ position: 'absolute', top: '10%', right: 8, transform: 'rotate(90deg)' }}
      >
        <Iconify icon="solar:menu-dots-bold-duotone" />
      </IconButton>
      <Stack alignItems="center">
        <Avatar
          alt={participant?.name}
          src={participant?.avatarUrl}
          sx={{ width: 96, height: 96, mb: 2 }}
        />
        <Typography variant="subtitle1">{participant?.name}</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, mb: 2 }}>
          {participant?.role}
        </Typography>
      </Stack>
    </Box>
  );

  const renderContact = () => (
    <Stack spacing={2} sx={{ px: 2, py: 2.5 }}>
      {[
        { icon: 'solar:phone-bold', value: participant?.phoneNumber },
        { icon: 'fluent:mail-24-filled', value: participant?.email },
      ].map((item) => (
        <Box
          key={item.icon}
          sx={{
            gap: 1,
            display: 'flex',
            typography: 'body2',
            wordBreak: 'break-all',
          }}
        >
          <Iconify icon={item.icon} sx={{ flexShrink: 0, color: 'text.disabled' }} />
          {item.value}
        </Box>
      ))}
    </Stack>
  );

  return (
    <>
      {renderInfo()}

      <CollapseButton selected={collapse.value} onClick={collapse.onToggle}>
        Information
      </CollapseButton>

      <Collapse in={collapse.value}>{renderContact()}</Collapse>
      <CustomPopover
        open={menuActions.open}
        anchorEl={menuActions.anchorEl}
        onClose={menuActions.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem onClick={handleview}>
            <Iconify icon="solar:user-circle-bold" />
            View Profile
          </MenuItem>
        </MenuList>
      </CustomPopover>
    </>
  );
}
