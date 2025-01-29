import * as Yup from 'yup';
import { useEffect } from 'react';
import PropTypes from 'prop-types';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import LoadingButton from '@mui/lab/LoadingButton';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';

import { RHFTextField } from 'src/components/hook-form';
import { FormProvider } from 'src/components/hook-form/form-provider';

// ----------------------------------------------------------------------

export function EmployeeForm({ currentEmployee }) {
  const router = useRouter();

  const NewEmployeeSchema = Yup.object().shape({
    first_name: Yup.string().required('First name is required'),
    last_name: Yup.string().required('Last name is required'),
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
    department: Yup.string().required('Department is required'),
    phone_number: Yup.string().required('Phone number is required'),
    salary: Yup.number().required('Salary is required').positive('Salary must be positive'),
    joining_date: Yup.date().required('Joining date is required'),
  });

  const defaultValues = {
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    phone_number: '',
    salary: '',
    joining_date: new Date().toISOString().split('T')[0],
  };

  const methods = useForm({
    resolver: yupResolver(NewEmployeeSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentEmployee) {
      reset({
        first_name: currentEmployee.first_name || '',
        last_name: currentEmployee.last_name || '',
        email: currentEmployee.email || '',
        department: currentEmployee.department || '',
        phone_number: currentEmployee.phone_number || '',
        salary: currentEmployee.salary || '',
        joining_date: currentEmployee.joining_date || new Date().toISOString().split('T')[0],
      });
    }
  }, [currentEmployee, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (currentEmployee) {
        // Update existing employee
        const { error } = await supabase
          .from('employees')
          .update({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            department: data.department,
            phone_number: data.phone_number,
            salary: data.salary,
            joining_date: data.joining_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentEmployee.id);

        if (error) throw error;
      } else {
        // Create new employee
        const { error } = await supabase
          .from('employees')
          .insert({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            department: data.department,
            phone_number: data.phone_number,
            salary: data.salary,
            joining_date: data.joining_date,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      reset();
      router.push(paths.dashboard.employee.list);
    } catch (error) {
      console.error('Error:', error);
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3}>
        <Box
          rowGap={3}
          columnGap={2}
          display="grid"
          gridTemplateColumns={{
            xs: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
          }}
        >
          <RHFTextField name="first_name" label="First Name" />
          <RHFTextField name="last_name" label="Last Name" />
          <RHFTextField name="email" label="Email" />
          <RHFTextField name="department" label="Department" />
          <RHFTextField name="phone_number" label="Phone Number" />
          <RHFTextField 
            name="salary" 
            label="Salary" 
            type="number"
            InputProps={{
              type: 'number',
              placeholder: '0.00',
            }}
          />
          <RHFTextField
            name="joining_date"
            label="Joining Date"
            type="date"
            InputLabelProps={{ shrink: true }}
          />
        </Box>

        <Stack alignItems="flex-end" sx={{ mt: 3 }}>
          <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
            {currentEmployee ? 'Update' : 'Create'} Employee
          </LoadingButton>
        </Stack>
      </Stack>
    </FormProvider>
  );
}

EmployeeForm.propTypes = {
  currentEmployee: PropTypes.object,
}; 