import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { useOffSetTop } from 'src/hooks/use-off-set-top';
import { useResponsive } from 'src/hooks/use-responsive';

import { bgBlur } from 'src/theme/css';

import { Logo } from 'src/components/logo';
import { Iconify } from 'src/components/iconify';
import { NAV, HEADER } from '../config-layout';

// ----------------------------------------------------------------------

export default function Header({ onOpenNav }) {
  const theme = useTheme();

  const lgUp = useResponsive('up', 'lg');

  const offset = useOffSetTop(HEADER.H_DESKTOP);

  const renderContent = (
    <>
      {!lgUp && (
        <IconButton onClick={onOpenNav} sx={{ mr: 1 }}>
          <Iconify icon="eva:menu-2-fill" />
        </IconButton>
      )}

      <Stack
        direction="row"
        alignItems="center"
        spacing={{
          xs: 0.5,
          sm: 1.5,
        }}
        sx={{ 
          ml: { xs: 1, sm: 2, lg: 4 }, 
          mr: 2,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Logo 
          sx={{ 
            width: 200, 
            height: 60,
            my: 1,
          }} 
        />
      </Stack>

      <Stack
        flexGrow={1}
        direction="row"
        alignItems="center"
        justifyContent="flex-end"
        spacing={{
          xs: 0.5,
          sm: 1.5,
        }}
        sx={{ mr: { xs: 1, sm: 2, lg: 3 } }}
      >
        {/* Add your header actions here */}
      </Stack>
    </>
  );

  return (
    <AppBar
      sx={{
        height: HEADER.H_MOBILE,
        zIndex: theme.zIndex.appBar + 1,
        ...bgBlur({
          color: theme.palette.background.default,
        }),
        transition: theme.transitions.create(['height'], {
          duration: theme.transitions.duration.shorter,
        }),
        ...(lgUp && {
          width: `calc(100% - ${NAV.WIDTH}px)`,
          height: HEADER.H_DESKTOP,
          ...(offset && {
            height: HEADER.H_DESKTOP_OFFSET,
          }),
        }),
      }}
    >
      <Toolbar
        sx={{
          height: 1,
          px: { lg: 5 },
          py: { xs: 1, md: 1.5 },
          backgroundColor: 'background.default',
          transition: theme.transitions.create(['height', 'background-color']),
        }}
      >
        {renderContent}
      </Toolbar>
    </AppBar>
  );
}

Header.propTypes = {
  onOpenNav: PropTypes.func,
}; 