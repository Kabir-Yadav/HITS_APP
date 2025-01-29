import { useEffect, useCallback, useState } from 'react';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useJobFilters } from 'src/hooks/use-job-filters';

import { supabase } from 'src/lib/supabase';
import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { JobList } from '../job-list';
import { JobSort } from '../job-sort';
import { JobSearch } from '../job-search';
import { JobFilters } from '../job-filters';

// ----------------------------------------------------------------------

export function JobListView() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('latest');
  const [openFilters, setOpenFilters] = useState(false);

  const filters = useJobFilters();
  const { user } = useAuthContext();

  const isAdmin = user?.role === 'ADMIN';

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase.from('jobs').select(`
        *,
        posted_by_name,
        posted_by_email
      `);

      // If not admin, only show jobs created by the user
      if (!isAdmin) {
        query = query.eq('created_by', user?.id);
      }

      // Apply filters
      if (filters.filters.jobId) {
        query = query.ilike('id', `%${filters.filters.jobId}%`);
      }

      if (filters.filters.joiningType.length > 0) {
        query = query.in('joining_type', filters.filters.joiningType);
      }

      if (filters.filters.isInternship !== 'all') {
        query = query.eq('is_internship', filters.filters.isInternship === 'true');
      }

      if (filters.filters.startDate && filters.filters.endDate) {
        query = query
          .gte('created_at', filters.filters.startDate)
          .lte('created_at', filters.filters.endDate);
      }

      // Apply posted_by filter
      if (filters.filters.posted_by) {
        query = query.or(`posted_by_name.ilike.%${filters.filters.posted_by}%,posted_by_email.ilike.%${filters.filters.posted_by}%`);
      }

      // Apply sorting
      query = query.order('created_at', { ascending: sortBy === 'oldest' });

      const { data, error } = await query;

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [sortBy, filters.filters, user?.id, isAdmin]);

  const handleOpenFilters = useCallback(() => {
    setOpenFilters(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setOpenFilters(false);
  }, []);

  const handleSortBy = useCallback((newValue) => {
    setSortBy(newValue);
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      console.log('Attempting to delete job with ID:', id);
      
      // Only allow deletion if admin or if the user created the job
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('created_by, title')
        .eq('id', id)
        .single();

      if (jobError) {
        console.error('Error checking job permissions:', jobError);
        toast.error('Error checking job permissions');
        return;
      }

      if (!isAdmin && jobData.created_by !== user?.id) {
        toast.error('You do not have permission to delete this job');
        return;
      }

      // Show confirmation toast
      toast.loading(`Deleting job: ${jobData.title}`);

      // First get all applications for this job
      const { data: applications, error: applicationsQueryError } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', id);

      if (applicationsQueryError) {
        console.error('Error fetching applications:', applicationsQueryError);
        toast.error('Error fetching applications');
        return;
      }

      // Delete related interviews first (using application IDs)
      if (applications && applications.length > 0) {
        const applicationIds = applications.map(app => app.id);
        const { error: interviewError } = await supabase
          .from('interviews')
          .delete()
          .in('application_id', applicationIds);

        if (interviewError) {
          console.error('Error deleting interviews:', interviewError);
          toast.error('Error deleting related interviews');
          return;
        }
      }

      // Delete related applications
      const { error: applicationError } = await supabase
        .from('applications')
        .delete()
        .eq('job_id', id);

      if (applicationError) {
        console.error('Error deleting applications:', applicationError);
        toast.error('Error deleting related applications');
        return;
      }

      // Finally delete the job
      const { error: deleteError } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting job:', deleteError);
        if (deleteError.message.includes('permission denied')) {
          toast.error('You do not have permission to delete this job');
        } else {
          toast.error('Error deleting job');
        }
        return;
      }

      toast.success('Job deleted successfully');
      
      // Refresh the jobs list
      await fetchJobs();
    } catch (error) {
      console.error('Error:', error);
      if (error.message?.includes('permission denied')) {
        toast.error('You do not have permission to perform this action');
      } else {
        toast.error('An unexpected error occurred');
      }
    }
  }, [isAdmin, user?.id, fetchJobs]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const renderFilters = (
    <Stack
      spacing={1}
      direction="row"
      alignItems="center"
      flexWrap="wrap"
      sx={{
        py: { xs: 2.5, md: 3 },
      }}
    >
      <JobSearch redirectPath={(id) => paths.dashboard.job.details(id)} />

      <Stack direction="row" spacing={1} flexShrink={0}>
        <JobFilters
          open={openFilters}
          onOpen={handleOpenFilters}
          onClose={handleCloseFilters}
          filters={{
            state: filters.filters,
            resetFilters: filters.onResetFilters,
            setFilters: filters.onChangeFilters,
          }}
          options={{
            joiningTypes: ['immediate', 'after_months'],
          }}
          canReset={filters.canReset}
          dateError={filters.dateError}
          openDateRange={filters.openDateRange}
          onOpenDateRange={filters.onOpenDateRange}
          onCloseDateRange={filters.onCloseDateRange}
        />

        <JobSort sort={sortBy} onSort={handleSortBy} />
      </Stack>
    </Stack>
  );

  const renderResults = (
    <Card>
      {loading ? (
        <Stack alignItems="center" justifyContent="center" sx={{ py: 10 }}>
          <CircularProgress />
        </Stack>
      ) : (
        <>
          {jobs.length > 0 ? (
            <JobList jobs={jobs} onDelete={handleDelete} />
          ) : (
            <EmptyContent
              title="No Data"
              description="No jobs found"
              sx={{
                py: 10,
              }}
            />
          )}
        </>
      )}
    </Card>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="List"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Job', href: paths.dashboard.job.root },
          { name: 'List' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.job.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Job
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Stack spacing={2.5}>
        {renderFilters}

        {renderResults}
      </Stack>
    </DashboardContent>
  );
}
