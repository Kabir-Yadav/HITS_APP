import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Stack, 
  Typography, 
  IconButton,
  Button,
  Box,
  Chip 
} from '@mui/material';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';

export default function CalendarEventDetails({ event, open, onClose, onEdit, onUpdateAttendees }) {
  if (!event) {
    return null;
  }

  const handleEdit = () => {
    // Prepare the event data in the format expected by calendar-form
    const formattedEvent = {
      id: event.id,
      title: event.title,
      description: event.extendedProps?.description || '',
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      color: event.backgroundColor,
      attendees: event.extendedProps?.attendees 
        ? event.extendedProps.attendees.map(a => a.email).join(', ')
        : ''
    };
    
    onEdit(formattedEvent);
  };

  const handleRemoveAttendee = async (attendeeToRemove) => {
    try {
      // Get current event details
      const updatedAttendees = event.extendedProps.attendees.filter(
        attendee => attendee.email !== attendeeToRemove.email
      );

      // Update the event in Google Calendar
      const updatedEvent = {
        ...event,
        attendees: updatedAttendees
      };

      await window.gapi.client.calendar.events.patch({
        calendarId: 'primary',
        eventId: event.id,
        resource: {
          attendees: updatedAttendees
        },
        sendUpdates: 'all'
      });

      // Notify parent to refresh calendar
      onUpdateAttendees?.();
      toast.success('Attendee removed successfully');
    } catch (error) {
      console.error('Failed to remove attendee:', error);
      toast.error('Failed to remove attendee');
    }
  };

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle sx={{ pb: 1 }}>
        Event Details
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>
      </DialogTitle>

      <Scrollbar sx={{ p: 3, bgcolor: 'background.neutral' }}>
        <Stack spacing={3}>
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Title
            </Typography>
            <Typography variant="body2">{event.title}</Typography>
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Description
            </Typography>
            <Typography variant="body2">
              {event.extendedProps?.description || 'No description'}
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Start date
            </Typography>
            <Typography variant="body2">
              {fDateTime(event.start)}
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              End date
            </Typography>
            <Typography variant="body2">
              {fDateTime(event.end)}
            </Typography>
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Attendees
            </Typography>
            {event.extendedProps?.attendees?.length > 0 ? (
              <Stack spacing={1}>
                {event.extendedProps.attendees.map((attendee, index) => (
                  <Chip
                    key={index}
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography variant="body2">
                          {attendee.email}
                        </Typography>
                        {attendee.optional && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            (Optional)
                          </Typography>
                        )}
                      </Stack>
                    }
                    size="small"
                    icon={<Iconify icon="solar:user-rounded-bold" />}
                    onDelete={() => handleRemoveAttendee(attendee)}
                    color={attendee.responseStatus === 'accepted' ? 'success' : 'default'}
                    sx={{ 
                      maxWidth: '100%',
                      cursor: 'pointer',
                      ...(attendee.optional && {
                        bgcolor: 'action.selected',
                      }),
                      '&:hover': {
                        bgcolor: 'error.lighter',
                        '& .MuiChip-deleteIcon': {
                          color: 'error.main',
                        }
                      },
                      '& .MuiChip-label': { 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden'
                      },
                      '& .MuiChip-deleteIcon': {
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'error.main',
                        }
                      }
                    }}
                  />
                ))}
              </Stack>
            ) : (
              <Typography variant="body2">No attendees</Typography>
            )}
          </Stack>
        </Stack>
      </Scrollbar>

      <DialogActions sx={{ p: 2.5 }}>
        <Box sx={{ flexGrow: 1 }} />

        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
        >
          Close
        </Button>

        <Button
          variant="contained"
          onClick={handleEdit}
          startIcon={<Iconify icon="solar:pen-bold" />}
        >
          Edit
        </Button>
      </DialogActions>
    </Dialog>
  );
}

CalendarEventDetails.propTypes = {
  event: PropTypes.object,
  open: PropTypes.bool,
  onClose: PropTypes.func,
  onEdit: PropTypes.func,
  onUpdateAttendees: PropTypes.func,
}; 