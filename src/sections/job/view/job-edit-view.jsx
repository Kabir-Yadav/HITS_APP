import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';
import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { JobNewEditForm } from 'src/sections/job/job-new-edit-form';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

export function JobEditView({ id }) {
  const router = useRouter();
  const { user } = useAuthContext();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // If not admin and not the creator, redirect to jobs list
        if (!isAdmin && data.created_by !== user?.id) {
          router.push(paths.dashboard.job.root);
          return;
        }

        setJob(data);
      } catch (error) {
        console.error('Error fetching job:', error);
        router.push(paths.dashboard.job.root);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchJob();
    }
  }, [id, user?.id, isAdmin, router]);

  if (loading) {
    return null;
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        backHref={paths.dashboard.job.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Job', href: paths.dashboard.job.root },
          { name: job?.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <JobNewEditForm currentJob={job} />
    </DashboardContent>
  );
}
