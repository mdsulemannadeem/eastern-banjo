const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const path = require("path");
const expressSession = require("express-session");
const flash = require("connect-flash");

require("dotenv").config();

const ownersRouter = require("./routes/ownersRouter");
const productsRouter = require("./routes/productsRouter");
const usersRouter = require("./routes/usersRouter");
const indexRouter = require("./routes/index");

const db = require("./config/mongoose-connection");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
    expressSession({
        resave: false,
        saveUninitialized: false,
        secret: process.env.EXPRESS_SESSION_SECRET || "default_secret_key",
    })
);
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");

app.use("/", indexRouter);
app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", productsRouter);

app.use((err, req, res, next) => {
  // Get detailed error info
  const errorDetails = {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  };
  
  // Log detailed error for server logs
  console.error('ERROR OCCURRED:', JSON.stringify(errorDetails));
  
  // For MongoDB connection errors
  if (err.name === 'MongoNetworkError' || err.name === 'MongoServerSelectionError') {
    console.error('DATABASE CONNECTION ERROR - Check Vercel environment variables');
    return res.status(500).render('error', { 
      error: 'Database connection issue',
      message: 'Please try again later'
    });
  }
  
  // For JWT/authentication errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    console.error('JWT AUTH ERROR:', err.message);
    return res.redirect('/login');
  }

  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  // Default error response - use render instead of plain text
  // Create a simple error.ejs template for better error display
  try {
    res.status(500).render('error', { 
      error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message,
      message: 'We encountered an issue processing your request'
    });
  } catch (renderErr) {
    // Fallback if rendering fails
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000);