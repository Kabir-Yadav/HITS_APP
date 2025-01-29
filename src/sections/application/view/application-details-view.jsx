import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fDateTime } from 'src/utils/format-time';

import { supabase } from 'src/lib/supabase';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ----------------------------------------------------------------------

export default function ApplicationDetailsView({ id }) {
  const router = useRouter();

  const [applicationData, setApplicationData] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs(title)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching application:', error);
        return;
      }

      setApplicationData(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error updating application status:', error);
        return;
      }

      await fetchApplication();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const renderLoading = (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
      }}
    >
      <CircularProgress />
    </Box>
  );

  const renderError = (
    <EmptyContent
      filled
      title="No Data"
      sx={{
        py: 10,
      }}
    />
  );

  const renderApplication = () => {
    if (!applicationData) {
      return null;
    }

    return (
      <Stack spacing={3}>
        <Card sx={{ p: 3 }}>
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">Application Details</Typography>

              <Label
                variant="soft"
                color={
                  (applicationData.status === 'shortlisted' && 'success') ||
                  (applicationData.status === 'rejected' && 'error') ||
                  'warning'
                }
              >
                {applicationData.status}
              </Label>
            </Stack>

            <Stack spacing={2}>
              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Application ID
                </Typography>
                <Typography variant="body2">{applicationData.id}</Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Job Title
                </Typography>
                <Typography variant="body2">{applicationData.jobs?.title || 'N/A'}</Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Applicant Name
                </Typography>
                <Typography variant="body2">{applicationData.applicant_name}</Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Email
                </Typography>
                <Typography variant="body2">{applicationData.email}</Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Phone Number
                </Typography>
                <Typography variant="body2">{`${applicationData.country_code} ${applicationData.phone_number}`}</Typography>
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
                  Applied On
                </Typography>
                <Typography variant="body2">{fDateTime(applicationData.created_at)}</Typography>
              </Stack>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button
                fullWidth
                component="a"
                href={applicationData.resume_url}
                target="_blank"
                variant="outlined"
                startIcon={<Iconify icon="eva:file-text-fill" />}
              >
                Resume
              </Button>

              {applicationData.status === 'pending' && (
                <Stack direction="row" spacing={2} sx={{ width: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="success"
                    onClick={() => handleUpdateStatus('shortlisted')}
                  >
                    Shortlist
                  </Button>

                  <Button
                    fullWidth
                    variant="contained"
                    color="error"
                    onClick={() => handleUpdateStatus('rejected')}
                  >
                    Reject
                  </Button>
                </Stack>
              )}
            </Stack>
          </Stack>
        </Card>
      </Stack>
    );
  };

  return (
    <Container maxWidth={false}>
      <CustomBreadcrumbs
        heading="Application Details"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Applications', href: paths.dashboard.application.root },
          { name: 'Details' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {loading && renderLoading}

      {!loading && !applicationData && renderError}

      {!loading && applicationData && renderApplication()}
    </Container>
  );
}

ApplicationDetailsView.propTypes = {
  id: PropTypes.string,
}; 