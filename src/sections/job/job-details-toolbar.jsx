import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function JobDetailsToolbar({ backHref, editHref, isActive, canEdit }) {
  return (
    <Stack
      spacing={3}
      direction={{ xs: 'column', md: 'row' }}
      sx={{
        mb: { xs: 3, md: 5 },
      }}
    >
      <Stack spacing={1} direction="row" alignItems="flex-start">
        <Button
          component={RouterLink}
          href={backHref}
          startIcon={<Iconify icon="eva:arrow-ios-back-fill" width={16} />}
        >
          Back
        </Button>
      </Stack>

      <Box sx={{ flexGrow: 1 }} />

      <Stack spacing={1.5} direction="row">
        {canEdit && (
          <Button
            component={RouterLink}
            href={editHref}
            startIcon={<Iconify icon="solar:pen-bold" />}
          >
            Edit
          </Button>
        )}

        <Button
          variant="soft"
          color={isActive ? 'success' : 'error'}
          startIcon={
            <Iconify
              icon={isActive ? 'eva:checkmark-circle-2-fill' : 'solar:clock-circle-bold'}
            />
          }
          sx={{
            ...(isActive && {
              bgcolor: (theme) => alpha(theme.palette.success.main, 0.08),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.success.main, 0.16),
              },
            }),
            ...(!isActive && {
              bgcolor: (theme) => alpha(theme.palette.error.main, 0.08),
              '&:hover': {
                bgcolor: (theme) => alpha(theme.palette.error.main, 0.16),
              },
            }),
          }}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Button>
      </Stack>
    </Stack>
  );
}

JobDetailsToolbar.propTypes = {
  backHref: PropTypes.string,
  editHref: PropTypes.string,
  isActive: PropTypes.bool,
  canEdit: PropTypes.bool,
};
