const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const { ensureTables } = require('./utils/initDb');
const suggestionsRoutes = require('./routes/suggestions');
const yearsRoutes = require('./routes/years');
const deliveryPersons = require('./routes/deliveryPersons');
const authRoutes = require('./routes/auth');
const authenticateToken = require('./middleware/auth');
const appKeysRouter = require("./routes/appKeys");

require('dotenv').config();

ensureTables();

const app = express();

// Enable CORS for frontend
app.use(cors({ origin: process.env.CORS_ORIGINS || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Public auth routes (register/login)
app.use('/api', authRoutes);

// PROTECT all other API routes below this line!
app.use('/api/year-admin', authenticateToken, require('./routes/yearAdmin'));
app.use('/api/memos', authenticateToken, require('./routes/memos'));
app.use('/api/lrs', authenticateToken, require('./routes/lrs'));
app.use('/api/cashmemos', authenticateToken, require('./routes/cashmemos'));
app.use('/api/suggestions', authenticateToken, suggestionsRoutes);
app.use('/api/years', authenticateToken, yearsRoutes);
app.use('/api/delivery-persons', authenticateToken, deliveryPersons);
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/auditlog', require('./routes/auditlog'));
app.use("/api", appKeysRouter);

// Optionally, add a health-check route that doesn't require auth
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
