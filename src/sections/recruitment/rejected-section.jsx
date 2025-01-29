import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useInterviews } from 'src/hooks/use-interviews';

import { fDate } from 'src/utils/format-time';
import { generateRejectedCandidatesPDF } from 'src/utils/pdf-generator';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

const INTERVIEW_STAGES = [
  { value: 'telephone', label: 'Telephone Round', count: 0 },
  { value: 'technical', label: 'Technical Round', count: 0 },
  { value: 'onboarding', label: 'Onboarding', count: 0 },
];

// ----------------------------------------------------------------------

export function RejectedSection({ filters }) {
  const [currentTab, setCurrentTab] = useState('telephone');
  const [rejectedCandidates, setRejectedCandidates] = useState([]);
  const [stageCounts, setStageCounts] = useState({
    telephone: 0,
    technical: 0,
    onboarding: 0,
  });

  const { interviews, fetchInterviews } = useInterviews();

  useEffect(() => {
    fetchInterviews('rejected', filters);
  }, [fetchInterviews, filters]);

  useEffect(() => {
    // Calculate counts for each stage
    const counts = interviews.reduce((acc, interview) => {
      const lastInterview = interview.interview_history?.[interview.interview_history.length - 1];
      if (lastInterview?.status === 'rejected') {
        acc[lastInterview.stage] = (acc[lastInterview.stage] || 0) + 1;
      }
      return acc;
    }, {
      telephone: 0,
      technical: 0,
      onboarding: 0,
    });

    setStageCounts(counts);

    // Filter interviews based on the current tab/stage and get the rejection interview
    const filtered = interviews.map((interview) => {
      // Find the interview where the candidate was rejected
      const rejectionInterview = interview.interview_history?.find(int => int.status === 'rejected');
      if (rejectionInterview && rejectionInterview.stage === currentTab) {
        return {
          ...rejectionInterview,
          application: interview.application,
        };
      }
      return null;
    }).filter(Boolean);

    setRejectedCandidates(filtered);
  }, [interviews, currentTab]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleDownloadPDF = () => {
    generateRejectedCandidatesPDF(rejectedCandidates, currentTab);
  };

  const renderRejectedList = (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:file-download-bold" />}
          onClick={handleDownloadPDF}
          disabled={!rejectedCandidates.length}
        >
          Download PDF
        </Button>
      </Stack>

      <TableContainer>
        <Scrollbar>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Applicant Name</TableCell>
                <TableCell>Job Title</TableCell>
                <TableCell>Interview Date</TableCell>
                <TableCell>Interviewer</TableCell>
                <TableCell>Rejection Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rejectedCandidates.map((interview) => {
                const {
                  id,
                  application,
                  interviewer,
                  schedule_date,
                  feedback,
                } = interview;

                // Parse feedback data
                let feedbackText = '-';
                try {
                  if (feedback) {
                    const feedbackData = JSON.parse(feedback);
                    feedbackText = feedbackData.feedback || '-';
                  }
                } catch (error) {
                  console.error('Error parsing feedback:', error);
                  feedbackText = feedback || '-';
                }

                return (
                  <TableRow key={id}>
                    <TableCell>
                      <Typography variant="subtitle2">
                        {application?.applicant_name}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {application?.job?.title}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {fDate(schedule_date)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {interviewer}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'error.main',
                          fontStyle: 'italic',
                        }}
                      >
                        {feedbackText}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}

              {rejectedCandidates.length === 0 && (
                <TableNoData notFound={rejectedCandidates.length === 0} />
              )}
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>
    </>
  );

  return (
    <Card>
      <Tabs
        value={currentTab}
        onChange={handleTabChange}
        sx={{
          px: 2,
          bgcolor: 'background.neutral',
        }}
      >
        {INTERVIEW_STAGES.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            icon={
              <Chip
                label={stageCounts[tab.value]}
                color="error"
                size="small"
                sx={{ mr: 1 }}
              />
            }
          />
        ))}
      </Tabs>

      <Stack spacing={3} sx={{ p: 3 }}>
        {renderRejectedList}
      </Stack>
    </Card>
  );
}

RejectedSection.propTypes = {
  filters: PropTypes.object,
}; 