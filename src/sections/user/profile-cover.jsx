import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export function ProfileCover({ sx, name, role, coverUrl, avatarUrl, ...other }) {
  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [
              `linear-gradient(0deg, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.8)}, ${varAlpha(theme.vars.palette.primary.darkerChannel, 0.8)})`,
              `url(${coverUrl})`,
            ],
          }),
          height: 280,
          color: 'common.white',
          position: 'relative',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          position: 'absolute',
          left: { xs: 24, md: 40 },
          bottom: { xs: 24, md: 40 },
          zIndex: 10,
        }}
      >
        <Avatar
          alt={name}
          src={avatarUrl}
          sx={{
            width: { xs: 80, md: 128 },
            height: { xs: 80, md: 128 },
            border: (theme) => `solid 3px ${theme.vars.palette.common.white}`,
            boxShadow: (theme) => theme.customShadows.z8,
          }}
        >
          {name?.charAt(0).toUpperCase()}
        </Avatar>

        <Typography 
          variant="h3" 
          component="div"
          sx={{ 
            ml: { xs: 2, md: 4 },
            color: 'common.white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.4)',
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            fontFamily: 'Playfair Display, serif',
            fontStyle: 'italic',
            fontWeight: 600,
            position: 'relative',
            '&:after': {
              content: '""',
              position: 'absolute',
              bottom: -8,
              left: 4,
              right: 4,
              height: 2,
              background: (theme) => alpha(theme.palette.common.white, 0.6),
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            },
            letterSpacing: '0.02em',
            transform: 'rotate(-2deg)',
          }}
        >
          {name}
        </Typography>
      </Box>

      <Typography
        variant="h5"
        sx={{
          position: 'absolute',
          right: { xs: 24, md: 40 },
          bottom: { xs: 24, md: 40 },
          color: 'common.white',
          textTransform: 'uppercase',
          opacity: 0.8,
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
          letterSpacing: 1,
        }}
      >
        {role}
      </Typography>
    </Box>
  );
}
