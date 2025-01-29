import { useState } from 'react';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function EmployeeItem({ employee, editHref, detailsHref, onDelete, sx, ...other }) {
  const [menuOpen, setMenuOpen] = useState(null);

  const handleOpenMenu = (event) => {
    setMenuOpen(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setMenuOpen(null);
  };

  const renderMenuActions = () => (
    <CustomPopover
      open={Boolean(menuOpen)}
      anchorEl={menuOpen}
      onClose={handleCloseMenu}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: { sx: { width: 160 } },
        arrow: { placement: 'right-top' }
      }}
    >
      <MenuItem component={RouterLink} href={detailsHref} onClick={handleCloseMenu}>
        <Iconify icon="eva:eye-fill" />
        View
      </MenuItem>

      <MenuItem component={RouterLink} href={editHref} onClick={handleCloseMenu}>
        <Iconify icon="eva:edit-fill" />
        Edit
      </MenuItem>

      <MenuItem
        onClick={() => {
          handleCloseMenu();
          onDelete();
        }}
        sx={{ color: 'error.main' }}
      >
        <Iconify icon="eva:trash-2-fill" />
        Delete
      </MenuItem>
    </CustomPopover>
  );

  return (
    <>
      <Card sx={sx} {...other}>
        <IconButton onClick={handleOpenMenu} sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>

        <Box sx={{ p: 3, pb: 2 }}>
          <Stack sx={{ mb: 2 }}>
            <Typography variant="subtitle1" component="div" noWrap>
              <Link component={RouterLink} href={detailsHref} color="inherit">
                {employee.first_name} {employee.last_name}
              </Link>
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {employee.employee_id} - {employee.department}
            </Typography>
          </Stack>

          <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="eva:phone-fill" width={16} sx={{ flexShrink: 0 }} />
              <Typography variant="body2" component="span">
                {employee.phone_number}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="eva:email-fill" width={16} sx={{ flexShrink: 0 }} />
              <Typography variant="body2" component="span">
                {employee.email}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Iconify icon="eva:credit-card-fill" width={16} sx={{ flexShrink: 0 }} />
              <Typography variant="body2" component="span">
                {fCurrency(employee.salary)}
              </Typography>
            </Stack>
          </Stack>

          <ListItemText
            secondary={`Joined: ${fDate(employee.joining_date)}`}
            slotProps={{
              secondary: {
                sx: { mt: 2, typography: 'caption', color: 'text.disabled' },
              },
            }}
          />
        </Box>
      </Card>

      {renderMenuActions()}
    </>
  );
}

EmployeeItem.propTypes = {
  employee: PropTypes.object,
  onDelete: PropTypes.func,
  editHref: PropTypes.string,
  detailsHref: PropTypes.string,
  sx: PropTypes.object,
}; 