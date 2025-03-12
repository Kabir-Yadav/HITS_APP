import { useState, useEffect } from 'react';
import { useTabs } from 'minimal-shared/hooks';
import { useSearchParams } from 'react-router-dom';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Badge from '@mui/material/Badge';
import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { supabase } from 'src/lib/supabase';
import { DashboardContent } from 'src/layouts/dashboard';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { JobApplications } from '../job-applications';
import { JobDetailsToolbar } from '../job-details-toolbar';
import { JobDetailsContent } from '../job-details-content';

// ----------------------------------------------------------------------

const JOB_DETAILS_TABS = [
  { value: 'content', label: 'Job Content' },
  { value: 'applications', label: 'Applications' },
];

// ----------------------------------------------------------------------

export function JobDetailsView({ id }) {
  const [searchParams] = useSearchParams();
  const [currentTab, setCurrentTab] = useState('content');
  const tabs = useTabs('content');
  const router = useRouter();
  const { user } = useAuthContext();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationCount, setApplicationCount] = useState(0);

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

    const fetchApplicationCount = async () => {
      try {
        const { count, error } = await supabase
          .from('applications')
          .select('*', { count: 'exact' })
          .eq('job_id', id);

        if (error) throw error;

        setApplicationCount(count || 0);
      } catch (error) {
        console.error('Error fetching application count:', error);
      }
    };

    if (id) {
      fetchJob();
      fetchApplicationCount();
    }
  }, [id, user?.id, isAdmin, router]);

  useEffect(() => {
    // Get tab from URL parameter
    const tab = searchParams.get('tab');
    if (tab === 'applications') {
      setCurrentTab('applications');
    }
  }, [searchParams]);

  if (loading) {
    return null;
  }

  const renderToolbar = () => (
    <JobDetailsToolbar
      backHref={paths.dashboard.job.root}
      editHref={paths.dashboard.job.edit(`${job?.id}`)}
      isActive={job?.is_active}
      canEdit={isAdmin || job?.created_by === user?.id}
    />
  );

  const renderTabs = () => (
    <Tabs value={currentTab} onChange={(event, newValue) => setCurrentTab(newValue)} sx={{ mb: { xs: 3, md: 5 } }}>
      {JOB_DETAILS_TABS.map((tab) => (
        <Tab
          key={tab.value}
          value={tab.value}
          label={
            tab.value === 'applications' ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {tab.label}
                <Badge 
                  badgeContent={applicationCount} 
                  color="info"
                  sx={{
                    '& .MuiBadge-badge': {
                      right: -16,
                      top: -8,
                      minWidth: 20,
                      height: 20,
                      padding: '0 6px',
                      borderRadius: 10,
                    },
                  }}
                />
              </Box>
            ) : (
              tab.label
            )
          }
        />
      ))}
    </Tabs>
  );

  return (
    <DashboardContent>
      {renderToolbar()}

      {renderTabs()}
      
      {currentTab === 'content' && <JobDetailsContent job={job} />}
      {currentTab === 'applications' && <JobApplications jobId={id} />}
    </DashboardContent>
  );
}
