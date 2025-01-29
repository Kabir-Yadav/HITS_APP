import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';

import { useInterviews } from 'src/hooks/use-interviews';

import { fDate } from 'src/utils/format-time';
import { generateSelectedCandidatesPDF } from 'src/utils/pdf-generator';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export function SelectionSection({ filters }) {
  const { interviews, fetchInterviews } = useInterviews();
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [openHistory, setOpenHistory] = useState(false);

  useEffect(() => {
    fetchInterviews('selected', filters);
  }, [fetchInterviews, filters]);

  const handleOpenHistory = (interview) => {
    setSelectedHistory(interview);
    setOpenHistory(true);
  };

  const handleCloseHistory = () => {
    setSelectedHistory(null);
    setOpenHistory(false);
  };

  const handleDownloadPDF = () => {
    generateSelectedCandidatesPDF(interviews);
  };

  const renderInterviewHistory = (
    <Dialog 
      fullWidth 
      maxWidth="md" 
      open={openHistory} 
      onClose={handleCloseHistory}
    >
      <DialogTitle>
        Interview History
        <IconButton
          onClick={handleCloseHistory}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {selectedHistory?.interview_history?.map((interview) => {
          let feedbackData = {};
          try {
            if (interview.feedback) {
              feedbackData = JSON.parse(interview.feedback);
            }
          } catch (error) {
            console.error('Error parsing feedback:', error);
          }

          return (
            <Card key={interview.id} sx={{ p: 3, mb: 2 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                    {interview.stage} Round
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {fDate(interview.created_at)}
                  </Typography>
                </Stack>

                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Interviewer:</strong> {interview.interviewer}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> {interview.status}
                  </Typography>
                  {feedbackData.duration && (
                    <Typography variant="body2">
                      <strong>Duration:</strong> {feedbackData.duration} minutes
                    </Typography>
                  )}
                  {feedbackData.feedback && (
                    <Typography variant="body2">
                      <strong>Feedback:</strong> {feedbackData.feedback}
                    </Typography>
                  )}
                </Stack>
              </Stack>
            </Card>
          );
        })}
      </DialogContent>
    </Dialog>
  );

  const renderHiredCandidates = (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ p: 2 }}>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:file-download-bold" />}
          onClick={handleDownloadPDF}
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
                <TableCell>Application Date</TableCell>
                <TableCell>Joining Date</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {interviews.map((interview) => {
                const {
                  id,
                  application,
                  created_at,
                } = interview;

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
                        {fDate(application?.created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {fDate(created_at)}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        size="small"
                        color="info"
                        onClick={() => handleOpenHistory(interview)}
                        startIcon={<Iconify icon="solar:eye-bold" />}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              <TableNoData notFound={!interviews.length} />
            </TableBody>
          </Table>
        </Scrollbar>
      </TableContainer>
    </>
  );

  return (
    <Card>
      {renderHiredCandidates}
      {renderInterviewHistory}
    </Card>
  );
}

SelectionSection.propTypes = {
  filters: PropTypes.object,
}; 