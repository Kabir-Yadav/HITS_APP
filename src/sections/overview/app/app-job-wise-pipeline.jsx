import PropTypes from 'prop-types';
import Chart from 'react-apexcharts';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Accordion from '@mui/material/Accordion';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function AppJobWisePipeline({ title, subheader, jobStats }) {
  const theme = useTheme();

  const chartOptions = {
    chart: {
      sparkline: {
        enabled: true,
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      enabled: false,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '80%',
          labels: {
            show: false,
          },
        },
      },
    },
    stroke: {
      colors: [theme.palette.background.paper],
      width: 2,
    },
    dataLabels: {
      enabled: false,
    },
  };

  const renderPipelineStats = (job) => {
    const applicationStats = [
      { 
        label: 'Shortlisted', 
        value: job.shortlisted || 0,
        total: job.totalApplications || 0,
        color: theme.palette.success.main,
      },
      { 
        label: 'Rejected', 
        value: job.rejected || 0,
        total: job.totalApplications || 0,
        color: theme.palette.error.main,
      },
      { 
        label: 'Pending', 
        value: job.pending || 0,
        total: job.totalApplications || 0,
        color: theme.palette.warning.main,
      }
    ];

    const interviewStats = [
      {
        label: 'Telephonic Round',
        value: job.telephonic || 0,
        total: job.shortlisted || 0,
        color: theme.palette.primary.main,
        status: `scheduled/completed out of ${job.shortlisted || 0} eligible`
      },
      {
        label: 'Technical Round',
        value: job.technical || 0,
        total: job.telephonic || 0,
        color: theme.palette.success.main,
        status: `scheduled/completed out of ${job.telephonic || 0} eligible`
      },
      {
        label: 'Onboarding',
        value: job.onboarding || 0,
        total: job.technical || 0,
        color: theme.palette.warning.main,
        status: `in progress out of ${job.technical || 0} eligible`
      }
    ];

    const renderPieChart = (value, total, color) => {
      const remaining = Math.max(total - value, 0);
      
      return (
        <Chart
          type="donut"
          series={[value, remaining]}
          options={{
            ...chartOptions,
            colors: [color, theme.palette.background.neutral],
          }}
          width={80}
          height={80}
        />
      );
    };

    return (
      <Stack direction="row" spacing={4} sx={{ flexGrow: 1 }}>
        {/* Application Progress */}
        <Box sx={{ width: '50%' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Application Progress
          </Typography>
          <Stack spacing={2.5}>
            {applicationStats.map((item) => (
              <Stack 
                key={item.label} 
                direction="row" 
                alignItems="center" 
                spacing={3}
                sx={{ pr: 2 }}
              >
                {renderPieChart(item.value, item.total, item.color)}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ mb: 0.5 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontSize: '1rem' }}>
                    {item.value} of {item.total}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Interview Progress */}
        <Box sx={{ width: '50%' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Interview Progress
          </Typography>
          <Stack spacing={2.5}>
            {interviewStats.map((item) => (
              <Stack 
                key={item.label} 
                direction="row" 
                alignItems="center" 
                spacing={3}
                sx={{ pr: 2 }}
              >
                {renderPieChart(item.value, item.total, item.color)}
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography variant="body1" sx={{ mb: 0.5 }}>
                    {item.label}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontSize: '0.95rem' }}>
                    {item.value} {item.status}
                  </Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    );
  };

  return (
    <Card>
      <Stack spacing={2} sx={{ p: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {subheader}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {jobStats
            .filter(job => job.totalApplications > 0)
            .map((job) => (
            <Accordion key={job.jobId}>
              <AccordionSummary 
                expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
              >
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="subtitle1">
                    {job.jobTitle}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ({job.totalApplications} Applications)
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                {renderPipelineStats(job)}
              </AccordionDetails>
            </Accordion>
          ))}
          
          {/* Show message when no jobs have applications */}
          {jobStats.filter(job => job.totalApplications > 0).length === 0 && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                No applications found for the selected filters
              </Typography>
            </Box>
          )}
        </Stack>
      </Stack>
    </Card>
  );
}

AppJobWisePipeline.propTypes = {
  title: PropTypes.string,
  subheader: PropTypes.string,
  jobStats: PropTypes.arrayOf(
    PropTypes.shape({
      jobId: PropTypes.string,
      jobTitle: PropTypes.string,
      totalApplications: PropTypes.number,
      shortlisted: PropTypes.number,
      rejected: PropTypes.number,
      pending: PropTypes.number,
      telephonic: PropTypes.number,
      technical: PropTypes.number,
      onboarding: PropTypes.number,
    })
  ),
}; 