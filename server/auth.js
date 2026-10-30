import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) throw new Error('Set JWT_SECRET in production');

export const router = express.Router();
const safe = u => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, store_id: u.store_id });
const sign = u => jwt.sign({ id: u.id }, SECRET, { expiresIn: '30d' });

export function auth(roles) {
  return (req, res, next) => {
    try {
      const { id } = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), SECRET);
      const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
      if (!u) throw new Error();
      if (roles && !roles.includes(u.role)) return res.status(403).json({ error: 'You do not have access to this' });
      req.user = u; next();
    } catch { res.status(401).json({ error: 'Please sign in' }); }
  };
}

router.post('/register', (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Enter your name' });
  if (!/^\S+@\S+\.\S+$/.test(email || '')) return res.status(400).json({ error: 'Enter a valid email address' });
  if ((password || '').length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const e = email.trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email=?').get(e)) return res.status(409).json({ error: 'That email already has an account. Sign in instead.' });
  const id = db.prepare('INSERT INTO users(name,email,phone,pass) VALUES(?,?,?,?)').run(name.trim(), e, phone || null, bcrypt.hashSync(password, 10)).lastInsertRowid;
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(id);
  res.status(201).json({ token: sign(u), user: safe(u) });
});

router.post('/login', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE email=?').get(String(req.body?.email || '').trim().toLowerCase());
  if (!u || !bcrypt.compareSync(String(req.body?.password || ''), u.pass)) return res.status(401).json({ error: 'Wrong email or password' });
  res.json({ token: sign(u), user: safe(u) });
});

router.get('/me', auth(), (req, res) => res.json(safe(req.user)));
