import { orderBy } from 'es-toolkit';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Avatar from '@mui/material/Avatar';
import CardHeader from '@mui/material/CardHeader';

import { fShortenNumber } from 'src/utils/format-number';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
// ----------------------------------------------------------------------

export function AppUpcomingBirthdays({ title, subheader, list, sx, ...other }) {
  return (
    <Card sx={[
      (theme) => ({
        borderRadius: 2,
        position: 'relative',
        color: 'common.white',
        backgroundImage: `linear-gradient(135deg, ${theme.vars.palette.primary.main}, ${theme.vars.palette.primary.dark})`,
      }),
      ...(Array.isArray(sx) ? sx : [sx]),
    ]} {...other}>
      <Box sx={{
        mr: 2,
        ml: 2,
        mt: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>

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
      <Box
        sx={{
          p: 2,
          gap: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {orderBy(list, ['totalFavorites'], ['desc']).map((item, index) => (
          <Item key={item.id} item={item} index={index} />
        ))}
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

function Item({ item, index, sx, ...other }) {
  return (
    <Box
      sx={[{ gap: 2, display: 'flex', alignItems: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    >
      <Avatar alt={item.name} src={item.avatarUrl}
        sx={{ width: 40, height: 40 }} />

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
          {fShortenNumber(item.totalFavorites)}
        </Box>
      </Box>
    </Box>
  );
}
