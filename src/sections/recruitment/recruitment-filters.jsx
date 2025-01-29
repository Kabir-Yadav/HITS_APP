import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Select from '@mui/material/Select';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';

import { supabase } from 'src/lib/supabase';

import { Iconify } from 'src/components/iconify';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';

// ----------------------------------------------------------------------

const INTERVIEW_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'standby', label: 'Standby' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ----------------------------------------------------------------------

export function RecruitmentFilters({
  open,
  onOpen,
  onClose,
  filters,
  onFilters,
  canReset,
  onResetFilters,
  dateError,
  openDateRange,
  onCloseDateRange,
  onOpenDateRange,
}) {
  const [jobs, setJobs] = useState([]);
  const [interviewers, setInterviewers] = useState([]);

  useEffect(() => {
    fetchJobs();
    fetchInterviewers();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id, job_id, title')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching jobs:', error);
        return;
      }

      setJobs(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchInterviewers = async () => {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('interviewer')
        .not('interviewer', 'is', null);

      if (error) {
        console.error('Error fetching interviewers:', error);
        return;
      }

      // Get unique interviewers
      const uniqueInterviewers = [...new Set(data.map(item => item.interviewer))];
      setInterviewers(uniqueInterviewers);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const renderHead = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ py: 2, pr: 1, pl: 2.5 }}
    >
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Filters
      </Typography>

      <Tooltip title="Reset">
        <IconButton onClick={onResetFilters}>
          <Badge color="error" variant="dot" invisible={!canReset}>
            <Iconify icon="solar:restart-bold" />
          </Badge>
        </IconButton>
      </Tooltip>

      <IconButton onClick={onClose}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>
    </Stack>
  );

  const renderJobId = (
    <Stack spacing={1} sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2">Job ID</Typography>
      <FormControl fullWidth>
        <Select
          value={filters.jobId}
          onChange={(event) => onFilters('jobId', event.target.value)}
          displayEmpty
        >
          <MenuItem value="">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              All Jobs
            </Typography>
          </MenuItem>

          {jobs.map((job) => (
            <MenuItem key={job.id} value={job.id}>
              <Typography variant="body2">
                {job.job_id} - {job.title}
              </Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const renderInterviewer = (
    <Stack spacing={1} sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2">Interviewer</Typography>
      <FormControl fullWidth>
        <Select
          value={filters.interviewer}
          onChange={(event) => onFilters('interviewer', event.target.value)}
          displayEmpty
        >
          <MenuItem value="">
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              All Interviewers
            </Typography>
          </MenuItem>

          {interviewers.map((interviewer) => (
            <MenuItem key={interviewer} value={interviewer}>
              <Typography variant="body2">{interviewer}</Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const renderStatus = (
    <Stack spacing={1} sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2">Status</Typography>
      <FormControl fullWidth>
        <Select
          value={filters.status}
          onChange={(event) => onFilters('status', event.target.value)}
        >
          {INTERVIEW_STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              <Typography variant="body2">{option.label}</Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );

  const renderDateRange = (
    <Stack spacing={1} sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2">Interview Date</Typography>
      <Box
        onClick={onOpenDateRange}
        sx={{
          p: 2,
          border: 1,
          borderRadius: 1,
          borderStyle: 'solid',
          borderColor: 'divider',
          cursor: 'pointer',
          typography: 'body2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="body2" sx={{ color: filters.startDate ? 'text.primary' : 'text.disabled' }}>
          {filters.startDate && filters.endDate
            ? `${new Date(filters.startDate).toLocaleDateString()} - ${new Date(filters.endDate).toLocaleDateString()}`
            : 'Select date range'}
        </Typography>
        <Iconify icon="eva:calendar-fill" />
      </Box>
      <CustomDateRangePicker
        startDate={filters.startDate}
        endDate={filters.endDate}
        onChangeStartDate={(newValue) => onFilters('startDate', newValue)}
        onChangeEndDate={(newValue) => onFilters('endDate', newValue)}
        open={openDateRange}
        onClose={onCloseDateRange}
        error={dateError}
      />
    </Stack>
  );

  return (
    <>
      <Button
        disableRipple
        color="inherit"
        endIcon={
          <Badge color="error" variant="dot" invisible={!canReset}>
            <Iconify icon="ic:round-filter-list" />
          </Badge>
        }
        onClick={onOpen}
      >
        Filters
      </Button>

      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        slotProps={{
          backdrop: { invisible: true },
        }}
        PaperProps={{
          sx: { width: 280 },
        }}
      >
        {renderHead}

        <Divider />

        <Stack spacing={3} sx={{ p: 2.5 }}>
          {renderJobId}
          {renderInterviewer}
          {renderStatus}
          {renderDateRange}
        </Stack>
      </Drawer>
    </>
  );
}

RecruitmentFilters.propTypes = {
  canReset: PropTypes.bool,
  dateError: PropTypes.bool,
  filters: PropTypes.object,
  onClose: PropTypes.func,
  onFilters: PropTypes.func,
  onOpen: PropTypes.func,
  onResetFilters: PropTypes.func,
  open: PropTypes.bool,
  openDateRange: PropTypes.bool,
  onCloseDateRange: PropTypes.func,
  onOpenDateRange: PropTypes.func,
}; 