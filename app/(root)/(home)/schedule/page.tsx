"use client";

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import formData from 'form-data';
import Mailgun from 'mailgun.js';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';

const initialValues = {
  emails: '',
  title: '',
  description: '',
};

const MAILGUN_API_KEY = 'a2d5e917e43002ca2eb44c3df2677024-afce6020-dc29916c';
const MAILGUN_DOMAIN = 'goodgainswork.com';

const SchedulePage = () => {
  const searchParams = useSearchParams();
  const host = searchParams.get('host');
  const date = searchParams.get('date');
  const { user } = useUser();
  const { toast } = useToast();

  const [values, setValues] = useState(initialValues);
  const [openDialog, setOpenDialog] = useState(false);

  const handleDialogClose = () => {
    setOpenDialog(false);
    setValues(initialValues);
  };

  const sendEmailInvite = async (emails: string[], callLink: string, description: string, dateTime: string) => {
    const mailgun = new Mailgun(formData);
    const mg = mailgun.client({ username: 'api', key: MAILGUN_API_KEY });

    try {
      const response = await mg.messages.create(MAILGUN_DOMAIN, {
        from: `Excited User <mailgun@${MAILGUN_DOMAIN}>`,
        to: emails,
        subject: 'Meeting Invitation',
        text: `You are invited to a meeting. Details:\n\nTitle: ${description}\nDate: ${dateTime}\nLink: ${callLink}`,
        html: `<h1>You are invited to a meeting.</h1><p>Details:</p><p>Title: ${description}</p><p>Date: ${dateTime}</p><p>Link: <a href="${callLink}">${callLink}</a></p>`,
      });

      console.log('Mailgun response:', response);
      toast({
        title: 'Email sent successfully',
        description: 'Your meeting invitation email has been sent.',
        status: 'success',
      });
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Error sending email',
        description: 'There was an error sending your meeting invitation email.',
        status: 'error',
      });
    }
  };

  const handleScheduleMeeting = async () => {
    const callLink = `http://localhost:3000/meeting/${uuidv4()}`; // Replace with your actual base URL if different
    const emailsArray = values.emails.split(',').map((email) => email.trim());
    await sendEmailInvite(emailsArray, callLink, values.description, date!);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <Typography variant="h4" gutterBottom>
        Schedule Meeting
      </Typography>
      <Button variant="contained" color="primary" onClick={() => setOpenDialog(true)}>
        Schedule Meeting
      </Button>
      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>Schedule New Call</DialogTitle>
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom>
            Host: {user ? user.fullName : 'Unknown'}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            Date: {new Date(date!).toLocaleString()}
          </Typography>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleScheduleMeeting}>
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default SchedulePage;
