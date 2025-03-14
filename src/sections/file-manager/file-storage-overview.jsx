import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';

import { fData } from 'src/utils/format-number';

import { Chart, useChart } from 'src/components/chart';

// ----------------------------------------------------------------------

export function FileStorageOverview({ data, used, total, chart, sx, ...other }) {
  const theme = useTheme();
  // Colors for the radial bar gradient fill
  const chartColors = chart.colors ?? [theme.palette.secondary.main, theme.palette.secondary.light];

  const chartOptions = useChart({
    chart: { sparkline: { enabled: true } },
    stroke: { width: 0 },
    fill: {
      type: 'gradient',
      gradient: {
        colorStops: [
          { offset: 0, color: chartColors[0], opacity: 1 },
          { offset: 100, color: chartColors[1], opacity: 1 },
        ],
      },
    },
    plotOptions: {
      radialBar: {
        offsetY: 40,
        startAngle: -90,
        endAngle: 90,
        hollow: { margin: -24 },
        track: { margin: -24 },
        dataLabels: {
          // The "name" is the label under the numeric value
          name: { offsetY: 8 },
          // The "value" is the numeric (0–100) in the center
          value: {
            offsetY: -36,
            // Display "57.3%" format with 1 decimal place
            formatter: (val) => val.toFixed(1) + '%',
          },
          // The "total" is the bottom label under the chart
          total: {
            // e.g. "Used of 1 GB"
            label: `Used ${fData(used)} / ${fData(total)}`,
            show: true,
            color: theme.vars.palette.text.disabled,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: theme.typography.caption.fontWeight,

            formatter: (w) =>
              w.globals.seriesTotals[0].toFixed(1) + '%'

          },
        },
      },
    },
    ...chart.options,
  });

  return (
    <Card sx={sx} {...other}>
      <Chart
        type="radialBar"
        // The radial chart expects a single numeric (0–100)
        series={[chart.series]}
        options={chartOptions}
        slotProps={{ loading: { p: 3 } }}
        sx={{ mx: 'auto', width: 240, height: 240 }}
      />

      <Stack
        spacing={3}
        sx={{
          px: 3,
          pb: 5,
          mt: -4,
          zIndex: 1,
          position: 'relative',
          bgcolor: 'background.paper',
        }}
      >
        {data.map((category) => (
          <Box
            key={category.name}
            sx={{
              gap: 2,
              display: 'flex',
              alignItems: 'center',
              typography: 'subtitle2',
            }}
          >
            <Box sx={{ width: 36, height: 36 }}>{category.icon}</Box>

            <Stack flex="1 1 auto">
              <div>{category.name}</div>
              <Box
                component="span"
                sx={{ typography: 'caption', color: 'text.disabled' }}
              >
                {`${category.filesCount} files`}
              </Box>
            </Stack>

            <Box component="span"> {fData(category.usedStorage)} </Box>
          </Box>
        ))}
      </Stack>
    </Card>
  );
}
