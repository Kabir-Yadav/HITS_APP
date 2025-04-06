import dayjs from 'dayjs';
import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { isValidPhoneNumber } from 'react-phone-number-input/input';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { fData } from 'src/utils/format-number';

import { supabase } from 'src/lib/supabase';

import { toast } from 'src/components/snackbar';
import { FormProvider, Field, schemaHelper } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks';

// ----------------------------------------------------------------------

export const UpdateUserSchema = zod.object({
  avatarUrl: schemaHelper.file({ message: 'Avatar is required!' }),
  firstName: zod.string().min(1, { message: 'First name is required!' }),
  lastName: zod.string().min(1, { message: 'Last name is required!' }),
  email: zod
    .string()
    .min(1, { message: 'Email is required!' })
    .email({ message: 'Email must be a valid email address!' }),
  dateOfBirth: zod.any().transform((val) => {
    if (!val) return null;
    const date = dayjs(val);
    return date.isValid() ? date.toDate() : null;
  }),
  phoneNumber: schemaHelper.phoneNumber({ isValid: isValidPhoneNumber }),
  role: zod.string().min(1, { message: 'Role is required!' }),
  designation: zod.string().min(1, { message: 'Designation is required!' }),
  dateOfJoining: zod.any().transform((val) => {
    if (!val) return null;
    const date = dayjs(val);
    return date.isValid() ? date.toDate() : null;
  }),
  dateOfLeaving: zod.any().transform((val) => {
    if (!val) return null;
    const date = dayjs(val);
    return date.isValid() ? date.toDate() : null;
  }),
});

// ----------------------------------------------------------------------

const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR', label: 'HR' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

export function AccountGeneral() {
  const { user } = useAuthContext();
  const [errorMsg, setErrorMsg] = useState('');
  const [currentAvatar, setCurrentAvatar] = useState(null);
  const [joiningDate, setJoiningDate] = useState(null);
  const [leavingDate, setLeavingDate] = useState(null);

  // Add new useEffect for periodic refresh of dates
  useEffect(() => {
    const fetchDates = async () => {
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      if (!error && currentUser) {
        setJoiningDate(
          currentUser.user_metadata?.date_of_joining
            ? new Date(currentUser.user_metadata.date_of_joining)
            : null
        );
        setLeavingDate(
          currentUser.user_metadata?.date_of_leaving
            ? new Date(currentUser.user_metadata.date_of_leaving)
            : null
        );
      }
    };

    // Initial fetch
    fetchDates();

    // Set up interval
    const intervalId = setInterval(fetchDates, 2000); // 2 seconds

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Fetch current avatar on component mount
  useEffect(() => {
    const fetchAvatar = async () => {
      if (user?.user_metadata?.avatar_url) {
        try {
          const response = await fetch(user.user_metadata.avatar_url);
          const blob = await response.blob();
          const file = new File([blob], 'current-avatar.jpg', { type: blob.type });
          setCurrentAvatar(file);
        } catch (error) {
          console.error('Error fetching avatar:', error);
        }
      }
    };

    fetchAvatar();
  }, [user?.user_metadata?.avatar_url]);

  const defaultValues = {
    firstName: '',
    lastName: '',
    email: '',
    avatarUrl: null,
    phoneNumber: '',
    role: '',
    dateOfBirth: null,
    designation: '',
    dateOfJoining: null,
    dateOfLeaving: null,
  };

  const methods = useForm({
    mode: 'onChange',
    resolver: zodResolver(UpdateUserSchema),
    defaultValues,
    values: {
      firstName: user?.user_metadata?.first_name || '',
      lastName: user?.user_metadata?.last_name || '',
      email: user?.email || '',
      avatarUrl: currentAvatar,
      phoneNumber: user?.user_metadata?.phone_number || '',
      role: user?.user_metadata?.role || '',
      dateOfBirth: user?.user_metadata?.date_of_birth ? new Date(user.user_metadata.date_of_birth) : null,
      designation: user?.user_metadata?.designation || '',
      dateOfJoining: joiningDate,
      dateOfLeaving: leavingDate,
    },
  });

  // Add useEffect to update form when dates change
  useEffect(() => {
    methods.reset({
      ...methods.getValues(),
      dateOfJoining: joiningDate,
      dateOfLeaving: leavingDate,
    });
  }, [joiningDate, leavingDate, methods]);

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      let avatarUrl = user?.user_metadata?.avatar_url;

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

      const { error: updateError } = await supabase.auth.updateUser({
        email: data.email,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          avatar_url: avatarUrl,
          phone_number: data.phoneNumber,
          role: data.role,
          date_of_birth: data.dateOfBirth ? dayjs(data.dateOfBirth).format('YYYY-MM-DD') : null,
          designation: data.designation,
          date_of_joining: data.dateOfJoining ? dayjs(data.dateOfJoining).format('YYYY-MM-DD') : null,
          date_of_leaving: data.dateOfLeaving ? dayjs(data.dateOfLeaving).format('YYYY-MM-DD') : null,
        },
      });

      if (updateError) throw updateError;

      toast.success('Update success!');
    } catch (error) {
      console.error(error);
      setErrorMsg(typeof error === 'string' ? error : error.message);
    }
  });

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ pt: 10, pb: 5, px: 3, textAlign: 'center' }}>
            <Field.UploadAvatar
              name="avatarUrl"
              maxSize={3145728}
              preview={user?.user_metadata?.avatar_url}
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
              <Field.Phone name="phoneNumber" label="Phone number" />
              <Field.Select
                name="role"
                label="Role"
                placeholder="Select role"
                disabled
              >
                {ROLE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.DatePicker
                name="dateOfBirth"
                label="Date of Birth"
                format="DD/MM/YYYY"
                maxDate={dayjs()}
              />

              <Field.Text
                name="designation"
                label="Designation"
                placeholder="Enter designation"
              />

              <Field.DatePicker
                name="dateOfJoining"
                label="Date of Joining"
                format="DD/MM/YYYY"
              />

              <Field.DatePicker
                name="dateOfLeaving"
                label="Date of Relieving"
                format="DD/MM/YYYY"
              />
            </Box>

            <Stack spacing={3} sx={{ mt: 3, alignItems: 'flex-end' }}>
              <LoadingButton type="submit" variant="contained" loading={isSubmitting}>
                Save changes
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
