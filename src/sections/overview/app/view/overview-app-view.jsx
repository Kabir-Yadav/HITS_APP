import { useState } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { useDashboardStats } from 'src/hooks/use-dashboard-stats';

import { DashboardContent } from 'src/layouts/dashboard';
import { SeoIllustration } from 'src/assets/illustrations';

import { Iconify } from 'src/components/iconify';

import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import { AppWelcome } from '../app-welcome';
import { AppNewInvoice } from '../app-new-invoice';
import { AppWidgetSummary } from '../app-widget-summary';
import { AppHiringPipeline } from '../app-hiring-pipeline';
import { AppCurrentDownload } from '../app-current-download';
import { AppJobWisePipeline } from '../app-job-wise-pipeline';

// ----------------------------------------------------------------------

export function OverviewAppView() {
  const { user } = useAuthContext();
  const theme = useTheme();

  const [filters, setFilters] = useState({
    jobId: '',
    startDate: null,
    endDate: null,
    postingStartDate: null,
    postingEndDate: null,
    lastDateStartDate: null,
    lastDateEndDate: null,
    postedBy: '',
  });

  const { stats, loading } = useDashboardStats(filters);

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target ? event.target.value : event,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      jobId: '',
      startDate: null,
      endDate: null,
      postingStartDate: null,
      postingEndDate: null,
      lastDateStartDate: null,
      lastDateEndDate: null,
      postedBy: '',
    });
  };

  // Get unique HR names from jobs
  const hrOptions = [...new Set(stats.jobs?.map(job => job.posted_by_name) || [])].filter(Boolean);

  return (
    <DashboardContent maxWidth="xl">
      <Grid container spacing={3}>
        {/* Filters Section */}
        <Grid size={{ xs: 12, md: 12 }} sx={{ mb: 2 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1.5, 
              flexWrap: 'wrap', 
              alignItems: 'center',
              bgcolor: 'background.neutral',
              borderRadius: 1,
              p: 1.5,
            }}
          >
            {/* Job Selector */}
            <TextField
              select
              size="small"
              label="Select Job"
              value={filters.jobId}
              onChange={handleFilterChange('jobId')}
              sx={{ width: 160 }}
            >
              <MenuItem value="">All Jobs</MenuItem>
              {stats.jobs?.map((job) => (
                <MenuItem key={job.id} value={job.id}>
                  {job.title}
                </MenuItem>
              ))}
            </TextField>

            {/* HR Filter - Only visible to admins */}
            {user?.user_metadata?.role === 'ADMIN' && (
              <TextField
                select
                size="small"
                label="Filter by HR"
                value={filters.postedBy}
                onChange={handleFilterChange('postedBy')}
                sx={{ width: 130 }}
              >
                <MenuItem value="">All HR</MenuItem>
                {hrOptions.map((name) => (
                  <MenuItem key={name} value={name}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Job Posting Date Range */}
            <DatePicker
              label="Posting Date From"
              value={filters.postingStartDate}
              onChange={(newValue) => {
                setFilters(prev => ({
                  ...prev,
                  postingStartDate: newValue,
                }));
              }}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  sx: { width: 170 }
                } 
              }}
            />
            <DatePicker
              label="Posting Date To"
              value={filters.postingEndDate}
              onChange={(newValue) => {
                setFilters(prev => ({
                  ...prev,
                  postingEndDate: newValue,
                }));
              }}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  sx: { width: 170 }
                } 
              }}
            />

            {/* Last Date to Apply Range */}
            <DatePicker
              label="Last Date From"
              value={filters.lastDateStartDate}
              onChange={(newValue) => {
                setFilters(prev => ({
                  ...prev,
                  lastDateStartDate: newValue,
                }));
              }}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  sx: { width: 170 }
                } 
              }}
            />
            <DatePicker
              label="Last Date To"
              value={filters.lastDateEndDate}
              onChange={(newValue) => {
                setFilters(prev => ({
                  ...prev,
                  lastDateEndDate: newValue,
                }));
              }}
              slotProps={{ 
                textField: { 
                  size: 'small',
                  sx: { width: 135 }
                } 
              }}
            />

            {/* Clear Filters Button */}
            <Button
              variant="soft"
              color="error"
              onClick={handleClearFilters}
              startIcon={<Iconify icon="solar:eraser-bold" />}
              sx={{ 
                height: 40,
                minWidth: 'auto',
                px: 2,
              }}
            >
              Clear
            </Button>
          </Box>
        </Grid>

        {/* Statistics Widgets */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AppWidgetSummary
            title="Total Applications"
            total={stats.totalApplications}
            chart={{
              series: [stats.totalApplications],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AppWidgetSummary
            title="Total Shortlisted"
            total={stats.totalShortlisted}
            chart={{
              colors: [theme.palette.success.main],
              series: [stats.totalShortlisted],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AppWidgetSummary
            title="Total Rejected"
            total={stats.totalRejected}
            chart={{
              colors: [theme.palette.error.main],
              series: [stats.totalRejected],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AppWidgetSummary
            title="Pending Applications"
            total={stats.totalPending}
            chart={{
              colors: [theme.palette.warning.main],
              series: [stats.totalPending],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AppWidgetSummary
            title="Total Jobs"
            total={stats.totalJobs}
            chart={{
              colors: [theme.palette.info.main],
              series: [stats.totalJobs],
            }}
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AppWidgetSummary
            title="Total Positions"
            total={stats.totalPositions}
            chart={{
              colors: [theme.palette.primary.main],
              series: [stats.totalPositions],
            }}
          />
        </Grid>

        {/* Job-wise Positions Distribution and Hiring Pipeline */}
        <Grid size={{ xs: 12, lg: 12 }} sx={{ width: '100%' }}>
          <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
            <Grid item xs={12} md={5} sx={{ width: '33%' }}>
              <AppCurrentDownload
                title="Positions by Job"
                subheader="Distribution of open positions"
                chart={{
                  series: stats.jobStats.map(job => ({
                    label: job.jobTitle,
                    value: job.positions,
                  })),
                }}
              />
            </Grid>

            <Grid item xs={12} md={7} sx={{ width: '64%' }}>
              <AppHiringPipeline
                title="Hiring Pipeline Overview"
                subheader="Track application and interview progress"
                data={stats.pipelineStats}
                jobs={stats.jobs}
                selectedJobId={filters.jobId}
                onJobChange={handleFilterChange('jobId')}
              />
            </Grid>
          </Grid>
        </Grid>

        {/* Job-wise Pipeline Section */}
        <Grid size={{ xs: 12, lg: 12 }}>
          <AppJobWisePipeline
            title="Job-wise Hiring Pipeline"
            subheader="Detailed pipeline status for each job posting"
            jobStats={stats.jobStats}
          />
        </Grid>

        {/* Upcoming Interviews */}
        {user?.user_metadata?.role !== 'ADMIN' && (
          <Grid size={{ xs: 12, lg: 12 }}>
            <AppNewInvoice
              title="Upcoming Interviews"
              tableData={stats.upcomingInterviews.map(interview => ({
                id: interview.id,
                applicantName: interview.application?.applicant_name || '-',
                jobTitle: interview.application?.job?.title || '-',
                stage: interview.stage || '-',
                interviewer: interview.interviewer || '-',
                scheduleDate: interview.schedule_date || '-',
              }))}
              headCells={[
                { id: 'applicantName', label: 'Applicant Name' },
                { id: 'jobTitle', label: 'Job Title' },
                { id: 'stage', label: 'Stage' },
                { id: 'interviewer', label: 'Interviewer' },
                { id: 'scheduleDate', label: 'Schedule' },
              ]}
            />
          </Grid>
        )}
      </Grid>
    </DashboardContent>
  );
}
