"use client";

import React, { useState, useEffect, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { ClerkProvider, useUser, SignIn, SignedIn, SignedOut, UserButton, OrganizationSwitcher, useOrganization } from '@clerk/nextjs';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Typography,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import { useStreamVideoClient, Call } from '@stream-io/video-react-sdk';
import { useGetCalls } from '@/hooks/useGetCalls';
import Loader from '@/components/Loader';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { v4 as uuidv4 } from 'uuid';

const GlobalStyle = createGlobalStyle`
  body {
    font-family: 'Roboto', sans-serif;
    background-color: #f1f3f4;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
`;

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 75vh; /* 25% smaller */
  width: 75vw; /* 25% smaller */
  overflow: hidden;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e0e0e0;
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  background-color: #f1f3f4;
  padding: 10px 20px;
  overflow: hidden;
`;

const CalendarWrapper = styled.div`
  display: flex;
  flex-grow: 1;
  justify-content: space-between;
  overflow: hidden;
`;

const CalendarContainer = styled.div`
  flex-grow: 1;
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  margin-right: 20px;
`;

const StyledButton = styled(Button)`
  background-color: #1a73e8 !important;
  color: white !important;
  &:hover {
    background-color: #1765cc !important;
  }
`;

const MiniCalendarContainer = styled.div`
  width: 280px; /* Slightly smaller */
  background-color: white;
  border-radius: 8px;
  padding: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const ViewButtons = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const initialValues = {
  dateTime: new Date(),
  endTime: new Date(),
  description: '',
  link: '',
  title: '',
  emails: '',
};

const sendEmailInvite = async (emails: string[], callLink: string, description: string, dateTime: string) => {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails,
        callLink,
        description,
        dateTime,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send email invite');
    }

    console.log('Email invite sent successfully');
  } catch (error) {
    console.error('Error sending email invite:', error);
  }
};

const CalendarPage = () => {
  const { user } = useUser();
  const { organization } = useOrganization();
  const { upcomingCalls } = useGetCalls();
  const [calls, setCalls] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [ MeetingState, setMeetingState] = useState<'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined>(undefined);
  const [values, setValues] = useState(initialValues);
  const [callDetail, setCallDetail] = useState<Call | null>(null);
  const client = useStreamVideoClient();
  const { toast } = useToast();
  const localizer = momentLocalizer(moment);
  const [view, setView] = useState(Views.MONTH); // Default view is month
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    if (user && user.publicMetadata.calls) {
      setCalls(calls);
    }
  }, [user]);

  const uniqueCallEvents = useMemo(() => {
    if (upcomingCalls) {
      return upcomingCalls
        .map((call) => ({
          id: call.id,
          title: call.state.custom?.description || 'Scheduled Call',
          start: call.state.startsAt ? new Date(call.state.startsAt) : new Date(), // Handle undefined case
          end: call.state.startsAt ? new Date(call.state.startsAt) : new Date(), // Assuming 1-hour duration, adjust as needed
          allDay: false,
          organizationId: call.state.custom?.organizationId || '',
        }))
        .filter((callEvent) => !calls.some((call: { id: string }) => call.id === callEvent.id));
    }
    return [];
  }, [upcomingCalls, calls]);

  useEffect(() => {
    if (uniqueCallEvents.length > 0) {
      setCalls((prevCalls) => [...prevCalls, ...uniqueCallEvents]);
    }
  }, [uniqueCallEvents]);

  const filteredCalls = useMemo(() => {
    if (organization) {
      return calls.filter((call) => (call as { organizationId: string }).organizationId === organization.id);
    }
    return calls.filter((call) => !(call as { organizationId: string }).organizationId);
  }, [calls, organization]);

  const saveCalls = async (updatedCalls: any[]) => {
    setCalls;
    if (user) {
      try {
        const publicMetadata: Partial<{
          username: string;
          firstName: string;
          lastName: string;
          primaryEmailAddressId: string;
          primaryPhoneNumberId: string;
          primaryWeb3WalletId: string;
          calls: any[];
        }> = { ...user.publicMetadata, calls: updatedCalls };
        await user.update(publicMetadata);
      } catch (error) {
        console.error('Error updating calls:', error);
      }
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date, end: Date }) => {
    setValues({ ...values, dateTime: start, endTime: end });
    setMeetingState(MeetingState);
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setValues(initialValues);
  };

  const createMeeting = async () => {
    if (!client || !user) {
      console.error('Stream Video Client or user is not initialized.');
      return;
    }

    try {
      if (!values.dateTime) {
        toast({ title: 'Please select a date and time' });
        return;
      }

      const id = uuidv4();
      const call = client.call('default', id);

      if (!call) throw new Error('Failed to create meeting');

      const startsAt = values.dateTime.toISOString();
      const endsAt = values.endTime.toISOString();
      const description = values.description || 'Scheduled Meeting';

      await call.getOrCreate({
        data: {
          starts_at: startsAt,
          custom: {
            description,
            organizationId: organization ? organization.id : undefined,
          },
        },
      });

      setCallDetail( callDetail );
      toast({
        title: 'Meeting Created',
      });

      const callToAdd = {
        id: call.id,
        title: values.title,
        start: new Date(startsAt),
        end: new Date(endsAt),
        allDay: false,
        organizationId: organization ? organization.id : undefined,
      };

      const updatedCalls = [...calls, callToAdd];
      await saveCalls(updatedCalls);

      const callLink = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${call.id}`;
      window.prompt('Share this link for the scheduled call:', callLink);

      const emailsArray = values.emails.split(',').map(email => email.trim());
      await sendEmailInvite(emailsArray, callLink, description, startsAt);

      setOpenDialog(false);
      setValues(initialValues);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast({ title: 'Failed to create Meeting' });
    }
  };

  const handleSelectCall = (call: { id: any; title: any; start: any; }) => {
    const emails = window.prompt('Enter emails to invite to this meeting (comma separated):', '');
    if (emails) {
      const callLink = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${call.id}`;
      const emailsArray = emails.split(',').map(email => email.trim());
      sendEmailInvite(emailsArray, callLink, call.title, call.start);
    }
  };

  const handleNavigate = (newDate: React.SetStateAction<Date>) => {
    setDate(newDate);
  };

  if (!client || !user) return <Loader />;

  return (
    <AppContainer>
      <GlobalStyle />
      <Header>
        <Typography variant="h6" noWrap>
          Calendar
        </Typography>
        <TextField
          placeholder="Search for people"
          InputProps={{
            startAdornment: <SearchIcon style={{ marginRight: 8 }} />,
          }}
          variant="outlined"
        />
        <OrganizationSwitcher />
        <UserButton />
      </Header>
      <MainContent>
        <CalendarWrapper>
          <CalendarContainer>
            <ViewButtons>
              <Box display="flex" flexDirection="row">
                <Button onClick={() => handleNavigate(new Date())}>Today</Button>
                <Button onClick={() => handleNavigate(moment(date).subtract(1, 'month').toDate())}>
                  Back
                </Button>
                <Button onClick={() => handleNavigate(moment(date).add(1, 'month').toDate())}>
                  Next
                </Button>
              </Box>
              <Box display="flex" flexDirection="row">
                <Button onClick={() => setView(Views.MONTH)}>Month</Button>
                <Button onClick={() => setView(Views.WEEK)}>Week</Button>
                <Button onClick={() => setView(Views.DAY)}>Day</Button>
              </Box>
            </ViewButtons>
            <Calendar
              localizer={localizer}
              events={filteredCalls}
              startAccessor="start"
              endAccessor="end"
              selectable
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectCall}
              views={{ month: true, week: true, day: true }}
              view={view}
              date={date}
              onNavigate={handleNavigate}
              onView={setView}
              step={60}
              showMultiDayTimes
              defaultDate={new Date()}
              popup
              resizable
              style={{ height: 'calc(75vh - 160px)', borderRadius: '8px' }} /* Adjusted height */
            />
          </CalendarContainer>
          <div>
            <MiniCalendarContainer>
              <ReactDatePicker
                selected={values.dateTime}
                onChange={(date) => {
                  setValues({ ...values, dateTime: date! });
                  setMeetingState('isScheduleMeeting');
                  setOpenDialog(true); // Open the dialog when a date is selected
                }}
                inline
              />
              <TextField
                type="time"
                fullWidth
                margin="dense"
                value={moment(values.dateTime).format('HH:mm')}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const updatedDate = new Date(values.dateTime);
                  updatedDate.setHours(parseInt(hours));
                  updatedDate.setMinutes(parseInt(minutes));
                  setValues({ ...values, dateTime: updatedDate });
                }}
              />
            </MiniCalendarContainer>
          </div>
        </CalendarWrapper>
        <Dialog open={openDialog} onClose={handleDialogClose}>
          <DialogTitle>
            Schedule New Call
            <IconButton
              aria-label="close"
              onClick={handleDialogClose}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Call Title"
              fullWidth
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
            />
            <Textarea
              className="border-none bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder="Description"
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Invite Emails (comma separated)"
              fullWidth
              value={values.emails}
              onChange={(e) => setValues({ ...values, emails: e.target.value })}
            />
            <TextField
              label="Start Time"
              type="datetime-local"
              fullWidth
              value={moment(values.dateTime).format('YYYY-MM-DDTHH:mm')}
              onChange={(e) => setValues({ ...values, dateTime: new Date(e.target.value) })}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="End Time"
              type="datetime-local"
              fullWidth
              value={moment(values.endTime).format('YYYY-MM-DDTHH:mm')}
              onChange={(e) => setValues({ ...values, endTime: new Date(e.target.value) })}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <Typography variant="h6" gutterBottom>
              Organization
            </Typography>
            <OrganizationSwitcher />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDialogClose}>Cancel</Button>
            <StyledButton onClick={createMeeting}>Add Call</StyledButton>
          </DialogActions>
        </Dialog>
      </MainContent>
    </AppContainer>
  );
};

export default CalendarPage;
