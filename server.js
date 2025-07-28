// server.js - Diperbaiki
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';

const PORT = 3000;
const PYTHON_SERVER_URL = "http://localhost:5000";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('✅ React client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('❌ React client disconnected:', socket.id);
  });
});

console.log(`🚀 Node.js server listening on port ${PORT} for React clients`);

const pythonSocket = Client(PYTHON_SERVER_URL);

pythonSocket.on('connect', () => {
  console.log(`🔗 Successfully connected to Python backend at ${PYTHON_SERVER_URL}`);
});

// --- Terima data dari Python dan teruskan ke React ---

// 1. Event 'deteksi'
pythonSocket.on('deteksi', (data) => {
  // console.log('📩 Received "deteksi" from Python -> Relaying to React');
  io.emit('deteksi', data);
});

// 2. Event 'log'
pythonSocket.on('log', (data) => {
  console.log('📝 Received "log" from Python -> Relaying to React');
  io.emit('log', data);
});

// 3. ✅ TAMBAHAN BARU: Event 'video_frame'
pythonSocket.on('video_frame', (data) => {
  // Tidak perlu console.log di sini agar terminal tidak penuh
  io.emit('video_frame', data);
});


pythonSocket.on('disconnect', () => {
  console.log('🔌 Python backend disconnected');
});

httpServer.listen(PORT);