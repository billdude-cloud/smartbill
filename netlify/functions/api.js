const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 30000
});

const GROUPS_TABLE = 'bill_groups';

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('users table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${GROUPS_TABLE} (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        created_by INT NOT NULL,
        invite_code VARCHAR(20) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('bill_groups table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        role VARCHAR(20) DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_member (group_id, user_id)
      )
    `);
    console.log('group_members table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_name_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_by INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('group_name_members table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        subtotal DECIMAL(10,2) DEFAULT 0.00,
        tax DECIMAL(10,2) DEFAULT 0.00,
        tip DECIMAL(10,2) DEFAULT 0.00,
        total DECIMAL(10,2) NOT NULL,
        created_by INT NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('bills table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        quantity INT DEFAULT 1
      )
    `);
    console.log('bill_items table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_splits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        paid BOOLEAN DEFAULT FALSE,
        paid_at TIMESTAMP NULL,
        UNIQUE KEY unique_split (bill_id, user_id)
      )
    `);
    console.log('bill_splits table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_name_splits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        name_member_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        paid BOOLEAN DEFAULT FALSE,
        paid_at TIMESTAMP NULL,
        UNIQUE KEY unique_name_split (bill_id, name_member_id)
      )
    `);
    console.log('bill_name_splits table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        user_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method VARCHAR(50),
        notes TEXT,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('payments table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS name_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        bill_id INT NOT NULL,
        name_member_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        method VARCHAR(50),
        notes TEXT,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('name_payments table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_id INT DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('notifications table ready');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS group_goals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        group_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        target DECIMAL(10,2) NOT NULL,
        deadline DATE,
        created_by INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('group_goals table ready');

    console.log('All tables created/verified successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

initDatabase();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function createNotification(userId, type, title, message, relatedId = null) {
  await pool.query(
    'INSERT INTO notifications (user_id, type, title, message, related_id) VALUES (?, ?, ?, ?, ?)',
    [userId, type, title, message, relatedId]
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (_error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

async function getGroupForUser(groupId, userId) {
  const [rows] = await pool.query(
    `SELECT g.*, gm.role
     FROM ${GROUPS_TABLE} g
     JOIN group_members gm ON gm.group_id = g.id
     WHERE g.id = ? AND gm.user_id = ?`,
    [groupId, userId]
  );

  return rows[0] || null;
}

async function getBillForUser(billId, userId) {
  const [rows] = await pool.query(
    `SELECT b.*, g.name AS group_name, u.name AS created_by_name
     FROM bills b
     JOIN ${GROUPS_TABLE} g ON g.id = b.group_id
     JOIN users u ON u.id = b.created_by
     WHERE b.id = ?
       AND b.group_id IN (
         SELECT group_id FROM group_members WHERE user_id = ?
       )`,
    [billId, userId]
  );

  return rows[0] || null;
}

// ============ AUTH / HEALTH ============

app.get('/api/health', async (_req, res) => {
  try {
    const connection = await pool.getConnection();
    connection.release();
    res.json({ status: 'ok', message: 'Connected to Railway MySQL' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    const user = { id: result.insertId, name, email };
    const token = signToken(user);

    res.status(201).json({ token, user });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, avatar, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(rows[0]);
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    await pool.query('UPDATE users SET name = ? WHERE id = ?', [name, req.user.id]);
    res.json({ message: 'Profile updated successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

    res.json({ message: 'Password changed successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ GROUPS ============

app.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         g.*,
         (
           COALESCE((SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id), 0) +
           COALESCE((SELECT COUNT(*) FROM group_name_members gnm WHERE gnm.group_id = g.id), 0)
         ) AS member_count
       FROM ${GROUPS_TABLE} g
       WHERE g.id IN (
         SELECT group_id FROM group_members WHERE user_id = ?
       )
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    res.json(rows);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

app.get('/api/groups/:id', authenticateToken, async (req, res) => {
  try {
    const group = await getGroupForUser(req.params.id, req.user.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const [memberCount] = await pool.query(
      `SELECT (
         COALESCE((SELECT COUNT(*) FROM group_members WHERE group_id = ?), 0) +
         COALESCE((SELECT COUNT(*) FROM group_name_members WHERE group_id = ?), 0)
       ) AS count`,
      [req.params.id, req.params.id]
    );

    res.json({
      group,
      member_count: memberCount[0].count,
      user_role: group.role
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

app.get('/api/groups/:id/all-members', authenticateToken, async (req, res) => {
  try {
    const group = await getGroupForUser(req.params.id, req.user.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email, 'user' AS type, gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?`,
      [req.params.id]
    );

    const [nameMembers] = await pool.query(
      `SELECT id, name, 'name_member' AS type
       FROM group_name_members
       WHERE group_id = ?`,
      [req.params.id]
    );

    res.json([...members, ...nameMembers]);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

app.get('/api/groups/:id/goal', authenticateToken, async (req, res) => {
  try {
    const group = await getGroupForUser(req.params.id, req.user.id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const [goal] = await pool.query(
      `SELECT * FROM group_goals WHERE group_id = ? ORDER BY created_at DESC LIMIT 1`,
      [req.params.id]
    );

    if (goal.length === 0) {
      return res.json(null);
    }

    res.json(goal[0]);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to load group goal' });
  }
});

app.post('/api/groups', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Group name required' });
    }

    const inviteCode = generateInviteCode();
    const [result] = await connection.query(
      `INSERT INTO ${GROUPS_TABLE} (name, description, created_by, invite_code) VALUES (?, ?, ?, ?)`,
      [name, description || '', req.user.id, inviteCode]
    );

    await connection.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [result.insertId, req.user.id, 'admin']
    );

    await connection.commit();
    res.status(201).json({
      message: 'Group created',
      id: result.insertId,
      group_id: result.insertId,
      invite_code: inviteCode
    });
  } catch (_error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to create group' });
  } finally {
    connection.release();
  }
});

app.post('/api/groups/join', authenticateToken, async (req, res) => {
  try {
    const inviteCode = String(req.body.invite_code || req.body.inviteCode || '')
      .trim()
      .toUpperCase();

    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code required' });
    }

    const [groups] = await pool.query(
      `SELECT id, name, invite_code FROM ${GROUPS_TABLE} WHERE invite_code = ?`,
      [inviteCode]
    );

    if (groups.length === 0) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    const group = groups[0];

    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = role',
      [group.id, req.user.id, 'member']
    );

    res.json({ message: `Joined ${group.name}`, group });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to join group' });
  }
});

app.post('/api/groups/:groupId/members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const email = String(req.body.email || '').trim().toLowerCase();
    const group = await getGroupForUser(groupId, req.user.id);

    if (!group || group.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [users] = await pool.query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'No registered user found with that email' });
    }

    const member = users[0];

    const [existing] = await pool.query(
      'SELECT id FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, member.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'That user is already a member of this group' });
    }

    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, member.id, 'member']
    );

    if (member.id !== req.user.id) {
      await createNotification(
        member.id,
        'group_invite',
        'Added To Group',
        `${req.user.name} added you to "${group.name}"`,
        parseInt(groupId, 10)
      );
    }

    res.status(201).json({
      message: 'Registered member added',
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        type: 'registered',
        role: 'member'
      }
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.post('/api/groups/:groupId/name-members', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.params;
    const name = String(req.body.name || '').trim();
    const group = await getGroupForUser(groupId, req.user.id);

    if (!group || group.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add members' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO group_name_members (group_id, name, created_by) VALUES (?, ?, ?)',
      [groupId, name, req.user.id]
    );

    res.status(201).json({
      message: 'Name-only member added',
      member: { id: result.insertId, name, type: 'name-only', role: 'member' }
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

app.delete('/api/groups/:groupId/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const group = await getGroupForUser(groupId, req.user.id);

    if (!group || group.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    if (parseInt(memberId, 10) === req.user.id) {
      return res.status(400).json({ error: 'Admins cannot remove themselves from the group' });
    }

    const [result] = await pool.query(
      'DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND role != ?',
      [groupId, memberId, 'admin']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found or cannot be removed' });
    }

    res.json({ message: 'Registered member removed successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

app.delete('/api/groups/:id', authenticateToken, async (req, res) => {
  try {
    const group = await getGroupForUser(req.params.id, req.user.id);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.role !== 'admin' || group.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Only the group creator can delete this group' });
    }

    await pool.query(`DELETE FROM ${GROUPS_TABLE} WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Group deleted successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

// ============ BILLS ============

app.get('/api/bills', authenticateToken, async (req, res) => {
  try {
    const groupId = req.query.group_id ? parseInt(req.query.group_id, 10) : null;
    let query = `
      SELECT b.*, g.name AS group_name, u.name AS created_by_name
      FROM bills b
      JOIN ${GROUPS_TABLE} g ON b.group_id = g.id
      JOIN users u ON b.created_by = u.id
      WHERE b.group_id IN (
        SELECT group_id FROM group_members WHERE user_id = ?
      )
    `;
    const params = [req.user.id];

    if (groupId) {
      query += ' AND b.group_id = ?';
      params.push(groupId);
    }

    query += ' ORDER BY b.created_at DESC';

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

app.get('/api/bills/:id', authenticateToken, async (req, res) => {
  try {
    const bill = await getBillForUser(req.params.id, req.user.id);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const [items] = await pool.query('SELECT * FROM bill_items WHERE bill_id = ?', [req.params.id]);
    const [registeredSplits] = await pool.query(
      `SELECT bs.*, u.name, u.email, 'registered' AS member_type
       FROM bill_splits bs
       JOIN users u ON u.id = bs.user_id
       WHERE bs.bill_id = ?`,
      [req.params.id]
    );
    const [nameSplits] = await pool.query(
      `SELECT bns.*, gnm.name, NULL AS email, 'name-only' AS member_type
       FROM bill_name_splits bns
       JOIN group_name_members gnm ON gnm.id = bns.name_member_id
       WHERE bns.bill_id = ?`,
      [req.params.id]
    );

    res.json({
      bill,
      items,
      splits: [...registeredSplits, ...nameSplits]
    });
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/bills/:billId/payment-status', authenticateToken, async (req, res) => {
  try {
    const bill = await getBillForUser(req.params.billId, req.user.id);

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const [registeredSplits] = await pool.query(
      `SELECT
         bs.user_id AS member_id,
         'registered' AS member_type,
         u.name,
         u.email,
         bs.amount,
         bs.paid,
         bs.paid_at
       FROM bill_splits bs
       JOIN users u ON u.id = bs.user_id
       WHERE bs.bill_id = ?`,
      [req.params.billId]
    );

    const [nameSplits] = await pool.query(
      `SELECT
         bns.name_member_id AS member_id,
         'name-only' AS member_type,
         gnm.name,
         NULL AS email,
         bns.amount,
         (np.id IS NOT NULL) AS paid,
         np.paid_at
       FROM bill_name_splits bns
       JOIN group_name_members gnm ON gnm.id = bns.name_member_id
       LEFT JOIN name_payments np
         ON np.bill_id = bns.bill_id
        AND np.name_member_id = bns.name_member_id
       WHERE bns.bill_id = ?`,
      [req.params.billId]
    );

    res.json([...registeredSplits, ...nameSplits]);
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/bills', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { group_id, title, description, items, tax, tip, splits } = req.body;

    if (!group_id || !title || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const group = await getGroupForUser(group_id, req.user.id);
    if (!group) {
      return res.status(403).json({ error: 'You are not allowed to create bills in this group' });
    }

    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0) * (parseInt(item.quantity, 10) || 1);
    }, 0);
    const taxAmount = parseFloat(tax) || 0;
    const tipAmount = parseFloat(tip) || 0;
    const total = subtotal + taxAmount + tipAmount;

    const [billResult] = await connection.query(
      'INSERT INTO bills (group_id, title, description, subtotal, tax, tip, total, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [group_id, title, description || '', subtotal, taxAmount, tipAmount, total, req.user.id]
    );

    const billId = billResult.insertId;

    for (const item of items) {
      await connection.query(
        'INSERT INTO bill_items (bill_id, name, amount, quantity) VALUES (?, ?, ?, ?)',
        [billId, item.name, parseFloat(item.amount) || 0, parseInt(item.quantity, 10) || 1]
      );
    }

    const [registeredMembers] = await connection.query(
      "SELECT user_id, 'registered' AS type FROM group_members WHERE group_id = ?",
      [group_id]
    );
    const [nameOnlyMembers] = await connection.query(
      "SELECT id, 'name-only' AS type FROM group_name_members WHERE group_id = ?",
      [group_id]
    );

    const allMembers = [...registeredMembers, ...nameOnlyMembers];

    if (Array.isArray(splits) && splits.length > 0) {
      for (const split of splits) {
        const amount = parseFloat(split.amount);
        if (Number.isNaN(amount) || amount < 0) {
          continue;
        }

        if (split.member_type === 'registered') {
          await connection.query(
            'INSERT INTO bill_splits (bill_id, user_id, amount) VALUES (?, ?, ?)',
            [billId, split.member_id, amount]
          );
        } else if (split.member_type === 'name-only') {
          await connection.query(
            'INSERT INTO bill_name_splits (bill_id, name_member_id, amount) VALUES (?, ?, ?)',
            [billId, split.member_id, amount]
          );
        }
      }
    } else if (allMembers.length > 0) {
      const shareAmount = total / allMembers.length;

      for (const member of allMembers) {
        if (member.type === 'registered') {
          await connection.query(
            'INSERT INTO bill_splits (bill_id, user_id, amount) VALUES (?, ?, ?)',
            [billId, member.user_id, shareAmount]
          );
        } else {
          await connection.query(
            'INSERT INTO bill_name_splits (bill_id, name_member_id, amount) VALUES (?, ?, ?)',
            [billId, member.id, shareAmount]
          );
        }
      }
    }

    await connection.commit();
    res.status(201).json({ message: 'Bill created', bill_id: billId });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: `Failed to create bill: ${error.message}` });
  } finally {
    connection.release();
  }
});

app.put('/api/bills/:id', authenticateToken, async (req, res) => {
  try {
    const bill = await getBillForUser(req.params.id, req.user.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const { title, total, status } = req.body;
    await pool.query(
      'UPDATE bills SET title = ?, total = ?, status = ? WHERE id = ?',
      [title || bill.title, total ?? bill.total, status || bill.status, req.params.id]
    );

    res.json({ message: 'Bill updated successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to update bill' });
  }
});

app.delete('/api/bills/:id', authenticateToken, async (req, res) => {
  try {
    const bill = await getBillForUser(req.params.id, req.user.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.created_by !== req.user.id) {
      const group = await getGroupForUser(bill.group_id, req.user.id);
      if (!group || group.role !== 'admin') {
        return res.status(403).json({ error: 'Only the bill creator or a group admin can delete this bill' });
      }
    }

    await pool.query('DELETE FROM bills WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bill deleted successfully' });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// ============ PAYMENTS ============

app.post('/api/payments', authenticateToken, async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const { bill_id, amount, method, notes } = req.body;
    if (!bill_id || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const bill = await getBillForUser(bill_id, req.user.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const [splits] = await connection.query(
      'SELECT * FROM bill_splits WHERE bill_id = ? AND user_id = ?',
      [bill_id, req.user.id]
    );

    if (splits.length === 0) {
      return res.status(403).json({ error: 'You are not part of this bill' });
    }

    const split = splits[0];
    if (split.paid) {
      return res.status(400).json({ error: 'You have already paid for this bill' });
    }

    const shareAmount = parseFloat(split.amount);
    const paymentAmount = parseFloat(amount);
    if (Math.abs(paymentAmount - shareAmount) > 0.01) {
      return res.status(400).json({
        error: `Payment amount should be $${shareAmount.toFixed(2)}`,
        expectedAmount: shareAmount
      });
    }

    await connection.query(
      'INSERT INTO payments (bill_id, user_id, amount, method, notes) VALUES (?, ?, ?, ?, ?)',
      [bill_id, req.user.id, paymentAmount, method || 'cash', notes || null]
    );

    await connection.query(
      'UPDATE bill_splits SET paid = 1, paid_at = NOW() WHERE bill_id = ? AND user_id = ?',
      [bill_id, req.user.id]
    );

    const [pendingRegistered] = await connection.query(
      'SELECT COUNT(*) AS count FROM bill_splits WHERE bill_id = ? AND paid = 0',
      [bill_id]
    );
    const [pendingNameOnly] = await connection.query(
      `SELECT COUNT(*) AS count
       FROM bill_name_splits bns
       LEFT JOIN name_payments np
         ON np.bill_id = bns.bill_id
        AND np.name_member_id = bns.name_member_id
       WHERE bns.bill_id = ?
         AND np.id IS NULL`,
      [bill_id]
    );

    const hasPending = Number(pendingRegistered[0].count) + Number(pendingNameOnly[0].count) > 0;
    const newStatus = hasPending ? 'partial' : 'paid';

    await connection.query('UPDATE bills SET status = ? WHERE id = ?', [newStatus, bill_id]);
    await connection.commit();

    res.json({ message: 'Payment recorded successfully', billStatus: newStatus });
  } catch (_error) {
    await connection.rollback();
    res.status(500).json({ error: 'Server error' });
  } finally {
    connection.release();
  }
});

app.get('/api/payments/summary', authenticateToken, async (req, res) => {
  try {
    const [statusCounts] = await pool.query(
      `SELECT
         COUNT(CASE WHEN paid = 0 THEN 1 END) AS pending,
         COUNT(CASE WHEN paid = 1 THEN 1 END) AS completed
       FROM bill_splits
       WHERE user_id = ?`,
      [req.user.id]
    );
    const [paymentsMade] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE user_id = ?',
      [req.user.id]
    );
    const [paymentsReceived] = await pool.query(
      `SELECT COALESCE(SUM(p.amount), 0) AS total
       FROM payments p
       JOIN bills b ON b.id = p.bill_id
       WHERE b.created_by = ? AND p.user_id != ?`,
      [req.user.id, req.user.id]
    );

    res.json({
      pending: Number(statusCounts[0].pending),
      completed: Number(statusCounts[0].completed),
      paymentsMade: parseFloat(paymentsMade[0].total),
      paymentsReceived: parseFloat(paymentsReceived[0].total)
    });
  } catch (_error) {
    res.json({ pending: 0, completed: 0, paymentsMade: 0, paymentsReceived: 0 });
  }
});

app.post('/api/bills/:id/reminders', authenticateToken, async (req, res) => {
  try {
    const bill = await getBillForUser(req.params.id, req.user.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const targetUserId = req.body?.user_id ? parseInt(req.body.user_id, 10) : null;
    const group = await getGroupForUser(bill.group_id, req.user.id);
    const isAdmin = group && group.role === 'admin';
    const isCreator = bill.created_by === req.user.id;

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: 'Only bill creators or group admins can send reminders' });
    }

    let query = `
      SELECT bs.user_id, bs.amount, u.name, u.email
      FROM bill_splits bs
      JOIN users u ON u.id = bs.user_id
      WHERE bs.bill_id = ? AND bs.paid = 0
    `;
    const params = [req.params.id];

    if (targetUserId) {
      query += ' AND bs.user_id = ?';
      params.push(targetUserId);
    } else {
      query += ' AND bs.user_id != ?';
      params.push(req.user.id);
    }

    const [unpaidMembers] = await pool.query(query, params);

    if (unpaidMembers.length === 0) {
      return res.status(400).json({
        error: targetUserId ? 'That member has already paid or is not part of this bill' : 'No unpaid members to remind'
      });
    }

    for (const member of unpaidMembers) {
      await createNotification(
        member.user_id,
        'payment_reminder',
        'Payment Reminder',
        `${req.user.name} reminded you to pay $${Number(member.amount).toFixed(2)} for "${bill.title}"`,
        parseInt(req.params.id, 10)
      );
    }

    res.json({
      message: unpaidMembers.length === 1
        ? `Reminder sent to ${unpaidMembers[0].name}`
        : `Sent ${unpaidMembers.length} payment reminders`,
      remindedCount: unpaidMembers.length,
      emailSent: 0
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to send payment reminders' });
  }
});

// ============ DASHBOARD / ALERTS / NOTIFICATIONS ============

app.get('/api/dashboard/summary', authenticateToken, async (req, res) => {
  try {
    const [groupCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM group_members WHERE user_id = ?',
      [req.user.id]
    );
    const [owedResult] = await pool.query(
      `SELECT COALESCE(SUM(bs.amount), 0) AS total
       FROM bill_splits bs
       JOIN bills b ON bs.bill_id = b.id
       WHERE bs.user_id = ? AND bs.paid = 0`,
      [req.user.id]
    );
    const [owedToMe] = await pool.query(
      `SELECT COALESCE(SUM(bs.amount), 0) AS total
       FROM bill_splits bs
       JOIN bills b ON bs.bill_id = b.id
       WHERE b.created_by = ? AND bs.user_id != ? AND bs.paid = 0`,
      [req.user.id, req.user.id]
    );
    const [pendingResult] = await pool.query(
      `SELECT COUNT(DISTINCT b.id) AS count
       FROM bills b
       JOIN bill_splits bs ON b.id = bs.bill_id
       WHERE bs.user_id = ? AND bs.paid = 0`,
      [req.user.id]
    );

    res.json({
      groupCount: Number(groupCount[0].count),
      iOwe: parseFloat(owedResult[0].total),
      owedToMe: parseFloat(owedToMe[0].total),
      pendingBills: Number(pendingResult[0].count)
    });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

app.post('/api/spending-alert', authenticateToken, async (req, res) => {
  try {
    const monthlyBudget = Number(req.body.monthly_budget) || 0;
    const [rows] = await pool.query(
      `SELECT COALESCE(SUM(bs.amount), 0) AS total
       FROM bill_splits bs
       JOIN bills b ON b.id = bs.bill_id
       WHERE bs.user_id = ?
         AND MONTH(b.created_at) = MONTH(CURRENT_DATE())
         AND YEAR(b.created_at) = YEAR(CURRENT_DATE())`,
      [req.user.id]
    );

    const currentSpending = parseFloat(rows[0].total) || 0;
    const percentage = monthlyBudget > 0 ? (currentSpending / monthlyBudget) * 100 : 0;
    let alert = null;

    if (monthlyBudget > 0 && percentage >= 100) {
      alert = `You've exceeded your monthly budget of $${monthlyBudget.toFixed(2)}.`;
    } else if (monthlyBudget > 0 && percentage >= 80) {
      alert = `You've used ${percentage.toFixed(0)}% of your monthly budget.`;
    } else if (monthlyBudget > 0 && percentage >= 50) {
      alert = `You've used ${percentage.toFixed(0)}% of your monthly budget.`;
    }

    res.json({ monthlyBudget, currentSpending, percentage, alert });
  } catch (_error) {
    res.status(500).json({ error: 'Failed to calculate spending alert' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [notifications] = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );
    const [unreadResult] = await pool.query(
      'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      notifications,
      unreadCount: Number(unreadResult[0].count)
    });
  } catch (_error) {
    res.json({ notifications: [], unreadCount: 0 });
  }
});

app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
    res.json({ success: true });
  } catch (_error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============ DEBUG ============

app.get('/api/debug', (_req, res) => {
  res.json({
    db_host: process.env.DB_HOST || 'NOT SET',
    db_user: process.env.DB_USER || 'NOT SET',
    db_name: process.env.DB_NAME || 'NOT SET',
    jwt_secret: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
  });
});

app.get('/api/test', (_req, res) => {
  res.json({ message: 'API is working!' });
});

exports.handler = serverless(app);
