// pages/api/send-email.js
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = mailgun.client({ username: 'api', key: '8a084751-477ee162' });

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { emails, callLink, description, dateTime } = req.body;

    console.log('Received request body:', req.body);

    try {
      const response = await mg.messages.create('sandbox78cdf988387b4bb6a4ff0f8e4bf824d0.mailgun.org', {
        from: "Excited User <mailgun@sandbox78cdf988387b4bb6a4ff0f8e4bf824d0.mailgun.org>",
        to: 'austinkarisny@goodgainsexchange.com',
        subject: "Meeting Invitation",
        text: `You are invited to a meeting. Details:\n\nTitle: ${description}\nDate: ${dateTime}\nLink: ${callLink}`,
        html: `<h1>You are invited to a meeting.</h1><p>Details:</p><p>Title: ${description}</p><p>Date: ${dateTime}</p><p>Link: <a href="${callLink}">${callLink}</a></p>`,
      });

      console.log(response);
      res.status(200).json({ message: 'Email sent successfully', response });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: 'Error sending email', details: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
