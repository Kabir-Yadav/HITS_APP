import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { supabase } from 'src/lib/supabase';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeForm } from 'src/sections/employee/employee-form';

// ----------------------------------------------------------------------

export default function EmployeeEditPage() {
  const { id } = useParams();

  const [currentEmployee, setCurrentEmployee] = useState(null);

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching employee:', error);
        return;
      }

      setCurrentEmployee(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <>
      <Helmet>
        <title> Employee: Edit employee</title>
      </Helmet>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Edit employee"
          links={[
            {
              name: 'Dashboard',
              href: paths.dashboard.root,
            },
            {
              name: 'Employee',
              href: paths.dashboard.employee.root,
            },
            { name: currentEmployee?.first_name },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <EmployeeForm currentEmployee={currentEmployee} />
      </Container>
    </>
  );
} 