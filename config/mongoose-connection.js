const mongoose = require('mongoose');
const dbgr = require('debug')('app:mongoose');

// Use environment variable for MongoDB URI with fallback to local
const mongoURI = `${require('config').get('MONGODB_URI')}`;

mongoose.connect(mongoURI)
    .then(() => dbgr('MongoDB connected successfully!'))
    .catch(err => dbgr('MongoDB connection error:', err));

module.exports = mongoose.connection;