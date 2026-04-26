# Multilingual Disaster Alert MVP

A simple full-stack college project for multilingual disaster alerts and SOS requests.

## Tech Stack

- Frontend: HTML, CSS, JavaScript with EJS templates
- Backend: Node.js and Express.js
- Database: MongoDB with Mongoose

## Main Pages

- `/` home page
- `/auth/register` user registration
- `/auth/login` user login
- `/alerts` user dashboard
- `/alerts/:id` alert details
- `/admin` admin dashboard
- `/admin/alerts/new` add alert
- `/admin/alerts` manage alerts
- `/admin/sos` view SOS requests

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file:

```bash
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/disaster_alert_mvp
SESSION_SECRET=any-simple-secret-for-local-use
```

Optional SMS fallback for SOS:

```bash
# Twilio option
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=+1234567890
ADMIN_ALERT_PHONE=+919999999999,+918888888888

# Generic webhook option
SMS_PROVIDER=webhook
SMS_WEBHOOK_URL=https://your-sms-provider.example/send
SMS_WEBHOOK_TOKEN=optional_token
ADMIN_ALERT_PHONE=+919999999999
```

If SMS variables are not configured, SOS still saves normally and realtime web alerts still work.

3. Make sure MongoDB is running locally.

4. Insert sample alerts:

```bash
npm run seed
```

5. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

`npm run dev` automatically closes an old server using the same project port before starting Nodemon.
