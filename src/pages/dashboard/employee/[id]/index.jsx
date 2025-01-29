import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';

import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { supabase } from 'src/lib/supabase';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeDetails } from 'src/sections/employee/employee-details';

// ----------------------------------------------------------------------

export default function EmployeeDetailsPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

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

      setEmployee(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  if (loading) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title> Employee: {employee?.first_name} {employee?.last_name}</title>
      </Helmet>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Employee Details"
          links={[
            {
              name: 'Dashboard',
              href: paths.dashboard.root,
            },
            {
              name: 'Employee',
              href: paths.dashboard.employee.root,
            },
            { name: employee?.first_name },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <EmployeeDetails employee={employee} />
      </Container>
    </>
  );
} 