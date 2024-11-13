// server/index.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  lastSeen: { type: Date, default: Date.now },
  online: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  content: String,
  image: String,
  timestamp: { type: Date, default: Date.now }
});

const Message = mongoose.model('Message', messageSchema);

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Express middleware
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    res.json({ userId: user._id, username: user.username });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Message routes
app.post('/api/messages', upload.single('image'), async (req, res) => {
  try {
    const { sender, content } = req.body;
    const message = new Message({
      sender,
      content,
      image: req.file ? `/uploads/${req.file.filename}` : null
    });
    await message.save();
    io.emit('new-message', message);
    res.status(201).json(message);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected');
  
  socket.on('user-online', async (userId) => {
    await User.findByIdAndUpdate(userId, { online: true, lastSeen: Date.now() });
    io.emit('user-status-change', { userId, online: true });
  });

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (userId) {
      await User.findByIdAndUpdate(userId, { 
        online: false, 
        lastSeen: Date.now() 
      });
      io.emit('user-status-change', { userId, online: false });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});