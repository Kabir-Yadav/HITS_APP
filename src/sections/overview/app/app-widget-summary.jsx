import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';

import { fNumber } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function AppWidgetSummary({ title, total, chart, sx, ...other }) {
  const theme = useTheme();

  const chartColors = chart.colors ?? [theme.palette.primary.main];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    colors: chartColors,
    stroke: { width: 0 },
    xaxis: { categories: chart.categories },
    tooltip: {
      y: { formatter: (value) => fNumber(value), title: { formatter: () => '' } },
    },
    plotOptions: { bar: { borderRadius: 1.5, columnWidth: '64%' } },
    ...chart.options,
  });

  return (
    <Card
      sx={[
        () => ({
          p: 3,
          display: 'flex',
          zIndex: 'unset',
          overflow: 'unset',
          alignItems: 'center',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ typography: 'subtitle2' }}>{title}</Box>

        <Box sx={{ mt: 1.5, typography: 'h3' }}>{fNumber(total)}</Box>
      </Box>

      <Chart
        type="bar"
        series={[{ data: chart.series }]}
        options={chartOptions}
        sx={{ width: 60, height: 40 }}
      />
    </Card>
  );
}
