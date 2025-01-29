import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';

import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { ApplicationNewEditForm } from '../application-new-edit-form';

// ----------------------------------------------------------------------

export default function ApplicationEditView({ id }) {
  const router = useRouter();

  const [jobs, setJobs] = useState([]);

  const [currentApplication, setCurrentApplication] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [jobsResponse, applicationResponse] = await Promise.all([
        supabase
          .from('jobs')
          .select('id, title')
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.from('applications').select('*').eq('id', id).single(),
      ]);

      if (jobsResponse.error) {
        console.error('Error fetching jobs:', jobsResponse.error);
        return;
      }

      if (applicationResponse.error) {
        console.error('Error fetching application:', applicationResponse.error);
        return;
      }

      setJobs(jobsResponse.data || []);
      setCurrentApplication(applicationResponse.data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditApplication = async (data) => {
    try {
      const { error } = await supabase.from('applications').update(data).eq('id', id);

      if (error) {
        console.error('Error updating application:', error);
        return;
      }

      router.push(paths.dashboard.application.root);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Edit application"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Applications', href: paths.dashboard.application.root },
            { name: currentApplication?.applicant_name || '' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <CircularProgress />
      </Container>
    );
  }

  if (!currentApplication) {
    return (
      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Edit application"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Applications', href: paths.dashboard.application.root },
            { name: currentApplication?.applicant_name || '' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <EmptyContent
          filled
          title="No Data"
          sx={{
            py: 10,
          }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth={false}>
      <CustomBreadcrumbs
        heading="Edit application"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Applications', href: paths.dashboard.application.root },
          { name: currentApplication?.applicant_name || '' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <ApplicationNewEditForm
        jobs={jobs}
        currentApplication={currentApplication}
        onSubmit={handleEditApplication}
      />
    </Container>
  );
}

ApplicationEditView.propTypes = {
  id: PropTypes.string,
}; 