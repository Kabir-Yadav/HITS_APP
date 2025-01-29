import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Radio from '@mui/material/Radio';
import Stack from '@mui/material/Stack';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import FormControlLabel from '@mui/material/FormControlLabel';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fData } from 'src/utils/format-number';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { FormProvider, Field, schemaHelper } from 'src/components/hook-form';

import { signUp } from 'src/auth/context/supabase';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

export const UserNewSchema = zod.object({
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  password: zod
    .string()
    .min(1, { message: 'Password is required!' })
    .min(6, { message: 'Password must be at least 6 characters!' }),
  role: zod.enum(['HR', 'EMPLOYEE', 'ADMIN'], { required_error: 'Role is required!' }),
  dateOfBirth: zod
    .any()
    .refine((date) => dayjs(date).isValid(), {
      message: 'Invalid date format!',
    })
    .refine((date) => {
      const age = dayjs().diff(dayjs(date), 'year');
      return age >= 18;
    }, { message: 'Must be at least 18 years old' }),
});

// ----------------------------------------------------------------------

export function UserNewForm() {
  const router = useRouter();
  const { user } = useAuthContext();
  const showPassword = useBoolean();

  const [errorMessage, setErrorMessage] = useState('');

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    dateOfBirth: dayjs().subtract(18, 'year'),
    avatarUrl: null,
  };

  const methods = useForm({
    resolver: zodResolver(UserNewSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
    setValue,
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      const userRole = user?.user_metadata?.role;

      if (userRole === 'HR' && data.role !== 'EMPLOYEE') {
        throw new Error('HR can only create Employee accounts');
      }

      if (userRole !== 'ADMIN' && (data.role === 'ADMIN' || data.role === 'HR')) {
        throw new Error('Only Admin can create Admin and HR accounts');
      }

      await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        dateOfBirth: dayjs(data.dateOfBirth).format('DD/MM/YYYY'),
      });

      toast.success('User created successfully!');
      router.push(paths.dashboard.root);
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
      toast.error(error.message);
    }
  });

  const renderForm = () => (
    <Card sx={{ p: 3 }}>
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Stack spacing={3}>
          <Box sx={{ mb: 5 }}>
            <Field.UploadAvatar
              name="avatarUrl"
              maxSize={3145728}
              helperText={
                <Typography
                  variant="caption"
                  sx={{
                    mt: 3,
                    mx: 'auto',
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.disabled',
                  }}
                >
                  Allowed *.jpeg, *.jpg, *.png, *.gif
                  <br /> max size of {fData(3145728)}
                </Typography>
              }
            />
          </Box>

          <Box
            sx={{
              display: 'grid',
              rowGap: 3,
              columnGap: 2,
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              },
            }}
          >
            <Field.Text
              name="firstName"
              label="First name"
              placeholder="John"
            />
            <Field.Text
              name="lastName"
              label="Last name"
              placeholder="Doe"
            />
          </Box>

          <Field.Text
            name="email"
            label="Email address"
            placeholder="example@domain.com"
          />

          <Field.Text
            name="password"
            label="Password"
            type={showPassword.value ? 'text' : 'password'}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={showPassword.onToggle} edge="end">
                    <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date of Birth"
              value={methods.watch('dateOfBirth')}
              onChange={(newValue) => {
                setValue('dateOfBirth', newValue);
              }}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!methods.formState.errors.dateOfBirth,
                  helperText: methods.formState.errors.dateOfBirth?.message,
                }
              }}
              maxDate={dayjs().subtract(18, 'year')}
            />
          </LocalizationProvider>

          <FormControl component="fieldset">
            <FormLabel component="legend">Role</FormLabel>
            <RadioGroup
              row
              name="role"
              value={methods.watch('role')}
              onChange={(e) => methods.setValue('role', e.target.value)}
              sx={{ gap: 3 }}
            >
              {user?.user_metadata?.role === 'ADMIN' ? (
                <>
                  <FormControlLabel
                    value="ADMIN"
                    control={
                      <Radio
                        sx={{
                          color: 'primary.main',
                          '&.Mui-checked': {
                            color: 'primary.main',
                          },
                        }}
                      />
                    }
                    label="Admin"
                  />
                  <FormControlLabel
                    value="HR"
                    control={
                      <Radio
                        sx={{
                          color: 'primary.main',
                          '&.Mui-checked': {
                            color: 'primary.main',
                          },
                        }}
                      />
                    }
                    label="HR"
                  />
                </>
              ) : (
                <FormControlLabel
                  value="EMPLOYEE"
                  control={
                    <Radio
                      disabled
                      sx={{
                        '&.Mui-disabled': {
                          color: 'text.disabled',
                        },
                      }}
                    />
                  }
                  label="Employee"
                />
              )}
            </RadioGroup>
          </FormControl>

          <LoadingButton
            fullWidth
            color="inherit"
            size="large"
            type="submit"
            variant="contained"
            loading={isSubmitting}
          >
            Create User
          </LoadingButton>
        </Stack>
      </FormProvider>
    </Card>
  );

  return (
    <Stack spacing={3}>
      <Typography variant="h4">
        Create New {user?.user_metadata?.role === 'ADMIN' ? 'User' : 'Employee'} Account
      </Typography>
      {renderForm()}
    </Stack>
  );
} 