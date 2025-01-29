import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';

import { fDateRangeShortLabel } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { CustomDateRangePicker } from 'src/components/custom-date-range-picker';

// ----------------------------------------------------------------------

export function JobFilters({ 
  open, 
  onOpen, 
  onClose, 
  filters, 
  options,
  canReset,
  dateError,
  openDateRange,
  onOpenDateRange,
  onCloseDateRange,
}) {
  const { state: currentFilters, resetFilters, setFilters } = filters;

  const handleFilterJoiningType = useCallback(
    (joiningType) => {
      const checked = currentFilters.joiningType.includes(joiningType);

      const newValue = checked
        ? currentFilters.joiningType.filter((value) => value !== joiningType)
        : [...currentFilters.joiningType, joiningType];

      setFilters('joiningType', newValue);
    },
    [currentFilters.joiningType, setFilters]
  );

  const handleFilterIsInternship = useCallback(
    (event) => {
      setFilters('isInternship', event.target.value);
    },
    [setFilters]
  );

  const handleFilterJobId = useCallback(
    (event) => {
      setFilters('jobId', event.target.value);
    },
    [setFilters]
  );

  const handleFilterPostedBy = useCallback(
    (event) => {
      setFilters('posted_by', event.target.value);
    },
    [setFilters]
  );

  const handleFilterStartDate = useCallback(
    (newValue) => {
      setFilters('startDate', newValue);
    },
    [setFilters]
  );

  const handleFilterEndDate = useCallback(
    (newValue) => {
      setFilters('endDate', newValue);
    },
    [setFilters]
  );

  const renderHead = () => (
    <>
      <Box
        sx={{
          py: 2,
          pr: 1,
          pl: 2.5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Filters
        </Typography>

        <Tooltip title="Reset">
          <IconButton onClick={() => resetFilters()}>
            <Badge color="error" variant="dot" invisible={!canReset}>
              <Iconify icon="solar:restart-bold" />
            </Badge>
          </IconButton>
        </Tooltip>

        <IconButton onClick={onClose}>
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </Box>

      <Divider sx={{ borderStyle: 'dashed' }} />
    </>
  );

  const renderJobId = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Job ID
      </Typography>

      <TextField
        fullWidth
        size="small"
        value={currentFilters.jobId}
        onChange={handleFilterJobId}
        placeholder="Enter job ID..."
      />
    </Box>
  );

  const renderPostedBy = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        HR Filter
      </Typography>

      <TextField
        fullWidth
        size="small"
        value={currentFilters.posted_by}
        onChange={handleFilterPostedBy}
        placeholder="Enter name or email..."
      />
    </Box>
  );

  const renderJoiningType = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Joining Type
      </Typography>
      {options.joiningTypes.map((type) => (
        <FormControlLabel
          key={type}
          control={
            <Checkbox
              checked={currentFilters.joiningType.includes(type)}
              onClick={() => handleFilterJoiningType(type)}
            />
          }
          label={type}
        />
      ))}
    </Box>
  );

  const renderIsInternship = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Job Type
      </Typography>

      <FormControl fullWidth size="small">
        <Select
          value={currentFilters.isInternship}
          onChange={handleFilterIsInternship}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="true">Internship</MenuItem>
          <MenuItem value="false">Full Time</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );

  const renderDateRange = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Date Range
      </Typography>

      <Button
        color="inherit"
        onClick={onOpenDateRange}
        endIcon={
          <Iconify
            icon={openDateRange ? 'eva:arrow-ios-upward-fill' : 'eva:arrow-ios-downward-fill'}
            sx={{ ml: -0.5 }}
          />
        }
      >
        {!!currentFilters.startDate && !!currentFilters.endDate
          ? fDateRangeShortLabel(currentFilters.startDate, currentFilters.endDate)
          : 'Select date range'}
      </Button>

      <CustomDateRangePicker
        variant="calendar"
        startDate={currentFilters.startDate}
        endDate={currentFilters.endDate}
        onChangeStartDate={handleFilterStartDate}
        onChangeEndDate={handleFilterEndDate}
        open={openDateRange}
        onClose={onCloseDateRange}
        selected={!!currentFilters.startDate && !!currentFilters.endDate}
        error={dateError}
      />
    </Box>
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
        slotProps={{ backdrop: { invisible: true } }}
        PaperProps={{ sx: { width: 320 } }}
      >
        {renderHead()}

        <Scrollbar sx={{ px: 2.5, py: 3 }}>
          <Stack spacing={3}>
            {renderJobId()}
            {renderPostedBy()}
            {renderJoiningType()}
            {renderIsInternship()}
            {renderDateRange()}
          </Stack>
        </Scrollbar>
      </Drawer>
    </>
  );
}
