const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'data', 'orders.json');
const ADMIN_PASSWORD = 'admin1234';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory and file exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

// Helpers
function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(DB_FILE, JSON.stringify(orders, null, 2));
}

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────

// Submit order
app.post('/api/orders', (req, res) => {
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

  const orders = readOrders();
  orders.unshift(order);
  writeOrders(orders);

  res.json({ success: true, message: 'تم استلام طلبك بنجاح' });
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

// Middleware to check admin password
function adminAuth(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
  }
  next();
}

// Login check
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
  }
});

// Get all orders
app.get('/api/admin/orders', adminAuth, (req, res) => {
  const orders = readOrders();
  res.json({ success: true, orders });
});

// Update order status
app.patch('/api/admin/orders/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const orders = readOrders();
  const idx = orders.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  orders[idx].status = status;
  writeOrders(orders);
  res.json({ success: true, order: orders[idx] });
});

// Delete order
app.delete('/api/admin/orders/:id', adminAuth, (req, res) => {
  const { id } = req.params;
  let orders = readOrders();
  const before = orders.length;
  orders = orders.filter(o => o.id !== id);
  if (orders.length === before) return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
  writeOrders(orders);
  res.json({ success: true });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serve landing page for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🛡️  Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔑 Admin password: ${ADMIN_PASSWORD}`);
});
