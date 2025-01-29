import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function EmployeeDetails({ employee }) {
  const renderInfo = (
    <Stack spacing={2} sx={{ p: 3 }}>
      <Typography variant="h4">
        {employee.first_name} {employee.last_name}
      </Typography>

      <Stack spacing={2}>
        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Department
          </Typography>
          <Typography variant="body2">{employee.department}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Email
          </Typography>
          <Typography variant="body2">{employee.email}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Phone Number
          </Typography>
          <Typography variant="body2">{employee.phone_number}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Salary
          </Typography>
          <Typography variant="body2">{fCurrency(employee.salary)}</Typography>
        </Stack>

        <Stack spacing={1}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            Joining Date
          </Typography>
          <Typography variant="body2">{fDate(employee.joining_date)}</Typography>
        </Stack>
      </Stack>
    </Stack>
  );

  return (
    <>
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          md: 'repeat(3, 1fr)',
        }}
        gap={3}
      >
        <Card>{renderInfo}</Card>
      </Box>

      <Stack direction="row" justifyContent="flex-end" spacing={2} sx={{ mt: 3 }}>
        <Button
          component={RouterLink}
          href={paths.dashboard.employee.edit(employee.id)}
          variant="contained"
          startIcon={<Iconify icon="eva:edit-fill" />}
        >
          Edit
        </Button>
      </Stack>
    </>
  );
}

EmployeeDetails.propTypes = {
  employee: PropTypes.object,
}; 