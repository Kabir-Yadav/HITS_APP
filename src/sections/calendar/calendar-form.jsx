import { z as zod } from 'zod';
import PropTypes from 'prop-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogActions from '@mui/material/DialogActions';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { fIsAfter } from 'src/utils/format-time';

import { createEvent, updateEvent, deleteEvent, getEventDetails } from 'src/actions/calendar';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { FormProvider, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const EventSchema = zod.object({
  title: zod
    .string()
    .min(1, { message: 'Title is required!' })
    .max(100, { message: 'Title must be less than 100 characters' }),
  description: zod
    .string()
    .optional()
    .default(''),
  start: zod.any().refine(val => !isNaN(new Date(val)), {
    message: "Invalid start date"
  }),
  end: zod.any().refine(val => !isNaN(new Date(val)), {
    message: "Invalid end date"
  }),
  attendees: zod.string().optional().default(''),
});

// ----------------------------------------------------------------------

export function CalendarForm({ currentEvent, onClose, open, onEventChange }) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  const defaultValues = {
    title: '',
    description: '',
    start: new Date(),
    end: new Date(),
    attendees: '',
  };
  
  const methods = useForm({
    mode: 'onChange',
    resolver: zodResolver(EventSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    control,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = methods;

  // Reset form when opening for new event
  useEffect(() => {
    if (!currentEvent) {
      reset(defaultValues);
    }
  }, [currentEvent, reset]);

  // Fetch and set event details when editing an existing event
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!currentEvent?.id) {
        reset(defaultValues); // Reset form for new event
        return;
      }
      
      setIsLoading(true);
      try {
        const eventDetails = await getEventDetails(currentEvent.id);
        reset({
          ...eventDetails,
          start: new Date(eventDetails.start),
          end: new Date(eventDetails.end),
        });
      } catch (error) {
        console.error('Failed to fetch event details:', error);
        toast.error('Failed to load event details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventDetails();
  }, [currentEvent?.id, reset]);

  const values = watch();
  const dateError = fIsAfter(values.start, values.end);

  const onSubmit = useCallback(
    async (data, e) => {
      e.preventDefault();
      
      try {
        const { title, description, start, end, attendees } = data;
        
        // Get current user's email from Google Calendar
        const calendarList = await window.gapi.client.calendar.calendarList.get({
          calendarId: 'primary'
        });
        const organizerEmail = calendarList.result.id;
        
        // Create event directly in Google Calendar
        const event = {
          summary: title,
          description,
          start: {
            dateTime: new Date(start).toISOString(),
          },
          end: {
            dateTime: new Date(end).toISOString(),
          },
          attendees: [
            // Add organizer as first attendee with response status 'accepted'
            { email: organizerEmail, responseStatus: 'accepted' },
            // Add other attendees with optional status
            ...(attendees ? attendees.split(',').map(email => {
              const trimmedEmail = email.trim();
              const isOptional = trimmedEmail.startsWith('optional:');
              const actualEmail = isOptional ? trimmedEmail.slice(9) : trimmedEmail;
              return { 
                email: actualEmail.trim(),
                optional: isOptional,
                responseStatus: 'needsAction'
              };
            }) : []),
          ],
        };

        if (currentEvent?.id) {
          await window.gapi.client.calendar.events.update({
            calendarId: 'primary',
            eventId: currentEvent.id,
            resource: event,
            sendUpdates: 'all',
          });
        } else {
          await window.gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            sendUpdates: 'all',
          });
        }

        await onEventChange?.();
        onClose();
        toast.success('Event saved successfully!');
      } catch (error) {
        console.error('Failed to save event:', error);
        toast.error('Failed to save event. Please try again.');
      }
    },
    [currentEvent?.id, onClose, onEventChange]
  );

  const onDelete = useCallback(async () => {
    try {
      if (!currentEvent?.id) return;

      await window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: currentEvent.id,
      });

      await onEventChange?.();
      onClose();
      toast.success('Event deleted successfully!');
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event. Please try again.');
    }
  }, [currentEvent?.id, onClose, onEventChange]);

  const handleRemoveAttendee = (emailToRemove, field) => {
    const currentAttendees = field.value ? field.value.split(',').map(e => e.trim()) : [];
    const updatedAttendees = currentAttendees
      .filter(email => email !== emailToRemove)
      .join(', ');
    field.onChange(updatedAttendees);
  };

  // Add new function to toggle optional status
  const handleToggleOptional = (email, field) => {
    const currentAttendees = field.value ? field.value.split(',').map(e => e.trim()) : [];
    const updatedAttendees = currentAttendees.map(e => {
      if (e.startsWith('optional:') && e.slice(9) === email) {
        return email; // Remove optional status
      } else if (e === email) {
        return `optional:${email}`; // Add optional status
      }
      return e;
    }).join(', ');
    field.onChange(updatedAttendees);
  };

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={open}
      onClose={onClose}
      sx={{ 
        '& .MuiDialog-paper': { 
          maxHeight: 'calc(100% - 32px)',
          margin: (t) => t.spacing(2),
        }
      }}
    >
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <Scrollbar sx={{ p: 3, bgcolor: 'background.neutral' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack spacing={3}>
              <Field.Text 
                name="title" 
                label="Title" 
                helperText={errors.title?.message}
              />

              <Field.Text 
                name="description" 
                label="Description" 
                multiline 
                rows={3}
                helperText={errors.description?.message}
              />

              <Stack spacing={1.5}>
                <Typography variant="subtitle2">Attendees</Typography>
                <Field.Text 
                  name="attendees" 
                  placeholder="Add guests"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Iconify icon="solar:users-group-rounded-bold" width={24} />
                      </InputAdornment>
                    ),
                  }}
                  helperText={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Iconify icon="eva:info-fill" width={16} sx={{ color: 'info.main' }} />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Separate email addresses with commas
                      </Typography>
                    </Stack>
                  }
                />
                <Controller
                  name="attendees"
                  control={control}
                  render={({ field }) => (
                    <Box sx={{ mt: 1 }}>
                      <Stack spacing={1}>
                        {field.value && field.value.split(',').map((email, index) => {
                          const trimmedEmail = email.trim();
                          const isOptional = trimmedEmail.startsWith('optional:');
                          const displayEmail = isOptional ? trimmedEmail.slice(9) : trimmedEmail;
                          
                          return displayEmail && (
                            <Chip
                              key={index}
                              label={displayEmail}
                              size="small"
                              icon={
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Iconify icon="solar:user-rounded-bold" />
                                  {isOptional && (
                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                      (Optional)
                                    </Typography>
                                  )}
                                </Stack>
                              }
                              onDelete={() => handleRemoveAttendee(trimmedEmail, field)}
                              onClick={() => handleToggleOptional(displayEmail, field)}
                              sx={{ 
                                maxWidth: '100%',
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                },
                                ...(isOptional && {
                                  bgcolor: 'action.selected',
                                }),
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
                          );
                        })}
                      </Stack>
                    </Box>
                  )}
                />
              </Stack>

              <Field.MobileDateTimePicker 
                name="start" 
                label="Start date"
                helperText={errors.start?.message}
              />

              <Field.MobileDateTimePicker
                name="end"
                label="End date"
                slotProps={{
                  textField: {
                    error: dateError || !!errors.end,
                    helperText: dateError 
                      ? 'End date must be later than start date'
                      : errors.end?.message,
                  },
                }}
              />
            </Stack>
          )}
        </Scrollbar>

        <DialogActions sx={{ flexShrink: 0 }}>
          {!!currentEvent?.id && (
            <Tooltip title="Delete event">
              <IconButton 
                onClick={(e) => {
                  e.preventDefault();
                  onDelete();
                }}
              >
                <Iconify icon="solar:trash-bin-trash-bold" />
              </IconButton>
            </Tooltip>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <Button 
            variant="outlined" 
            color="inherit" 
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            Cancel
          </Button>

          <LoadingButton
            type="submit"
            variant="contained"
            loading={isSubmitting}
            disabled={dateError || Object.keys(errors).length > 0}
          >
            Save changes
          </LoadingButton>
        </DialogActions>
      </FormProvider>
    </Dialog>
  );
}

CalendarForm.propTypes = {
  currentEvent: PropTypes.object,
  onClose: PropTypes.func,
  open: PropTypes.bool,
  onEventChange: PropTypes.func,
};
