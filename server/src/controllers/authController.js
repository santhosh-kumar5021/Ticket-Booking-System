import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { signToken } from '../utils/token.js';

export async function register(req, res) {
  const { name, email, password, role = 'CUSTOMER' } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const validRoles = ['CUSTOMER', 'ORGANISER', 'ADMIN'];
  const userRole = validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'CUSTOMER';

  const existing = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (existing) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = `usr-${uuidv4()}`;

  await db.query(`
    INSERT INTO users (id, name, email, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `, [userId, name.trim(), email.toLowerCase().trim(), passwordHash, userRole]);

  const token = signToken({ id: userId, email: email.toLowerCase().trim(), role: userRole });

  res.status(201).json({
    user: { id: userId, name, email: email.toLowerCase().trim(), role: userRole },
    token
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    token
  });
}

export function getMe(req, res) {
  res.json({ user: req.user });
}

export async function getDemoUsers(req, res) {
  const users = await db.all('SELECT id, name, email, role FROM users ORDER BY role DESC, name ASC');
  res.json({ users });
}

export async function switchUser(req, res) {
  const { userId } = req.body;
  const user = await db.get('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  res.json({ user, token });
}
