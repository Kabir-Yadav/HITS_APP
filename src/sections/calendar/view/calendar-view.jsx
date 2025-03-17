import { toast } from 'react-hot-toast';
import Calendar from '@fullcalendar/react';
import listPlugin from '@fullcalendar/list';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import timelinePlugin from '@fullcalendar/timeline';
import interactionPlugin from '@fullcalendar/interaction';
import { useEffect, useState, startTransition } from 'react';
import { useBoolean, useSetState } from 'minimal-shared/hooks';
import googleCalendarPlugin from '@fullcalendar/google-calendar';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';

import { fDate, fIsAfter, fIsBetween } from 'src/utils/format-time';
import { initializeGoogleCalendar, fetchCalendarEvents } from 'src/utils/google-calendar';

import { DashboardContent } from 'src/layouts/dashboard';
import { CALENDAR_COLOR_OPTIONS } from 'src/_mock/_calendar';
import { updateEvent, useGetEvents } from 'src/actions/calendar';

import { Iconify } from 'src/components/iconify';

import { CalendarRoot } from '../styles';
import { useEvent } from '../hooks/use-event';
import { CalendarForm } from '../calendar-form';
import { useCalendar } from '../hooks/use-calendar';
import { CalendarToolbar } from '../calendar-toolbar';
import { CalendarFilters } from '../calendar-filters';
import CalendarEventDetails from '../calendar-event-details';
import { CalendarFiltersResult } from '../calendar-filters-result';


// ----------------------------------------------------------------------

export function CalendarView() {
  const theme = useTheme();

  const openFilters = useBoolean();
  const [isLoading, setIsLoading] = useState(true);
  const [googleEvents, setGoogleEvents] = useState([]);

  const { events, eventsLoading } = useGetEvents();

  const filters = useSetState({ colors: [], startDate: null, endDate: null });
  const { state: currentFilters } = filters;

  const dateError = fIsAfter(currentFilters.startDate, currentFilters.endDate);

  const {
    calendarRef,
    /********/
    view,
    date,
    /********/
    onDatePrev,
    onDateNext,
    onDateToday,
    onDropEvent,
    onChangeView,
    onSelectRange,
    onClickEvent,
    onResizeEvent,
    onInitialView,
    /********/
    openForm,
    onOpenForm,
    onCloseForm,
    /********/
    selectEventId,
    selectedRange,
    /********/
    onClickEventInFilters,
  } = useCalendar();

  const currentEvent = useEvent(events, selectEventId, selectedRange, openForm);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [dialogState, setDialogState] = useState({
    details: false,
    form: false
  });

  const handleCloseDetails = () => {
    setDialogState(prev => ({ ...prev, details: false }));
    setSelectedEvent(null);
  };

  const handleCloseForm = async () => {
    setDialogState(prev => ({ ...prev, form: false }));
    setSelectedEvent(null);
    await refreshCalendarEvents();
  };

  const handleEditEvent = (eventData) => {
    setDialogState({
      details: false,
      form: true
    });
    setSelectedEvent(eventData);
  };

  const onClickEventInCalendar = (info) => {
    if (info.event.extendedProps?.source === 'google') {
      setSelectedEvent(info.event);
      setDialogState(prev => ({ ...prev, details: true }));
    } else {
      // Handle your existing event click logic
    }
  };

  useEffect(() => {
    onInitialView();
  }, [onInitialView]);

  useEffect(() => {
    const initCalendar = async () => {
      try {
        setIsLoading(true);
        await initializeGoogleCalendar();
        await refreshCalendarEvents();
      } catch (error) {
        console.error('Error initializing calendar:', error);
        toast.error('Failed to load calendar events. Please try again.');
      }
    };

    initCalendar();
  }, [theme.vars.palette.primary.main, theme.vars.palette.secondary.main]);

  const canReset =
    currentFilters.colors.length > 0 || (!!currentFilters.startDate && !!currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: googleEvents,
    filters: currentFilters,
    dateError,
  });

  const renderResults = () => (
    <CalendarFiltersResult
      filters={filters}
      totalResults={dataFiltered.length}
      sx={{ mb: { xs: 3, md: 5 } }}
    />
  );

  const flexStyles = {
    flex: '1 1 auto',
    display: 'flex',
    flexDirection: 'column',
  };

  const handleNewEvent = () => {
    setSelectedEvent(null); // Clear any selected event
    setDialogState({
      details: false,
      form: true
    });
  };

  const refreshCalendarEvents = async () => {
    try {
      setIsLoading(true);
      const calendarEvents = await fetchCalendarEvents();
      
      const formattedEvents = calendarEvents.map(event => ({
        id: event.id,
        title: event.summary || 'Untitled Event',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !event.start?.dateTime,
        color: event.colorId === '1' ? theme.vars.palette.primary.main : theme.vars.palette.secondary.main,
        extendedProps: {
          source: 'google',
          description: event.description,
          attendees: event.attendees || [],
          calendar: event.organizer?.email || 'primary'
        }
      }));

      setGoogleEvents(formattedEvents);
    } catch (error) {
      console.error('Error refreshing calendar events:', error);
      toast.error('Failed to refresh calendar events');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DashboardContent maxWidth="xl" sx={{ ...flexStyles }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: { xs: 3, md: 5 },
          }}
        >
          <Typography variant="h4">Calendar</Typography>
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={handleNewEvent}
          >
            New event
          </Button>
        </Box>

        {canReset && renderResults()}

        <Card
          sx={{
            ...flexStyles,
            minHeight: '50vh',
          }}
        >
          <CalendarRoot
            sx={{
              ...flexStyles,
              '.fc.fc-media-screen': { flex: '1 1 auto' },
            }}
          >
            <CalendarToolbar
              date={fDate(date)}
              view={view}
              loading={isLoading}
              onNextDate={onDateNext}
              onPrevDate={onDatePrev}
              onToday={onDateToday}
              onChangeView={onChangeView}
              onOpenFilters={openFilters.onTrue}
            />

            <Calendar
              weekends
              editable
              droppable
              selectable
              rerenderDelay={10}
              allDayMaintainDuration
              eventResizableFromStart
              ref={calendarRef}
              initialDate={date}
              initialView={view}
              dayMaxEventRows={3}
              eventDisplay="block"
              headerToolbar={false}
              select={onSelectRange}
              eventClick={onClickEventInCalendar}
              events={dataFiltered}
              eventDrop={(arg) => {
                if (arg.event.extendedProps.source === 'google') {
                  arg.revert();
                  return;
                }
                startTransition(() => {
                  onDropEvent(arg, updateEvent);
                });
              }}
              eventResize={(arg) => {
                if (arg.event.extendedProps.source === 'google') {
                  arg.revert();
                  return;
                }
                startTransition(() => {
                  onResizeEvent(arg, updateEvent);
                });
              }}
              plugins={[
                listPlugin,
                dayGridPlugin,
                timelinePlugin,
                timeGridPlugin,
                interactionPlugin,
                googleCalendarPlugin,
              ]}
            />
          </CalendarRoot>
        </Card>
      </DashboardContent>

      <CalendarEventDetails 
        event={selectedEvent}
        open={dialogState.details}
        onClose={handleCloseDetails}
        onEdit={handleEditEvent}
        onUpdateAttendees={refreshCalendarEvents}
      />

      <CalendarForm
        currentEvent={selectedEvent}
        onClose={handleCloseForm}
        onEventChange={refreshCalendarEvents}
        colorOptions={CALENDAR_COLOR_OPTIONS}
        open={dialogState.form}
      />

      <CalendarFilters
        events={events}
        filters={filters}
        canReset={canReset}
        dateError={dateError}
        open={openFilters.value}
        onClose={openFilters.onFalse}
        onClickEvent={onClickEventInFilters}
        colorOptions={CALENDAR_COLOR_OPTIONS}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, filters, dateError }) {
  const { colors, startDate, endDate } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  inputData = stabilizedThis.map((el) => el[0]);

  if (colors.length) {
    inputData = inputData.filter((event) => colors.includes(event.color));
  }

  if (!dateError) {
    if (startDate && endDate) {
      inputData = inputData.filter((event) => fIsBetween(event.start, startDate, endDate));
    }
  }

  return inputData;
}
