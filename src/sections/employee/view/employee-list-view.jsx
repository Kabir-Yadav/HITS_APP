import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeItem } from '../employee-item';

// ----------------------------------------------------------------------

export function EmployeeListView() {
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(true);

  const confirm = useBoolean();

  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }

      setEmployeeList(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', deleteId);

      if (error) {
        console.error('Error deleting employee:', error);
        return;
      }

      await fetchEmployees();
      confirm.onFalse();
    } catch (error) {
      console.error('Error:', error);
    }
  }, [deleteId, confirm]);

  const handleDeleteRow = useCallback(
    (id) => {
      setDeleteId(id);
      confirm.onTrue();
    },
    [confirm]
  );

  const notFound = !employeeList.length && !loading;

  return (
    <Container maxWidth={false}>
      <CustomBreadcrumbs
        heading="Employees"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Employee', href: paths.dashboard.employee.root },
          { name: 'List' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.employee.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Employee
          </Button>
        }
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <Box sx={{ position: 'relative' }}>
        {loading && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              zIndex: 1,
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {notFound ? (
          <EmptyContent
            filled
            title="No Employees"
            sx={{
              py: 10,
            }}
          />
        ) : (
          <Grid container spacing={3}>
            {employeeList.map((employee) => (
              <Grid key={employee.id} xs={12} sm={6} md={4}>
                <EmployeeItem
                  employee={employee}
                  onDelete={() => handleDeleteRow(employee.id)}
                  editHref={paths.dashboard.employee.edit(`${employee.id}`)}
                  detailsHref={paths.dashboard.employee.details(`${employee.id}`)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        }
      />
    </Container>
  );
} 