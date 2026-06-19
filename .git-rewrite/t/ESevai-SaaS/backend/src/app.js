const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const centerRoutes = require('./routes/centerRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'ESevai Backend Running'
    });
});

app.use('/api/auth', authRoutes);

app.use(
    '/api/centers',
    centerRoutes
);

module.exports = app;