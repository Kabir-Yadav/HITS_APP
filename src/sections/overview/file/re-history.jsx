import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Timeline from '@mui/lab/Timeline';
import TimelineDot from '@mui/lab/TimelineDot';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineItem, { timelineItemClasses } from '@mui/lab/TimelineItem';

import { fDateTime } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export function OrderDetailsHistory({ history }) {
  const renderTimeline = () => (
    <Timeline
      sx={{ p: 0, m: 0, [`& .${timelineItemClasses.root}:before`]: { flex: 0, padding: 0 } }}
    >
      {history?.timeline.map((item, index) => {
        const firstTime = index === 0;
        const lastTime = index === history.timeline.length - 1;

        return (
          <TimelineItem key={item.title}>
            <TimelineSeparator>
              <TimelineDot color={(firstTime && 'primary') || 'grey'} />
              {lastTime ? null : <TimelineConnector />}
            </TimelineSeparator>

            <TimelineContent>
              <Typography variant="subtitle2">{item.title}</Typography>

              <Box sx={{ color: 'text.disabled', typography: 'caption', mt: 0.5 }}>
                {fDateTime(item.time)}
              </Box>
            </TimelineContent>
          </TimelineItem>
        );
      })}
    </Timeline>
  );

  return (
    <Card>
      <CardHeader title="History" sx={{backgroundColor:'background.neutral'}}/>
      <Box
        sx={{
          backgroundColor: 'background.neutral',
          p: 3,
          gap: 3,
          display: 'flex',
          alignItems: { md: 'flex-start' },
          flexDirection: { xs: 'column-reverse', md: 'row' },
        }}
      >
        {renderTimeline()}
      </Box>
    </Card>
  );
}
