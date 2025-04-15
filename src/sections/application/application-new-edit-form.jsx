import * as Yup from 'yup';
import { useState } from 'react';
import PropTypes from 'prop-types';
import { useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { RHFSelect, RHFTextField } from 'src/components/hook-form';
import { FormProvider } from 'src/components/hook-form/form-provider';

// ----------------------------------------------------------------------

export function ApplicationNewEditForm({ jobs, currentApplication, onSubmit, publicMode = false, preselectedJobId = null }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [existingApplication, setExistingApplication] = useState(null);

  const { enqueueSnackbar } = useSnackbar();

  const NewApplicationSchema = Yup.object().shape({
    job_id: Yup.string().required('Job is required'),
    applicant_name: Yup.string().required('Name is required'),
    email: Yup.string().required('Email is required').email('Email must be a valid email address'),
    phone_number: Yup.string()
      .required('Phone number is required')
      .matches(/^[0-9]+$/, 'Phone number must be numeric')
      .min(10, 'Phone number must be at least 10 digits')
      .max(15, 'Phone number must not exceed 15 digits'),
    resume_url: Yup.string().required('Resume is required'),
  });

  const defaultValues = {
    job_id: preselectedJobId || currentApplication?.job_id || '',
    applicant_name: currentApplication?.applicant_name || '',
    email: currentApplication?.email || '',
    phone_number: currentApplication?.phone_number || '',
    resume_url: currentApplication?.resume_url || '',
  };

  const methods = useForm({
    resolver: yupResolver(NewApplicationSchema),
    defaultValues,
  });

  const {
    reset,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploading(true);
      setResumeFile(file);
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `resumes/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('resumes')
          .upload(filePath, file);

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('resumes')
          .getPublicUrl(filePath);

        setValue('resume_url', publicUrl);
        setUploadSuccess(true);
        enqueueSnackbar('Resume uploaded successfully!', { variant: 'success' });
      } catch (error) {
        console.error('Error uploading resume:', error);
        enqueueSnackbar('Error uploading resume', { variant: 'error' });
      } finally {
        setUploading(false);
      }
    }
  }, [setValue, enqueueSnackbar]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxFiles: 1,
    multiple: false
  });

  const onCancel = () => {
    if (!publicMode) {
      reset();
      router.push(paths.dashboard.application.root);
    } else {
      window.location.href = '/'; // Redirect to home page in public mode
    }
  };

  const checkExistingApplication = async (jobId, email) => {
    try {
      // First, check if any applications exist with the same email and job_id
      const { data, error } = await supabase
        .from('applications')
        .select('id, created_at, status')
        .eq('job_id', jobId)
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        enqueueSnackbar('Error checking application status', { variant: 'error' });
        return null;
      }

      // If we found any applications, return the most recent one
      if (data && data.length > 0) {
        return {
          id: data[0].id,
          created_at: data[0].created_at,
          status: data[0].status
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking existing application:', error);
      enqueueSnackbar('Error checking application status', { variant: 'error' });
      return null;
    }
  };

  const handleCreateApplication = async (data) => {
    try {
      // Check for existing application
      const existing = await checkExistingApplication(data.job_id, data.email);
      
      if (existing) {
        setExistingApplication({
          applicationId: existing.id,
          timestamp: existing.created_at,
          status: existing.status
        });
        return;
      }

      const result = await onSubmit(data);
      reset();
      if (result?.success) {
        if (!publicMode) {
          enqueueSnackbar(currentApplication ? 'Update success!' : 'Create success!');
          router.push(paths.dashboard.application.root);
        } else {
          setSubmittedApplication(result);
          setSubmitSuccess(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      enqueueSnackbar('Error occurred!', { variant: 'error' });
    }
  };

  if (existingApplication) {
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <Iconify icon="eva:info-circle-fill" width={60} sx={{ color: 'info.main', mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 2 }}>Application Already Exists</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          You have already applied for this position.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Your application ID is: <strong>{existingApplication.applicationId}</strong>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Status: <strong>{existingApplication.status || 'Pending'}</strong>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Submitted on: {new Date(existingApplication.timestamp).toLocaleString()}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Please stand by while we review your application and reach out to you.
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            if (publicMode) {
              window.location.href = '/';
            } else {
              router.push(paths.dashboard.application.root);
            }
          }}
        >
          {publicMode ? 'Return to Home' : 'View Applications'}
        </Button>
      </Card>
    );
  }

  if (submitSuccess) {
    return (
      <Card sx={{ p: 3, textAlign: 'center' }}>
        <Iconify icon="eva:checkmark-circle-2-fill" width={60} sx={{ color: 'success.main', mb: 2 }} />
        <Typography variant="h4" sx={{ mb: 2 }}>Application Submitted Successfully!</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Your application ID is: <strong>{submittedApplication?.applicationId}</strong>
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Submitted on: {new Date(submittedApplication?.timestamp).toLocaleString()}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Thank you for your application. We will review it and get back to you soon.
        </Typography>
      </Card>
    );
  }

  const renderDetails = (
    <Card sx={{ p: 3 }}>
      <Box
        rowGap={3}
        columnGap={2}
        display="grid"
        gridTemplateColumns={{
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
        }}
      >
        {!preselectedJobId && (
          <RHFSelect name="job_id" label="Job">
            <MenuItem value="">None</MenuItem>
            {jobs.map((job) => (
              <MenuItem key={job.id} value={job.id}>
                {job.title}
              </MenuItem>
            ))}
          </RHFSelect>
        )}

        <RHFTextField name="applicant_name" label="Full Name" />

        <RHFTextField name="email" label="Email Address" />

        <RHFTextField
          name="phone_number"
          label="Phone Number"
          placeholder="987654321"
        />

        <Box sx={{ gridColumn: 'span 2' }}>
          <RHFTextField 
            name="resume_url" 
            sx={{ display: 'none' }}
          />
          
          <Box
            {...getRootProps()}
            sx={{
              p: 5,
              outline: 'none',
              borderRadius: 1,
              cursor: 'pointer',
              overflow: 'hidden',
              position: 'relative',
              bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
              border: (theme) => `1px dashed ${theme.palette.divider}`,
              '&:hover': {
                opacity: 0.72,
              },
            }}
          >
            <input {...getInputProps()} />

            {uploading && (
              <Box sx={{ 
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                position: 'absolute',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.64),
              }}>
                <CircularProgress />
              </Box>
            )}

            <Stack spacing={2} alignItems="center" justifyContent="center">
              {resumeFile ? (
                <Iconify icon="eva:checkmark-circle-2-fill" width={40} sx={{ color: 'success.main' }} />
              ) : (
                <Iconify icon="eva:cloud-upload-fill" width={40} />
              )}

              <Stack spacing={1} sx={{ textAlign: 'center' }}>
                <Typography variant="h6">
                  {isDragActive ? 'Drop your resume here' : 'Drop or Select Resume'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {resumeFile ? resumeFile.name : 'Drop files here or click to browse (.pdf, .doc, .docx)'}
                </Typography>
              </Stack>
            </Stack>
          </Box>
          
          {uploadSuccess && (
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'success.main' }}>
              Resume uploaded successfully! You can now submit your application.
            </Typography>
          )}
        </Box>
      </Box>

      <Stack alignItems="flex-end" sx={{ mt: 3 }}>
        <Stack direction="row" spacing={2}>
          <Button color="error" variant="outlined" onClick={onCancel}>
            Cancel
          </Button>

          <LoadingButton
            type="submit"
            variant="contained"
            loading={isSubmitting}
          >
            {currentApplication ? 'Update' : 'Apply'}
          </LoadingButton>
        </Stack>
      </Stack>
    </Card>
  );

  return (
    <FormProvider methods={methods} onSubmit={handleSubmit(handleCreateApplication)}>
      <Stack spacing={3}>
        {renderDetails}
      </Stack>
    </FormProvider>
  );
}

ApplicationNewEditForm.propTypes = {
  jobs: PropTypes.array,
  currentApplication: PropTypes.object,
  onSubmit: PropTypes.func,
  publicMode: PropTypes.bool,
  preselectedJobId: PropTypes.string,
}; 