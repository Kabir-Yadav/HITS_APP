import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Checkbox from '@mui/material/Checkbox';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';

import { useBoolean } from 'src/hooks/use-boolean';
import { useInterviews } from 'src/hooks/use-interviews';

import { fDate } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { TableNoData } from 'src/components/table';
import { Scrollbar } from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export function OnboardingSection({ filters }) {
  const [currentTab, setCurrentTab] = useState('eligible');
  const [selectedApplications, setSelectedApplications] = useState([]);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('');
  const [scheduleDate, setScheduleDate] = useState(null);
  const [interviewer, setInterviewer] = useState('');
  const [assignedBy, setAssignedBy] = useState('');
  const [duration, setDuration] = useState('');

  const statusDialog = useBoolean();
  const loading = useBoolean();

  const { interviews, applications, fetchInterviews, scheduleInterview, updateInterviewStatus } = useInterviews();

  useEffect(() => {
    fetchInterviews('onboarding', filters);
  }, [fetchInterviews, filters]);

  // Filter out applications that already have scheduled onboarding interviews
  // Only show applications that passed technical round (onboarding_pending)
  const eligibleApplications = applications.filter((app) => {
    const hasScheduledInterview = interviews.some(
      (interview) => 
        interview.application_id === app.id && 
        interview.stage === 'onboarding' &&
        ['scheduled', 'completed', 'rejected'].includes(interview.status)
    );
    return !hasScheduledInterview && app.status === 'onboarding_pending';
  });

  const scheduledInterviews = interviews.filter(
    (interview) => interview.status === 'scheduled'
  );

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleScheduleInterview = async () => {
    try {
      loading.onTrue();
      await scheduleInterview({
        applicationIds: selectedApplications,
        stage: 'onboarding',
        status: 'scheduled',
        scheduleDate,
        interviewer,
        assignedBy,
      });
      setScheduleDialog(false);
      setSelectedApplications([]);
      setScheduleDate(null);
      setInterviewer('');
      setAssignedBy('');
    } catch (error) {
      console.error('Error scheduling interview:', error);
    } finally {
      loading.onFalse();
    }
  };

  const handleUpdateStatus = async () => {
    try {
      loading.onTrue();
      const feedbackData = {
        duration,
        feedback,
      };
      await updateInterviewStatus({
        applicationIds: selectedApplications,
        status,
        feedback: JSON.stringify(feedbackData),
      });
      statusDialog.onFalse();
      setSelectedApplications([]);
      setStatus('');
      setFeedback('');
      setDuration('');
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      loading.onFalse();
    }
  };

  const renderEligibleCandidates = (
    <TableContainer>
      <Scrollbar>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedApplications.length > 0 && selectedApplications.length < eligibleApplications.length
                  }
                  checked={eligibleApplications.length > 0 && selectedApplications.length === eligibleApplications.length}
                  onChange={(event) =>
                    setSelectedApplications(
                      event.target.checked ? eligibleApplications.map((app) => app.id) : []
                    )
                  }
                />
              </TableCell>
              <TableCell>Applicant Name</TableCell>
              <TableCell>Job Title</TableCell>
              <TableCell>Application Date</TableCell>
              <TableCell>Resume</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {eligibleApplications.map((application) => {
              const isSelected = selectedApplications.includes(application.id);

              return (
                <TableRow key={application.id} hover selected={isSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(event) =>
                        setSelectedApplications(
                          event.target.checked
                            ? [...selectedApplications, application.id]
                            : selectedApplications.filter((id) => id !== application.id)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{application.applicant_name}</TableCell>
                  <TableCell>{application.job?.title}</TableCell>
                  <TableCell>{fDate(application.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Iconify icon="eva:download-outline" />}
                      href={application.resume_url}
                      target="_blank"
                    >
                      Resume
                    </Button>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton color={statusDialog.value ? 'inherit' : 'default'}>
                      <Iconify icon="eva:more-vertical-fill" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}

            <TableNoData notFound={!eligibleApplications.length} />
          </TableBody>
        </Table>
      </Scrollbar>
    </TableContainer>
  );

  const renderScheduledInterviews = (
    <TableContainer>
      <Scrollbar>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={
                    selectedApplications.length > 0 && selectedApplications.length < scheduledInterviews.length
                  }
                  checked={scheduledInterviews.length > 0 && selectedApplications.length === scheduledInterviews.length}
                  onChange={(event) =>
                    setSelectedApplications(
                      event.target.checked ? scheduledInterviews.map((interview) => interview.application_id) : []
                    )
                  }
                />
              </TableCell>
              <TableCell>Applicant Name</TableCell>
              <TableCell>Job Title</TableCell>
              <TableCell>Interview Date</TableCell>
              <TableCell>Interviewer</TableCell>
              <TableCell>Assigned By</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {scheduledInterviews.map((interview) => {
              const isSelected = selectedApplications.includes(interview.application_id);

              return (
                <TableRow key={interview.id} hover selected={isSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onChange={(event) =>
                        setSelectedApplications(
                          event.target.checked
                            ? [...selectedApplications, interview.application_id]
                            : selectedApplications.filter((id) => id !== interview.application_id)
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>{interview.application?.applicant_name}</TableCell>
                  <TableCell>{interview.application?.job?.title}</TableCell>
                  <TableCell>{fDate(interview.schedule_date)}</TableCell>
                  <TableCell>{interview.interviewer}</TableCell>
                  <TableCell>{interview.assigned_by}</TableCell>
                  <TableCell>{interview.status}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => {
                        setSelectedApplications([interview.application_id]);
                        statusDialog.onTrue();
                      }}
                    >
                      Update Status
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            <TableNoData notFound={!scheduledInterviews.length} />
          </TableBody>
        </Table>
      </Scrollbar>
    </TableContainer>
  );

  const renderScheduleDialog = (
    <Dialog 
      fullWidth 
      maxWidth="sm" 
      open={scheduleDialog} 
      onClose={() => setScheduleDialog(false)}
    >
      <DialogTitle>Schedule Onboarding</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <DatePicker
            label="Onboarding Date"
            value={scheduleDate}
            onChange={(newValue) => setScheduleDate(newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !scheduleDate,
              },
            }}
          />

          <TimePicker
            label="Onboarding Time"
            value={scheduleDate}
            onChange={(newValue) => setScheduleDate(newValue)}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !scheduleDate,
              },
            }}
          />

          <TextField
            fullWidth
            label="HR Representative"
            value={interviewer}
            onChange={(e) => setInterviewer(e.target.value)}
            error={!interviewer}
          />

          <TextField
            fullWidth
            label="Assigned By"
            value={assignedBy}
            onChange={(e) => setAssignedBy(e.target.value)}
            error={!assignedBy}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={() => setScheduleDialog(false)}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={loading.value}
          onClick={handleScheduleInterview}
          disabled={!scheduleDate || !interviewer || !assignedBy}
        >
          Schedule
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );

  const renderStatusDialog = (
    <Dialog 
      fullWidth 
      maxWidth="sm" 
      open={statusDialog.value} 
      onClose={statusDialog.onFalse}
    >
      <DialogTitle>Update Onboarding Status</DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            select
            fullWidth
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            SelectProps={{
              native: true,
            }}
          >
            <option value="" />
            <option value="completed">Complete</option>
            <option value="rejected">Cancelled</option>
            <option value="standby">Standby</option>
          </TextField>

          <TextField
            fullWidth
            label="Duration (minutes)"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            error={!duration}
            type="number"
            inputProps={{ min: 0 }}
          />

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            required={status !== 'standby'}
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={statusDialog.onFalse}>
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={loading.value}
          onClick={handleUpdateStatus}
          disabled={!status || (!duration && status !== 'standby') || (!feedback && status !== 'standby')}
        >
          Update
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );

  return (
    <>
      <Card>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            px: 2.5,
            boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.palette.divider}`,
          }}
        >
          <Tab value="eligible" label="Eligible Candidates" />
          <Tab value="scheduled" label="Scheduled Onboarding" />
        </Tabs>

        <Stack
          spacing={2.5}
          direction="row"
          justifyContent="flex-end"
          sx={{ p: 2.5, bgcolor: 'background.neutral' }}
        >
          {currentTab === 'eligible' ? (
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => setScheduleDialog(true)}
              disabled={!selectedApplications.length}
            >
              Schedule Onboarding
            </Button>
          ) : (
            <Button
              variant="contained"
              color="inherit"
              startIcon={<Iconify icon="solar:pen-bold" />}
              onClick={statusDialog.onTrue}
              disabled={!selectedApplications.length}
            >
              Update Status
            </Button>
          )}
        </Stack>

        {currentTab === 'eligible' ? renderEligibleCandidates : renderScheduledInterviews}
      </Card>

      {renderScheduleDialog}
      {renderStatusDialog}
    </>
  );
}

OnboardingSection.propTypes = {
  filters: PropTypes.object,
}; 