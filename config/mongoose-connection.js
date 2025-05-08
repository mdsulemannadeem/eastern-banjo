const mongoose = require('mongoose');
const dbgr = require('debug')('app:mongoose');
const config = require('config');

mongoose.connect(`${config.get('MONGODB_URI')}`)
    .then(() => dbgr('MongoDB connected successfully!'))
    .catch(err => dbgr('MongoDB connection error:', err));



module.exports = mongoose.connection;