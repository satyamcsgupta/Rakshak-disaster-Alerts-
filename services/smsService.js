const User = require('../models/User');

const splitPhones = (value = '') => value
  .split(',')
  .map((phone) => phone.trim())
  .filter(Boolean);

const maskPhone = (phone = '') => phone.length > 4
  ? `${'*'.repeat(Math.max(phone.length - 4, 0))}${phone.slice(-4)}`
  : phone;

const buildMapsUrl = (sos) => {
  if (sos.locationSource !== 'gps' || sos.latitude === null || sos.longitude === null) {
    return '';
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${sos.latitude},${sos.longitude}`;
};

const buildSOSMessage = (sos) => {
  const mapsUrl = buildMapsUrl(sos);
  return [
    `Rakshak SOS: ${sos.userName || 'Someone'} needs help.`,
    `State: ${sos.state || 'N/A'}`,
    `City: ${sos.city || 'N/A'}`,
    `Message: ${sos.distressMessage || 'I am in trouble'}`,
    mapsUrl ? `Route: ${mapsUrl}` : 'Exact GPS not available. Use state/city fallback.'
  ].join(' ');
};

const getRecipients = async (sos) => {
  const recipients = new Set(splitPhones(process.env.ADMIN_ALERT_PHONE || ''));

  if (sos.user) {
    const user = await User.findById(sos.user).select('emergencyContactPhone');
    if (user?.emergencyContactPhone) {
      recipients.add(user.emergencyContactPhone);
    }
  }

  return Array.from(recipients);
};

const sendTwilioSMS = async ({ to, body }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio environment variables are incomplete.');
  }

  const params = new URLSearchParams();
  params.set('From', from);
  params.set('To', to);
  params.set('Body', body);

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!response.ok) {
    throw new Error(`Twilio SMS failed with status ${response.status}`);
  }
};

const sendWebhookSMS = async ({ to, body }) => {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) {
    throw new Error('SMS_WEBHOOK_URL is not configured.');
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (process.env.SMS_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${process.env.SMS_WEBHOOK_TOKEN}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ to, body })
  });

  if (!response.ok) {
    throw new Error(`SMS webhook failed with status ${response.status}`);
  }
};

const sendSMS = async ({ to, body }) => {
  const provider = (process.env.SMS_PROVIDER || '').toLowerCase();

  if (provider === 'twilio') {
    await sendTwilioSMS({ to, body });
    return;
  }

  if (provider === 'webhook') {
    await sendWebhookSMS({ to, body });
    return;
  }

  throw new Error('SMS_PROVIDER is not configured.');
};

const sendSOSFallbackSMS = async (sos) => {
  const recipients = await getRecipients(sos);

  if (recipients.length === 0) {
    console.log('SMS fallback skipped: no recipients configured.');
    return;
  }

  const body = buildSOSMessage(sos);
  const results = await Promise.allSettled(recipients.map((to) => sendSMS({ to, body })));

  results.forEach((result, index) => {
    const phone = maskPhone(recipients[index]);
    if (result.status === 'fulfilled') {
      console.log(`SMS fallback sent to ${phone}`);
    } else {
      console.error(`SMS fallback failed for ${phone}:`, result.reason.message);
    }
  });
};

module.exports = {
  sendSOSFallbackSMS
};
