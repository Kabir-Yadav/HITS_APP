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

export default function ApplicationCreateView() {
  const router = useRouter();

  const [jobList, setJobList] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      setJobList(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApplication = async (data) => {
    try {
      const { error } = await supabase.from('applications').insert([{
        ...data,
        status: 'pending',
        current_stage: null
      }]);

      if (error) {
        console.error('Error creating application:', error);
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
          heading="Create a new application"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Applications', href: paths.dashboard.application.root },
            { name: 'New application' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <CircularProgress />
      </Container>
    );
  }

  if (!jobList.length) {
    return (
      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Create a new application"
          links={[
            { name: 'Dashboard', href: paths.dashboard.root },
            { name: 'Applications', href: paths.dashboard.application.root },
            { name: 'New application' },
          ]}
          sx={{
            mb: { xs: 3, md: 5 },
          }}
        />

        <EmptyContent
          filled
          title="No Active Jobs"
          description="There are no active jobs available for applications"
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
        heading="Create a new application"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Applications', href: paths.dashboard.application.root },
          { name: 'New application' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <ApplicationNewEditForm jobs={jobList} onSubmit={handleCreateApplication} />
    </Container>
  );
} 