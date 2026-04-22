const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const { Redis } = require('@upstash/redis');

const app = express();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234';

// Initialize Redis client safely
let redis;
try {
  redis = new Redis({
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || 'http://localhost:8080',
    token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy'
  });
} catch (error) {
  console.log("Redis not configured yet");
}

app.use(cors());
app.use(bodyParser.json());

// Helpers
async function getOrders() {
  if (!redis) return [];
  try {
    const orders = await redis.get('orders');
    return orders || [];
  } catch (e) {
    console.error('Error fetching orders:', e);
    return [];
  }
}

async function saveOrders(orders) {
  if (!redis) return;
  try {
    await redis.set('orders', orders);
  } catch (e) {
    console.error('Error saving orders:', e);
  }
}

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

app.post('/api/orders', async (req, res) => {
  const { name, phone, city, quantity } = req.body;

  if (!name || !phone || !city || !quantity) {
    return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
  }

  const order = {
    id: uuidv4(),
    name,
    phone,
    city,
    quantity: parseInt(quantity),
    status: 'جديد',
    timestamp: new Date().toISOString(),
  };

  const orders = await getOrders();
  orders.unshift(order);
  await saveOrders(orders);

  res.json({ success: true, message: 'تم استلام طلبك بنجاح' });
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

function adminAuth(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
  }
});

app.get('/api/admin/orders', adminAuth, async (req, res) => {
  const orders = await getOrders();
  res.json({ success: true, orders });
});

app.patch('/api/admin/orders/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const orders = await getOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  
  orders[idx].status = status;
  await saveOrders(orders);
  res.json({ success: true, order: orders[idx] });
});

app.delete('/api/admin/orders/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  let orders = await getOrders();
  const before = orders.length;
  orders = orders.filter(o => o.id !== id);
  
  if (orders.length === before) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  
  await saveOrders(orders);
  res.json({ success: true });
});

module.exports = app;
