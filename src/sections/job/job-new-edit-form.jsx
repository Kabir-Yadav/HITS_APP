import { z as zod } from 'zod';
import { useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormHelperText from '@mui/material/FormHelperText';
import InputAdornment from '@mui/material/InputAdornment';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';

import { toast } from 'src/components/snackbar';
import { Field } from 'src/components/hook-form';
import { FormProvider } from 'src/components/hook-form';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

export const NewJobSchema = zod.object({
  title: zod.string().min(1, { message: 'Title is required!' }),
  department: zod.string().min(1, { message: 'Department is required!' }),
  description: zod.string().min(1, { message: 'Description is required!' }),
  location: zod.string().min(1, { message: 'Location is required!' }),
  positions: zod.string().min(1, { message: 'Positions is required!' }),
  last_date: zod.string().min(1, { message: 'Last date is required!' }),
  joining_type: zod.string(),
  joining_months: zod.string().min(0),
  is_internship: zod.boolean(),
  duration_months: zod.string().min(0),
  expected_ctc_range: zod.string().optional().refine((val) => {
    // If value is empty or undefined, it's valid
    if (!val) return true;
    // Check if the string contains at least one number
    return /\d/.test(val);
  }, { message: 'Please enter a valid CTC range with numbers' }),
  posted_by_name: zod.string(),
  posted_by_email: zod.string().email(),
});

// ----------------------------------------------------------------------

const defaultDescription = `
<h3>Responsibilities:</h3>
<ul>
<li></li>
<li></li>
<li></li>
</ul>

<h3>Requirements:</h3>
<ul>
<li></li>
<li></li>
<li></li>
</ul>

<h3>Qualifications:</h3>
<ul>
<li></li>
<li></li>
<li></li>
</ul>
`;

export const JobNewEditForm = ({ currentJob }) => {
  const router = useRouter();
  const { user } = useAuthContext();
  const [isActive, setIsActive] = useState(true);

  const defaultValues = {
    title: '',
    department: '',
    description: '',
    location: '',
    positions: '1',
    last_date: '',
    joining_type: 'immediate',
    joining_months: '0',
    is_internship: false,
    duration_months: '0',
    expected_ctc_range: '',
    posted_by_name: `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim(),
    posted_by_email: user?.email || '',
  };

  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(NewJobSchema),
    defaultValues,
    values: currentJob ? {
      ...currentJob,
      description: currentJob.description || defaultDescription,
      posted_by_name: currentJob.posted_by_name || defaultValues.posted_by_name,
      posted_by_email: currentJob.posted_by_email || defaultValues.posted_by_email,
    } : {
      ...defaultValues,
      description: defaultDescription,
    },
  });

  const {
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  useEffect(() => {
    if (currentJob) {
      setIsActive(currentJob.is_active);

      if (currentJob.positions) {
        setValue('positions', currentJob.positions.toString());
      }
      if (currentJob.joining_months) {
        setValue('joining_months', currentJob.joining_months.toString());
      }
      if (currentJob.duration_months) {
        setValue('duration_months', currentJob.duration_months.toString());
      }
    }
  }, [currentJob]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const jobData = {
        ...data,
        positions: data.positions.toString(),
        joining_months: data.joining_months.toString(),
        duration_months: data.duration_months.toString(),
        is_active: isActive,
        last_date: data.last_date,
      };

      if (currentJob?.id) {
        const { error } = await supabase
          .from('jobs')
          .update({
            ...jobData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentJob.id)
          .eq('created_by', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('jobs').insert([
          {
            ...jobData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
      }

      reset();
      toast.success(currentJob ? 'Update success!' : 'Create success!');
      router.push(paths.dashboard.job.root);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Something went wrong');
    }
  });

  const renderDetails = () => (
    <Card>
      <CardHeader title="Details" subheader="Job role information..." sx={{ mb: 3 }} />

      <Divider />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Job Title</Typography>
          <Field.Text name="title" placeholder="Enter job title..." />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Department</Typography>
          <Field.Text name="department" placeholder="Enter department..." />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Description</Typography>
          <Field.Editor name="description" sx={{ maxHeight: 480 }} />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Location</Typography>
          <Field.Text name="location" placeholder="Enter location..." />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Positions</Typography>
          <Field.Text
            name="positions"
            placeholder="Enter the number of positions..."
            inputProps={{ patttern: '[0-9]*', inputMode: 'numeric' }}
          />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Last Date to Apply</Typography>
          <Field.Text name="last_date" type="date" />
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Joining Type</Typography>
          <Stack direction="row" spacing={2}>
            <Field.Select name="joining_type" sx={{ flex: 1 }}>
              <MenuItem value="immediate">Immediate</MenuItem>
              <MenuItem value="after_months">After Months</MenuItem>
            </Field.Select>

            {values.joining_type === 'after_months' && (
              <Field.Text
                name="joining_months"
                placeholder="Number of months"
                inputProps={{ min: 1 }}
                sx={{ flex: 1 }}
              />
            )}
          </Stack>
        </Stack>

        <FormControlLabel
          control={
            <Switch
              checked={values.is_internship}
              onChange={(e) => {
                setValue('is_internship', e.target.checked);
                if (!e.target.checked) {
                  setValue('duration_months', 0);
                }
              }}
            />
          }
          label="Is this an internship?"
        />

        {values.is_internship && (
          <Stack spacing={1.5}>
            <Typography variant="subtitle2">Internship Duration (months)</Typography>
            <Field.Text
              name="duration_months"
              placeholder="Enter duration in months..."
              inputProps={{ min: 1 }}
            />
          </Stack>
        )}

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Expected CTC Range</Typography>
          <Field.Text
            name="expected_ctc_range"
            placeholder="e.g., ₹5-7 LPA"
            InputProps={{
              startAdornment: <InputAdornment position="start">₹</InputAdornment>,
            }}
          />
          <FormHelperText>Format: ₹X-Y per Month</FormHelperText>
        </Stack>

        <Stack spacing={1.5}>
          <Typography variant="subtitle2">Posted By</Typography>
          <Field.Text
            name="posted_by_name"
            disabled
            InputProps={{
              readOnly: true,
            }}
          />
          <Field.Text
            name="posted_by_email"
            disabled
            InputProps={{
              readOnly: true,
            }}
          />
        </Stack>
      </Stack>
    </Card>
  );

  const renderActions = () => (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
      <LoadingButton
        type="submit"
        variant="contained"
        size="large"
        loading={isSubmitting}
        sx={{ ml: 2 }}
      >
        {!currentJob ? 'Create Job Role' : 'Save Changes'}
      </LoadingButton>
    </Box>
  );

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Stack spacing={3} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
        {renderDetails()}
        {renderActions()}
      </Stack>
    </FormProvider>
  );
};
