import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';

import { alpha } from '@mui/material/styles';
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
              Google Meet
            </Typography>
            {event.extendedProps?.hangoutLink ? (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                  border: (theme) => `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                }}
              >
                <Stack spacing={2}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      component="img"
                      src="https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v1/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png"
                      sx={{ width: 24, height: 24 }}
                    />
                    <Typography variant="subtitle2" sx={{ color: 'primary.main' }}>
                      Google Meet Conference
                    </Typography>
                  </Stack>

                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    startIcon={<Iconify icon="mdi:video" />}
                    href={event.extendedProps.hangoutLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      bgcolor: 'primary.main',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                    }}
                  >
                    Join Meeting
                  </Button>

                  <Stack 
                    direction="row" 
                    alignItems="center" 
                    spacing={1}
                    sx={{
                      p: 1.5,
                      borderRadius: 1,
                      typography: 'caption',
                      bgcolor: (theme) => alpha(theme.palette.grey[500], 0.08),
                    }}
                  >
                    <Iconify icon="eva:link-2-fill" width={16} sx={{ color: 'text.secondary' }} />
                    <Box component="span" sx={{ 
                      color: 'text.secondary',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {event.extendedProps.hangoutLink}
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />
                    <IconButton
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(event.extendedProps.hangoutLink);
                        toast.success('Meeting link copied to clipboard!');
                      }}
                      sx={{ 
                        p: 0.5,
                        color: 'text.secondary',
                        '&:hover': { bgcolor: 'action.hover' },
                      }}
                    >
                      <Iconify icon="eva:copy-fill" width={16} />
                    </IconButton>
                  </Stack>
                </Stack>
              </Box>
            ) : (
              <Typography variant="body2">No meeting link</Typography>
            )}
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
              Organizer
            </Typography>
            {event.extendedProps?.attendees?.find(attendee => attendee.responseStatus === 'accepted') ? (
              <Chip
                label={
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="body2">
                      {event.extendedProps.attendees.find(attendee => attendee.responseStatus === 'accepted').email}
                    </Typography>
                    <Box component="span" sx={{ color: 'text.secondary', ml: 0.5 }}>
                      (Organizer)
                    </Box>
                  </Stack>
                }
                size="small"
                icon={<Iconify icon="solar:user-id-bold" />}
                color="primary"
                sx={{ 
                  maxWidth: '100%',
                  '& .MuiChip-label': { 
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }
                }}
              />
            ) : (
              <Typography variant="body2">No organizer</Typography>
            )}
          </Stack>

          <Stack spacing={1.5}>
            <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
              Attendees
            </Typography>
            {event.extendedProps?.attendees?.filter(attendee => attendee.responseStatus !== 'accepted').length > 0 ? (
              <Stack spacing={1}>
                {event.extendedProps.attendees
                  .filter(attendee => attendee.responseStatus !== 'accepted')
                  .map((attendee, index) => (
                  <Chip
                    key={index}
                    label={
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: attendee.optional ? '#fff' : 'inherit',
                            textShadow: attendee.optional ? '0px 0px 1px rgba(0,0,0,0.5)' : 'none'
                          }}
                        >
                          {attendee.email}
                          {attendee.optional && (
                            <Box component="span" sx={{ color: 'rgba(255,255,255,0.8)', ml: 0.5 }}>
                              (Optional)
                            </Box>
                          )}
                        </Typography>
                      </Stack>
                    }
                    size="small"
                    icon={<Iconify icon="solar:user-rounded-bold" sx={{ color: attendee.optional ? '#fff' : 'inherit' }} />}
                    onDelete={() => handleRemoveAttendee(attendee)}
                    color={attendee.responseStatus === 'accepted' ? 'success' : 'default'}
                    sx={{ 
                      maxWidth: '100%',
                      cursor: 'pointer',
                      ...(attendee.optional && {
                        bgcolor: 'primary.main',
                        '& .MuiChip-deleteIcon': {
                          color: '#fff',
                        }
                      }),
                      '&:hover': {
                        bgcolor: attendee.optional ? 'primary.dark' : 'error.lighter',
                        '& .MuiChip-deleteIcon': {
                          color: attendee.optional ? '#fff' : 'error.main',
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
                          color: attendee.optional ? '#fff' : 'error.main',
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