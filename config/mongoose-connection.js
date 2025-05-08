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
  mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 30000, // Timeout after 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    family: 4 // Use IPv4, avoid IPv6 issues
  })
  .then(() => console.log('MongoDB connected successfully in', process.env.NODE_ENV, 'mode'))
  .catch(err => {
    console.error('MongoDB connection error details:', {
      error: err.message,
      stack: err.stack,
      code: err.code,
      name: err.name
    });
  });
} else {
  console.error('MongoDB connection skipped due to missing URI');
}

// Connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB connection disconnected');
});

module.exports = mongoose.connection;