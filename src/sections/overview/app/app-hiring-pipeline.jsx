import PropTypes from 'prop-types';
import Chart from 'react-apexcharts';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';


// ----------------------------------------------------------------------

export function AppHiringPipeline({ title, subheader, data, jobs, selectedJobId, onJobChange }) {
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

  const applicationStats = [
    { 
      label: 'Shortlisted', 
      value: data.shortlisted || 0,
      total: data.total || 0,
      color: theme.palette.success.main,
    },
    { 
      label: 'Rejected', 
      value: data.rejected || 0,
      total: data.total || 0,
      color: theme.palette.error.main,
    },
    { 
      label: 'Standby', 
      value: data.standby || 0,
      total: data.total || 0,
      color: theme.palette.warning.main,
    }
  ];

  const interviewStats = [
    {
      label: 'Telephonic Round',
      value: data.telephonic || 0,
      total: data.shortlisted || 0,
      color: theme.palette.primary.main,
      status: `scheduled/completed out of ${data.shortlisted || 0} eligible`
    },
    {
      label: 'Technical Round',
      value: data.technical || 0,
      total: data.telephonic || 0,
      color: theme.palette.success.main,
      status: `scheduled/completed out of ${data.telephonic || 0} eligible`
    },
    {
      label: 'Onboarding',
      value: data.onboarding || 0,
      total: data.technical || 0,
      color: theme.palette.warning.main,
      status: `in progress out of ${data.technical || 0} eligible`
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
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Stack spacing={3} sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              {subheader}
            </Typography>
          </Box>
        </Stack>

        {/* Progress sections side by side */}
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
      </Stack>
    </Card>
  );
}

AppHiringPipeline.propTypes = {
  title: PropTypes.string,
  subheader: PropTypes.string,
  selectedJobId: PropTypes.string,
  onJobChange: PropTypes.func,
  jobs: PropTypes.array,
  data: PropTypes.shape({
    total: PropTypes.number,
    shortlisted: PropTypes.number,
    rejected: PropTypes.number,
    standby: PropTypes.number,
    telephonic: PropTypes.number,
    technical: PropTypes.number,
    onboarding: PropTypes.number,
  }),
}; 