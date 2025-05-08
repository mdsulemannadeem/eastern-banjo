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
    serverSelectionTimeoutMS: 30000, // Increase timeout for Vercel cold starts
    socketTimeoutMS: 45000,          // Increase socket timeout
    family: 4,                       // Use IPv4, avoid IPv6 issues
    maxPoolSize: 10                  // Limit connection pool for serverless
  })
  .then(() => {
    console.log(`MongoDB connected in ${process.env.NODE_ENV || 'development'} mode`);
  })
  .catch(err => {
    console.error('MongoDB connection error:', {
      message: err.message,
      code: err.code,
      name: err.name
    });
    // Don't exit the process in production - let the request finish with an error
    if (process.env.NODE_ENV !== 'production') {
      console.error('Exiting due to MongoDB connection error in development');
      process.exit(1);
    }
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