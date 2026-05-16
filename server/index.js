 /**
 * index.js — OBE MERN Server
 * Express + password auth + JWT auth + Proxy to Python FastAPI
 */

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { promisify } from 'util';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';
import { config } from 'dotenv';
import User from './models/User.js';

config();

mongoose.set('bufferCommands', false);

const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';
const pbkdf2Async = promisify(crypto.pbkdf2);

// ── MongoDB ────────────────────────────────────────────────────────────────
if (!process.env.MONGODB_URL) {
  console.error('MongoDB error: MONGODB_URL is not set. Create server/.env from server/.env.example.');
} else {
  mongoose.connect(process.env.MONGODB_URL, {
    dbName: process.env.MONGODB_DB || 'obe_system',
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('MongoDB error:', err.message));
}

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// ── Password helpers ───────────────────────────────────────────────────────
const createPasswordHash = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await pbkdf2Async(password, salt, 310000, 32, 'sha256');
  return `pbkdf2_sha256$310000$${salt}$${hash.toString('hex')}`;
};

const verifyPassword = async (password, storedHash = '') => {
  const [algorithm, iterations, salt, key] = storedHash.split('$');
  if (algorithm !== 'pbkdf2_sha256' || !iterations || !salt || !key) return false;

  const hash = await pbkdf2Async(password, salt, Number(iterations), 32, 'sha256');
  const stored = Buffer.from(key, 'hex');
  return stored.length === hash.length && crypto.timingSafeEqual(stored, hash);
};

const signUserToken = (user) => jwt.sign(
  {
    id: user._id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    role: user.role,
    department: user.department,
  },
  process.env.JWT_SECRET || 'secret',
  { expiresIn: '7d' }
);

const toPublicUser = (user) => {
  const publicUser = user.toObject();
  delete publicUser.passwordHash;
  delete publicUser.__v;
  return publicUser;
};

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: 'Database is not connected. Check MONGODB_URL in server/.env and restart the server.',
    });
  }
  next();
};


// ── JWT Middleware ─────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Multer for file uploads ────────────────────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

const readProxyResponse = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
};

// ══════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ══════════════════════════════════════════════════════════════════════════

// Register new user
app.post(['/auth/register', '/api/auth/register'], requireDatabase, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    let user = await User.findOne({ email }).select('+passwordHash');
    if (user?.passwordHash) return res.status(409).json({ error: 'Email is already registered' });

    if (user) {
      user.name = name;
      user.passwordHash = await createPasswordHash(password);
      await user.save();
    } else {
      user = await User.create({
        email,
        name,
        passwordHash: await createPasswordHash(password),
      });
    }
    const token = signUserToken(user);

    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login with email and password
app.post(['/auth/login', '/api/auth/login'], requireDatabase, async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = signUserToken(user);
    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get(['/auth/me', '/api/auth/me'], requireAuth, requireDatabase, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-__v -passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post(['/auth/logout', '/api/auth/logout'], (req, res) => {
  res.json({ message: 'Logged out' });
});

// ══════════════════════════════════════════════════════════════════════════
// PROXY ROUTES → Python FastAPI
// ══════════════════════════════════════════════════════════════════════════

// ── CO Generation ──────────────────────────────────────────────────────────

/**
 * POST /api/co/generate
 * Proxies multipart/form-data (syllabus PDF + course metadata) to Python
 */
app.post('/api/co/generate', requireAuth, upload.single('file'), async (req, res) => {
  try {
    const form = new FormData();

    // Attach file if uploaded
    if (req.file) {
      form.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
    }

    // Forward all text fields
    const fields = [
      'syllabus_text', 'course_code', 'course_name', 'university',
      'department', 'degree', 'academic_year', 'semester', 'coordinator',
      'num_students', 'num_cos_target', 'num_modules',
    ];
    fields.forEach(field => {
      if (req.body[field] !== undefined) form.append(field, String(req.body[field]));
    });

    const pyRes = await fetch(`${PYTHON_API}/co/generate`, {
      method: 'POST', body: form, headers: form.getHeaders(),
    });
    const data = await pyRes.json();

    if (!pyRes.ok) return res.status(pyRes.status).json(data);

    // Save session_id to user's record
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { sessions: data.session_id }
    });

    res.json(data);
  } catch (err) {
    console.error('CO generate error:', err);
    res.status(500).json({ error: 'Failed to contact Python backend', detail: err.message });
  }
});

/**
 * POST /api/co/feedback
 */
app.post('/api/co/feedback', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/co/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await pyRes.json();
    if (!pyRes.ok) {
      console.error('Attainment API error:', data);
    }
    res.status(pyRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/co/confirm
 */
app.post('/api/co/confirm', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/co/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await pyRes.json();
    res.status(pyRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/co/session/:id
 */
app.get('/api/co/session/:id', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/co/session/${req.params.id}`);
    const data = await pyRes.json();
    res.status(pyRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mapping ────────────────────────────────────────────────────────────────

app.post('/api/mapping/generate', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/mapping/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await pyRes.json();
    res.status(pyRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/mapping/:sessionId', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/mapping/${req.params.sessionId}`);
    const data = await pyRes.json();
    res.status(pyRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Attainment ─────────────────────────────────────────────────────────────

app.post('/api/attainment/calculate', requireAuth, upload.fields([
  { name: 'marks_file', maxCount: 1 },
  { name: 'question_paper', maxCount: 1 },
]), async (req, res) => {
  try {
    const form = new FormData();

    if (req.files?.marks_file?.[0]) {
      const f = req.files.marks_file[0];
      form.append('marks_file', f.buffer, { filename: f.originalname, contentType: f.mimetype });
    }
    if (req.files?.question_paper?.[0]) {
      const f = req.files.question_paper[0];
      form.append('question_paper', f.buffer, { filename: f.originalname, contentType: f.mimetype });
    }
    if (!req.files?.marks_file?.[0] || !req.files?.question_paper?.[0]) {
      return res.status(400).json({
        error: 'Marks file and question paper are required for attainment calculation',
      });
    }

    ['session_id', 'indirect_score', 'num_students'].forEach(k => {
      if (req.body[k]) form.append(k, String(req.body[k]));
    });

    const pyRes = await fetch(`${PYTHON_API}/attainment/calculate`, {
      method: 'POST', body: form, headers: form.getHeaders(),
    });
    const data = await readProxyResponse(pyRes);
    if (!pyRes.ok) {
      console.error('Attainment API error:', data);
    }
    res.status(pyRes.status).json(data);
  } catch (err) {
    console.error('Attainment proxy error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attainment/history', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/attainment/history`);
    const data = await pyRes.json();
    res.status(pyRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attainment/download/pdf/:course/:year', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/attainment/download/pdf/${req.params.course}/${req.params.year}`);
    if (!pyRes.ok) return res.status(pyRes.status).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.course}_report.pdf"`);
    pyRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attainment/download/excel/:course/:year', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/attainment/download/excel/${req.params.course}/${req.params.year}`);
    if (!pyRes.ok) {
      const error = await readProxyResponse(pyRes);
      return res.status(pyRes.status).json(error);
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.course}_report.xlsx"`);
    pyRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/attainment/:course/:year', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/attainment/${req.params.course}/${req.params.year}`);
    const data = await pyRes.json();
    res.status(pyRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Template ───────────────────────────────────────────────────────────────

app.get('/api/template/marks/:sessionId', requireAuth, async (req, res) => {
  try {
    const pyRes = await fetch(`${PYTHON_API}/template/marks/${req.params.sessionId}`);
    if (!pyRes.ok) return res.status(pyRes.status).json({ error: 'Not found' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="marks_template.xlsx"');
    pyRes.body.pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── User sessions list ─────────────────────────────────────────────────────
app.get('/api/user/sessions', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ sessions:user.sessions || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Health ─────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', server: 'MERN' }));

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: `Upload error: ${err.message}`,
      code: err.code,
    });
  }

  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Upload too large',
      detail: err.message,
    });
  } 

  const status = Number.isInteger(err?.status) ? err.status : 500;
  res.status(status).json({
    error: err?.message || 'Something broke!',
    details: err?.stack || null,
  });
});



app.listen(PORT, () => console.log(`🚀 MERN Server running on http://localhost:${PORT}`));
