import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { fDate } from 'src/utils/format-time';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
// ----------------------------------------------------------------------

export function AppUpcomingBirthdays({ title, subheader, list, sx, ...other }) {
  return (
    <Card
      sx={[
        (theme) => ({
          borderRadius: 2,
          position: 'relative',
          color: 'common.white',
          backgroundImage: `linear-gradient(135deg, ${theme.vars.palette.primary.main}, ${theme.vars.palette.primary.dark})`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          mr: 2,
          ml: 2,
          mt: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ whiteSpace: 'pre-line', fontSize: 33, fontWeight: 'Bold' }}>{title}</Box>

        <Box
          component="img"
          alt="Birthday"
          src={`${CONFIG.assetsDir}/assets/images/home/birthday.png`}
          sx={{
            width: 130,
            height: 120,
          }}
        />
      </Box>
      <Scrollbar
        sx={{
          maxHeight: 250,
          transition: 'min-height .3s ease-in-out',
        }}
      >
        <Box
          sx={{
            p: 2,
            gap: 1,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {list.map((item) => (
            <Item key={item.id} item={item} />
          ))}
        </Box>
      </Scrollbar>
    </Card>
  );
}

function Item({ item, sx, ...other }) {
  // Calculate relative time in months if days are >= 30.
  let relativeText = '';
  if (item.daysUntilBirthday === 0) {
    // No relative text here when today because we show confetti.
    relativeText = '';
  } else if (item.daysUntilBirthday >= 30) {
    const months = Math.round(item.daysUntilBirthday / 30);
    relativeText = `in ${months} month${months !== 1 ? 's' : ''}`;
  } else {
    relativeText = `in ${item.daysUntilBirthday} day${item.daysUntilBirthday !== 1 ? 's' : ''}`;
  }

  return (
    <Box
      sx={[{ gap: 2, display: 'flex', alignItems: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <Avatar alt={item.name} src={item.avatar_url} sx={{ width: 40, height: 40 }} />
      <Box flexGrow={1}>
        <Box sx={{ typography: 'subtitle1' }}>{item.name}</Box>
        <Box
          sx={{
            gap: 0.5,
            mt: 0.5,
            alignItems: 'center',
            typography: 'caption',
            display: 'inline-flex',
            color: 'text',
          }}
        >
          <Iconify icon="solar:calendar-bold-duotone" width={22} />
          {/* Always show formatted date of birth */}
          <Typography variant="caption" sx={{ ml: 1 }}>
            {fDate(item.date_of_birth, 'DD MMM YYYY')}
          </Typography>
        </Box>
      </Box>
      {item.daysUntilBirthday === 0 ? (
        // Enhanced confetti icon with attractive glow and animation
        <Box 
          sx={{
            position: 'relative',
            cursor: 'pointer',
            transition: 'transform 0.3s',
            '&:hover': {
              transform: 'scale(1.2)',
            },
            animation: 'pulse 1.5s infinite',
            '@keyframes pulse': {
              '0%': {
                transform: 'scale(1)',
              },
              '50%': {
                transform: 'scale(1.15)',
              },
              '100%': {
                transform: 'scale(1)',
              },
            },
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: '50%',
              background: (theme) => `radial-gradient(circle, ${theme.vars.palette.warning.light} 0%, rgba(255,255,255,0) 70%)`,
              filter: 'blur(6px)',
              opacity: 0.8,
              animation: 'glow 2s infinite',
              '@keyframes glow': {
                '0%': {
                  opacity: 0.7,
                  transform: 'scale(1)',
                },
                '50%': {
                  opacity: 1,
                  transform: 'scale(1.3)',
                },
                '100%': {
                  opacity: 0.7,
                  transform: 'scale(1)',
                },
              },
            }}
          />
          <Iconify
            icon="noto:party-popper"
            width={30}
            height={30}
            sx={{
              position: 'relative',
              zIndex: 1,
              filter: 'drop-shadow(0 0 3px rgba(255,215,0,0.7))',
            }}
          />
        </Box>
      ) : (
        // Otherwise, show relative time (in months if applicable, else days)
        <Typography variant="caption" sx={{ color: 'grey.400' }}>{relativeText}</Typography>
      )}
    </Box>
  );
}
