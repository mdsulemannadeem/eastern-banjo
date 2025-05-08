const mongoose = require('mongoose');
const dbgr = require('debug')('app:mongoose');

// Use environment variables with fallback to config module
let mongoURI;

try {
  // First attempt to get from environment variables
  mongoURI = process.env.MONGODB_URI;

  // If not in env, try to get from config (for local development)
  if (!mongoURI) {
    const config = require('config');
    mongoURI = config.get('MONGODB_URI');
  }
  
  // Check if value needs to be parsed
  if (mongoURI && mongoURI.startsWith('MONGO_URI=')) {
    mongoURI = mongoURI.replace('MONGO_URI=', '');
  }

  if (!mongoURI) {
    throw new Error('MongoDB connection string not found');
  }
} catch (err) {
  console.error('Failed to load MongoDB URI:', err.message);
  // Provide a clear error message but don't crash the application
  mongoURI = null;
}

// Only attempt connection if we have a URI
if (mongoURI) {
  mongoose.connect(mongoURI)
    .then(() => dbgr('MongoDB connected successfully!'))
    .catch(err => dbgr('MongoDB connection error:', err));
} else {
  console.error('MongoDB connection skipped due to missing URI');
}

module.exports = mongoose.connection;