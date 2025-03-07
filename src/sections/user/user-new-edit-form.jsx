import axios from 'axios';
import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { isValidPhoneNumber } from 'react-phone-number-input/input';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fData } from 'src/utils/format-number';

import { supabase } from 'src/lib/supabase';

import { Label } from 'src/components/label';
import { toast } from 'src/components/snackbar';
import { FormProvider, Field, schemaHelper } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const NewUserSchema = zod.object({
  avatarUrl: schemaHelper.file({ message: 'Avatar is required!' }),
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  password: zod
    .string()
    .min(6, { message: 'Password must be at least 6 characters!' }),
  dateOfBirth: zod.any().transform((val) => {
    if (!val) return null;
    const date = dayjs(val);
    return date.isValid() ? date.toDate() : null;
  }),
  phoneNumber: schemaHelper.phoneNumber({ isValid: isValidPhoneNumber }),
  role: zod.string().min(1, { message: 'Role is required!' }),
});

// ----------------------------------------------------------------------

export function UserNewEditForm({ currentUser }) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    avatarUrl: null,
    phoneNumber: '',
    role: '',
    password: '',
    dateOfBirth: dayjs(),
  };

  const methods = useForm({
    mode: 'onSubmit',
    resolver: zodResolver(NewUserSchema),
    defaultValues,
    values: currentUser,
  });

  const {
    reset,
    watch,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const onSubmit = handleSubmit(async (data) => {
    try {
      let avatarUrl = null;

      // Upload avatar to Supabase Storage if provided
      if (data.avatarUrl instanceof File) {
        const fileExt = data.avatarUrl.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;

        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(fileName, data.avatarUrl);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      // If editing existing user
      if (currentUser) {
        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            first_name: data.firstName,
            last_name: data.lastName,
            avatar_url: avatarUrl || currentUser.avatarUrl,
            phone_number: data.phoneNumber,
            role: data.role,
            date_of_birth: data.dateOfBirth ? dayjs(data.dateOfBirth).format('YYYY-MM-DD') : null,
          },
        });

        if (updateError) throw updateError;
      } else {
        // Create new user without email verification
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              first_name: data.firstName,
              last_name: data.lastName,
              avatar_url: avatarUrl,
              phone_number: data.phoneNumber,
              role: data.role,
              date_of_birth: data.dateOfBirth ? dayjs(data.dateOfBirth).format('YYYY-MM-DD') : null,
            },
            emailRedirectTo: undefined, // Disable email verification
          },
        });

        if (signUpError) throw signUpError;

        // ✅ Get newly created user from the signup response
        if (signUpData?.user?.id) {
          await axios.post('https://apiemployeeos.duckdns.org:8443/api/chat/create', {
            id: signUpData.user.id,
            name: `${data.firstName}${data.lastName}`,
            email: data.email,
            role: data.role,
            phone_number: data.phoneNumber,
            avatar_url: avatarUrl,
            address: '',
            status: 'offline',
          }).catch((error) => {
            console.error('Failed to save user in DB:', error);
          });
        }
      }

      reset();
      toast.success(currentUser ? 'Update success!' : 'Create success!');
      router.push(paths.dashboard.user.new);
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ pt: 10, pb: 5, px: 3 }}>
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
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ p: 3 }}>
            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMsg}
              </Alert>
            )}

            <Box
              sx={{
                rowGap: 3,
                columnGap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.Text name="firstName" label="First name" />
              <Field.Text name="lastName" label="Last name" />
              <Field.Text name="email" label="Email address" />

              {!currentUser && (
                <Field.Text
                  name="password"
                  label="Password"
                  type="password"
                  helperText="Must contain at least 6 characters"
                />
              )}

              <Controller
                name="dateOfBirth"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <Field.DatePicker
                    {...field}
                    label="Date of Birth"
                    format="DD/MM/YYYY"
                    slotProps={{
                      textField: {
                        error: !!error,
                        helperText: error?.message,
                      },
                    }}
                    maxDate={dayjs()}
                  />
                )}
              />

              <Field.Phone
                name="phoneNumber"
                label="Phone number"
                country={!currentUser ? 'IN' : undefined}
              />

              <Controller
                name="role"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <FormControl fullWidth error={!!error}>
                    <InputLabel>Role</InputLabel>
                    <Select
                      {...field}
                      label="Role"
                      placeholder="Select a role"
                    >
                      <MenuItem value="ADMIN">Admin</MenuItem>
                      <MenuItem value="HR">HR</MenuItem>
                      <MenuItem value="EMPLOYEE">Employee</MenuItem>
                    </Select>
                    {error && (
                      <FormHelperText>{error.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Box>

            <Stack sx={{ mt: 3, alignItems: 'flex-end' }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                {!currentUser ? 'Create user' : 'Save changes'}
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
