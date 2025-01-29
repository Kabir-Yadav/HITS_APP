import { Helmet } from 'react-helmet-async';

import { Container } from '@mui/material';

import { paths } from 'src/routes/paths';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeForm } from 'src/sections/employee/employee-form';

// ----------------------------------------------------------------------

export default function EmployeeCreatePage() {
  return (
    <>
      <Helmet>
        <title> Employee: Create a new employee</title>
      </Helmet>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Create a new employee"
          links={[
            {
              name: 'Dashboard',
              href: paths.dashboard.root,
            },
            {
              name: 'Employee',
              href: paths.dashboard.employee.root,
            },
            { name: 'New employee' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <EmployeeForm />
      </Container>
    </>
  );
} 