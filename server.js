// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');



const app = express();

// Middleware
app.use(express.json());

// CORS setup for frontend URL
const allowedOrigins = [process.env.CLIENT_URL]; // e.g., https://your-frontend.vercel.app
app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow server-to-server or Postman
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'CORS policy does not allow access from this origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const bookRoutes = require('./routes/book');
const adminRoutes = require('./routes/admin');
const locationRoutes = require('./routes/location');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/locations', locationRoutes);

// Static files (uploads/images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
const mongoUri = process.env.MONGO_URI;
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Server port
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

