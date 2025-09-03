import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import { google } from 'googleapis';
import fetch from 'node-fetch';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: true, credentials: true }));

// Session (stores passport user & tokens in memory — fine for dev)
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Passport init
app.use(passport.initialize());
app.use(passport.session());

// Passport: serialize/deserialize user (we keep profile + tokens)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// Google Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: false
}, (accessToken, refreshToken, profile, cb) => {
  // Attach tokens to profile for storage in session
  profile.accessToken = accessToken;
  profile.refreshToken = refreshToken;
  return cb(null, profile);
}));

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// ---- Auth routes ----
// Start auth
app.get('/auth/google',
  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.send'
    ],
    accessType: 'offline', // request refresh token
    prompt: 'consent'      // force consent to get refresh token during dev
  })
);

// Callback
app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    // successful auth -> redirect to app
    res.redirect('/index.html');
  }
);

// Logout
app.post('/logout', (req, res) => {
  req.logout(() => {
    req.session.destroy(err => {
      if (err) console.error('Logout error', err);
      res.json({ ok: true });
    });
  });
});

// Auth status check
app.get('/auth/status', (req, res) => {
  res.json({ authenticated: !!req.user });
});

// ---- AI generation endpoint (Groq) ----
app.post('/generate-email', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.2
    };

    const r = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const json = await r.json();
    const text = json?.choices?.[0]?.message?.content ?? json?.output?.[0]?.content ?? JSON.stringify(json);
    res.json({ email: text });
  } catch (err) {
    console.error('Generate error', err);
    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

// ---- Send email using Gmail API and logged-in user's tokens ----
app.post('/send-email', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated with Google' });

    const { recipients, subject, body } = req.body;
    if (!recipients || !body) return res.status(400).json({ error: 'Missing recipients or body' });

    // Setup OAuth2 client with user's tokens
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL
    );

    // Set credentials from session (passport stored them on req.user)
    const tokens = {
      access_token: req.user.accessToken,
      refresh_token: req.user.refreshToken
    };
    oAuth2Client.setCredentials(tokens);

    // If tokens get refreshed by googleapis library, get them & update session
    oAuth2Client.on('tokens', (newTokens) => {
      if (newTokens.refresh_token) req.user.refreshToken = newTokens.refresh_token;
      if (newTokens.access_token) req.user.accessToken = newTokens.access_token;
      // session will be saved automatically at response end
    });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // recipients may be string or array
    const to = Array.isArray(recipients) ? recipients.join(', ') : recipients;

    // Build RFC822 message (HTML)
    const rawLines = [
      `From: ${req.user.displayName} <me>`,
      `To: ${to}`,
      `Subject: ${subject || 'AI Generated Email'}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      body
    ];
    const raw = rawLines.join('\r\n');

    // base64url encode
    const encoded = Buffer.from(raw)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendRes = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encoded
      }
    });

    res.json({ ok: true, result: sendRes.data });
  } catch (err) {
    console.error('Send error', err);
    res.status(500).json({ error: err.message || 'Send failed', details: err });
  }
});

// Fallback: serve index
app.get('/', (req, res) => res.redirect('/login.html'));

app.listen(PORT, () => console.log(`Server running http://localhost:${PORT}`));
