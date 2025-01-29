import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';

import Card from '@mui/material/Card';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { useParams } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';

import { EmptyContent } from 'src/components/empty-content';

import { ApplicationNewEditForm } from 'src/sections/application/application-new-edit-form';

// ----------------------------------------------------------------------

export default function PublicJobApplicationPage() {
  const params = useParams();
  const { id } = params;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .single();

        if (error) throw error;
        setJob(data);
      } catch (error) {
        console.error('Error fetching job:', error);
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJob();
    }
  }, [id]);

  const handleCreateApplication = async (data) => {
    try {
      const { error } = await supabase.from('applications').insert([{
        ...data,
        status: 'pending',
        current_stage: 'application_received'
      }]);

      if (error) throw error;

      // Show success message
      return true;
    } catch (error) {
      console.error('Error creating application:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <Container sx={{ py: 5, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!job) {
    return (
      <Container sx={{ py: 5 }}>
        <EmptyContent
          filled
          title="Job Not Found"
          description="This job posting is no longer active or does not exist"
        />
      </Container>
    );
  }

  return (
    <>
      <Helmet>
        <title>Apply for {job.title} | Job Application</title>
      </Helmet>

      <Container sx={{ py: 5 }}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Apply for {job.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
            Department: {job.department}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Location: {job.location}
          </Typography>
        </Card>

        <ApplicationNewEditForm
          jobs={[job]}
          onSubmit={handleCreateApplication}
          publicMode
          preselectedJobId={job.id}
        />
      </Container>
    </>
  );
} 