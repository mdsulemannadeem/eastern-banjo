const mongoose = require('mongoose');
const dbgr = require('debug')('app:mongoose');

// Use environment variable for MongoDB URI with fallback to local
const mongoURI = process.env.MONGODB_URI || `${require('config').get('MONGODB_URI')}/easternBanjo`;

mongoose.connect(mongoURI)
    .then(() => dbgr('MongoDB connected successfully!'))
    .catch(err => dbgr('MongoDB connection error:', err));

module.exports = mongoose.connection;