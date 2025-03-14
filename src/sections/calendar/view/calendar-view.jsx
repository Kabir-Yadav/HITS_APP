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
import { initGoogleCalendarApi, authenticateGoogleCalendar, isAuthorizedDomain } from 'src/utils/google-calendar';

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
import { CalendarFiltersResult } from '../calendar-filters-result';


// ----------------------------------------------------------------------

export function CalendarView() {
  const theme = useTheme();

  const openFilters = useBoolean();
  const [isGoogleCalendarInitialized, setIsGoogleCalendarInitialized] = useState(false);
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

  useEffect(() => {
    onInitialView();
  }, [onInitialView]);

  useEffect(() => {
    const initGoogleCalendar = async () => {
      if (!isAuthorizedDomain()) {
        console.error('Current domain is not authorized for Google Calendar API');
        return;
      }

      try {
        const gapi = await initGoogleCalendarApi();
        const token = await authenticateGoogleCalendar();
        
        if (!token) {
          console.error('Failed to get access token');
          return;
        }

        // Load events from Google Calendar
        const response = await gapi.client.calendar.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          showDeleted: false,
          singleEvents: true,
          maxResults: 100,
          orderBy: 'startTime',
        });

        if (!response.result) {
          console.error('No response from Google Calendar API');
          return;
        }

        const googleEventsList = response.result.items || [];
        const formattedEvents = googleEventsList.map(event => ({
          id: event.id,
          title: event.summary,
          start: event.start.dateTime || event.start.date,
          end: event.end.dateTime || event.end.date,
          color: theme.vars.palette.primary.main,
          textColor: theme.vars.palette.common.white,
          source: 'google',
        }));

        setGoogleEvents(formattedEvents);
        setIsGoogleCalendarInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Google Calendar:', error);
        // Reset state on error
        setGoogleEvents([]);
        setIsGoogleCalendarInitialized(false);
      }
    };

    initGoogleCalendar();
  }, [theme.vars.palette.primary.main, theme.vars.palette.common.white]);

  const canReset =
    currentFilters.colors.length > 0 || (!!currentFilters.startDate && !!currentFilters.endDate);

  const dataFiltered = applyFilter({
    inputData: [...events, ...googleEvents],
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
            onClick={onOpenForm}
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
              canReset={canReset}
              loading={eventsLoading}
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
              eventClick={onClickEvent}
              aspectRatio={3}
              events={dataFiltered}
              eventDrop={(arg) => {
                if (arg.event.extendedProps.source === 'google') {
                  // Don't allow editing Google Calendar events
                  arg.revert();
                  return;
                }
                startTransition(() => {
                  onDropEvent(arg, updateEvent);
                });
              }}
              eventResize={(arg) => {
                if (arg.event.extendedProps.source === 'google') {
                  // Don't allow editing Google Calendar events
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

      <Dialog
        fullWidth
        maxWidth="xs"
        open={openForm}
        onClose={onCloseForm}
        transitionDuration={{
          enter: theme.transitions.duration.shortest,
          exit: theme.transitions.duration.shortest - 80,
        }}
        PaperProps={{
          sx: {
            display: 'flex',
            overflow: 'hidden',
            flexDirection: 'column',
            '& form': {
              ...flexStyles,
              minHeight: 0,
            },
          },
        }}
      >
        <DialogTitle sx={{ minHeight: 76 }}>
          {openForm && <> {currentEvent?.id ? 'Edit' : 'Add'} event</>}
        </DialogTitle>

        <CalendarForm
          currentEvent={currentEvent}
          colorOptions={CALENDAR_COLOR_OPTIONS}
          onClose={onCloseForm}
        />
      </Dialog>

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
