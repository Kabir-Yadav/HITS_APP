import { z as zod } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';

import { fIsAfter } from 'src/utils/format-time';

import { createEvent, updateEvent, deleteEvent, getEventDetails } from 'src/actions/calendar';

import { toast } from 'src/components/snackbar';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { ColorPicker } from 'src/components/color-utils';
import { FormProvider, Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

export const EventSchema = zod.object({
  title: zod
    .string()
    .min(1, { message: 'Title is required!' })
    .max(100, { message: 'Title must be less than 100 characters' }),
  description: zod
    .string()
    .min(1, { message: 'Description is required!' })
    .min(50, { message: 'Description must be at least 50 characters' }),
  // Not required
  color: zod.string(),
  allDay: zod.boolean(),
  start: zod.union([zod.string(), zod.number()]),
  end: zod.union([zod.string(), zod.number()]),
  attendees: zod.string().optional(),
});

// ----------------------------------------------------------------------

export function CalendarForm({ currentEvent, colorOptions, onClose }) {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  
  const methods = useForm({
    mode: 'all',
    resolver: zodResolver(EventSchema),
    defaultValues: {
      title: '',
      description: '',
      allDay: false,
      start: new Date(),
      end: new Date(),
      color: theme.vars.palette.primary.main,
      attendees: '',
    },
  });

  const {
    reset,
    watch,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  // Fetch and set event details when editing an existing event
  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!currentEvent?.id) return;
      
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
    async (data) => {
      try {
        const { title, description, allDay, start, end, color, attendees } = data;
        
        // Create event directly in Google Calendar
        const event = {
          summary: title,
          description,
          start: {
            dateTime: allDay ? undefined : new Date(start).toISOString(),
            date: allDay ? new Date(start).toISOString().split('T')[0] : undefined,
          },
          end: {
            dateTime: allDay ? undefined : new Date(end).toISOString(),
            date: allDay ? new Date(end).toISOString().split('T')[0] : undefined,
          },
          colorId: color === theme.vars.palette.primary.main ? '1' : '2',
          attendees: attendees ? attendees.split(',').map(email => ({ email: email.trim() })) : [],
        };

        if (currentEvent?.id) {
          // Update existing event
          await window.gapi.client.calendar.events.update({
            calendarId: 'primary',
            eventId: currentEvent.id,
            resource: event,
            sendUpdates: 'all',
          });
        } else {
          // Create new event
          await window.gapi.client.calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            sendUpdates: 'all',
          });
        }

        onClose();
        toast.success('Event saved successfully!');
      } catch (error) {
        console.error('Failed to save event:', error);
        toast.error('Failed to save event. Please try again.');
      }
    },
    [currentEvent?.id, onClose]
  );

  const onDelete = useCallback(async () => {
    try {
      if (!currentEvent?.id) return;

      await window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: currentEvent.id,
      });

      onClose();
      toast.success('Event deleted successfully!');
    } catch (error) {
      console.error('Failed to delete event:', error);
      toast.error('Failed to delete event. Please try again.');
    }
  }, [currentEvent?.id, onClose]);

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Scrollbar sx={{ p: 3, bgcolor: 'background.neutral' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3}>
            <Field.Text name="title" label="Title" />

            <Field.Text name="description" label="Description" multiline rows={3} />

            <Field.Text 
              name="attendees" 
              label="Attendees" 
              placeholder="Enter email addresses separated by commas"
              helperText="Example: guest1@example.com, guest2@example.com"
            />

            <Field.Switch name="allDay" label="All day" />

            <Field.MobileDateTimePicker name="start" label="Start date" />

            <Field.MobileDateTimePicker
              name="end"
              label="End date"
              slotProps={{
                textField: {
                  error: dateError,
                  helperText: dateError ? 'End date must be later than start date' : null,
                },
              }}
            />

            <Controller
              name="color"
              control={control}
              render={({ field }) => (
                <ColorPicker
                  value={field.value}
                  onChange={(color) => field.onChange(color)}
                  options={colorOptions}
                />
              )}
            />
          </Stack>
        )}
      </Scrollbar>

      <DialogActions sx={{ flexShrink: 0 }}>
        {!!currentEvent?.id && (
          <Tooltip title="Delete event">
            <IconButton onClick={onDelete}>
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        )}

        <Box sx={{ flexGrow: 1 }} />

        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>

        <LoadingButton
          type="submit"
          variant="contained"
          loading={isSubmitting}
          disabled={dateError}
        >
          Save changes
        </LoadingButton>
      </DialogActions>
    </FormProvider>
  );
}
