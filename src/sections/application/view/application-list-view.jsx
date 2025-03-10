import { useState, useCallback, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useBoolean } from 'src/hooks/use-boolean';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { EmptyContent } from 'src/components/empty-content';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { ApplicationList } from '../application-list';
import { ApplicationSort } from '../application-sort';
import { ApplicationSearch } from '../application-search';
import { ApplicationFilters } from '../application-filters';
import { ApplicationFiltersResult } from '../application-filters-result';

// ----------------------------------------------------------------------

const defaultFilters = {
  status: 'all',
  startDate: null,
  endDate: null,
};

// ----------------------------------------------------------------------

export default function ApplicationListView() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [sort, setSort] = useState('latest');
  const [filters, setFilters] = useState({
    jobId: '',
    status: 'all',
    startDate: null,
    endDate: null,
    posted_by: '',
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [applicationList, setApplicationList] = useState([]);
  const [jobList, setJobList] = useState([]);

  const openFilters = useBoolean();
  const openDateRange = useBoolean();

  const dateError = filters.startDate && filters.endDate ? filters.startDate > filters.endDate : false;

  const canReset = !!(
    filters.jobId || 
    filters.status !== 'all' || 
    filters.posted_by ||
    (filters.startDate && filters.endDate)
  );

  const notFound = !applicationList.length && !loading;

  const handleFilters = useCallback((name, value) => {
    setFilters((prevState) => ({
      ...prevState,
      [name]: value,
    }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({
      jobId: '',
      status: 'all',
      startDate: null,
      endDate: null,
      posted_by: '',
    });
  }, []);

  const handleSort = useCallback((newValue) => {
    setSort(newValue);
  }, []);

  const handleUpdateStatus = useCallback(async (id, newStatus) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Error updating application status:', error);
        return;
      }

      await fetchApplications();
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('job_id, title')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      setJobList(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('applications')
        .select(`
          *,
          jobs!inner (
            job_id,
            title,
            posted_by_name,
            posted_by_email
          )
        `)
        .order('created_at', { ascending: sort === 'oldest' });

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.jobId) {
        query = query.eq('jobs.job_id', filters.jobId);
      }

      // Filter by posted_by (name or email)
      if (filters.posted_by) {
        // First get the jobs that match the posted_by filter
        const { data: matchingJobs } = await supabase
          .from('jobs')
          .select('id')
          .or(`posted_by_name.ilike.%${filters.posted_by}%,posted_by_email.ilike.%${filters.posted_by}%`);

        if (matchingJobs?.length) {
          // Then filter applications to only show those for the matching jobs
          query = query.in('job_id', matchingJobs.map(job => job.id));
        } else {
          // If no jobs match the posted_by filter, return no results
          query = query.eq('id', -1); // This ensures no results will be returned
        }
      }

      if (filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);

        query = query
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching applications:', error);
        return;
      }

      setApplicationList(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, sort]);

  useEffect(() => {
    fetchJobs();
    fetchApplications();
  }, [fetchJobs, fetchApplications]);

  // Check if user is an EMPLOYEE - moved after all hooks
  if (user?.user_metadata?.role === 'EMPLOYEE') {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You do not have access to view this page
        </Alert>
      </Box>
    );
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setImporting(true);
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n');
        
        // Get valid jobs with their UUIDs from the database first
        const { data: validJobs } = await supabase
          .from('jobs')
          .select('id, job_id, title')
          .eq('is_active', true);

        // Create a mapping of job_id (text) to id (uuid)
        const jobIdToUuidMap = Object.fromEntries(
          validJobs?.map(job => [job.job_id, job.id]) || []
        );
        
        // Skip header row and filter out empty rows
        const applications = rows.slice(1)
          .filter(row => row.trim())
          .map(row => {
            const [job_id, applicant_name, email, phone_number, resume_url, status] = row.split(',').map(field => field?.trim());
            
            // Get the UUID for this job_id
            const jobUuid = jobIdToUuidMap[job_id];
            
            // Validate job_id exists in our database
            if (!jobUuid) {
              throw new Error(`Invalid job ID: ${job_id}. Available job IDs are: ${Object.keys(jobIdToUuidMap).join(', ')}`);
            }

            return {
              job_id: jobUuid, // Use the UUID instead of the text job_id
              applicant_name,
              email,
              phone_number,
              resume_url,
              status: status || 'pending',
              created_at: new Date().toISOString(),
            };
          });

        if (applications.length > 0) {
          const { error } = await supabase
            .from('applications')
            .insert(applications);

          if (error) {
            console.error('Supabase error:', error);
            throw new Error('Failed to import applications. Please check your CSV format.');
          }

          // Refresh the applications list
          await fetchApplications();
          console.log('Successfully imported', applications.length, 'applications');
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing applications:', error);
      alert(error.message || 'Failed to import applications. Please check your CSV format.');
    } finally {
      setImporting(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const renderFilters = (
    <Stack
      spacing={3}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-end', sm: 'center' }}
      direction={{ xs: 'column', sm: 'row' }}
    >
      <Stack 
        direction="row" 
        alignItems="center" 
        spacing={2} 
        flexGrow={1} 
        sx={{ 
          width: 1,
          maxWidth: { sm: '70%', md: '60%' }
        }}
      >
        <ApplicationSearch />

        <ApplicationFilters
          filters={filters}
          onFilters={handleFilters}
          canReset={canReset}
          onResetFilters={handleResetFilters}
          dateError={dateError}
          open={openFilters.value}
          onOpen={openFilters.onTrue}
          onClose={openFilters.onFalse}
          openDateRange={openDateRange.value}
          onCloseDateRange={openDateRange.onFalse}
          onOpenDateRange={openDateRange.onTrue}
          jobs={jobList}
        />
      </Stack>

      <Stack direction="row" alignItems="center" spacing={2}>
        <Button
          component="label"
          variant="contained"
          disabled={importing}
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            whiteSpace: 'nowrap'
          }}
        >
          <Iconify icon="eva:cloud-upload-fill" />
          Import CSV
          <input
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
        </Button>
        <ApplicationSort sort={sort} onSort={handleSort} />
      </Stack>
    </Stack>
  );

  const renderResults = (
    <ApplicationFiltersResult
      filters={filters}
      onFilters={handleFilters}
      onResetFilters={handleResetFilters}
      results={applicationList.length}
      sx={{ mb: 5 }}
    />
  );

  return (
    <Container maxWidth={false}>
      <CustomBreadcrumbs
        heading="Applications"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Applications', href: paths.dashboard.application.root },
          { name: 'List' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <Card>
        <Stack
          spacing={2.5}
          sx={{
            px: 3,
            py: 2.5,
          }}
        >
          {renderFilters}

          {canReset && renderResults}

          <Box sx={{ position: 'relative' }}>
            {loading && (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 1,
                }}
              >
                <CircularProgress />
              </Box>
            )}

            {notFound ? (
              <EmptyContent
                filled
                title="No Applications Found"
                sx={{
                  py: 10,
                }}
              />
            ) : (
              <ApplicationList applications={applicationList} onUpdateStatus={handleUpdateStatus} />
            )}
          </Box>
        </Stack>
      </Card>
    </Container>
  );
} 