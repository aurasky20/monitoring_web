// server.js - Real-time Data Server with Database Integration
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import mysql from 'mysql2/promise';
import cors from 'cors';

const PORT = 3000;
const PYTHON_SERVER_URL = "http://localhost:5000";

// Database configuration
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',        // Sesuaikan dengan username database Anda
  password: '',        // Sesuaikan dengan password database Anda
  database: 'monitoring'
};

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Database connection pool
let dbPool;

async function initDatabase() {
  try {
    dbPool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 1,
      queueLimit: 0
    });
    
    console.log('✅ Database connection pool created');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
  }
}

// Function to get real-time data from database
async function getLatestDetections(limit = 50) {
  try {
    const [rows] = await dbPool.execute(
      'SELECT * FROM log_detection ORDER BY time DESC LIMIT ?',
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('❌ Error fetching detection data:', error);
    return [];
  }
}

// Function to get detection statistics
async function getDetectionStats() {
  try {
    const [totalRows] = await dbPool.execute(
      'SELECT COUNT(*) as total, SUM(birds) as total_birds FROM log_detection'
    );
    
    const [todayRows] = await dbPool.execute(
      'SELECT COUNT(*) as today_detections, SUM(birds) as today_birds FROM log_detection WHERE DATE(time) = CURDATE()'
    );
    
    return {
      total_detections: totalRows[0].total,
      total_birds: totalRows[0].total_birds || 0,
      today_detections: todayRows[0].today_detections,
      today_birds: todayRows[0].today_birds || 0
    };
  } catch (error) {
    console.error('❌ Error fetching detection stats:', error);
    return {
      total_detections: 0,
      total_birds: 0,
      today_detections: 0,
      today_birds: 0
    };
  }
}

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log('✅ React client connected:', socket.id);
  
  // Send initial data from database
  try {
    const latestDetections = await getLatestDetections();
    const stats = await getDetectionStats();
    
    socket.emit('initial_data', {
      detections: latestDetections,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error sending initial data:', error);
  }
  
  // Handle request for latest data
  socket.on('request_latest_data', async () => {
    try {
      const latestDetections = await getLatestDetections();
      const stats = await getDetectionStats();
      
      socket.emit('latest_data', {
        detections: latestDetections,
        stats: stats
      });
    } catch (error) {
      console.error('❌ Error sending latest data:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('❌ React client disconnected:', socket.id);
  });
});

// REST API endpoints
app.get('/api/detections', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const detections = await getLatestDetections(limit);
    res.json(detections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch detections' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getDetectionStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

console.log(`🚀 Node.js server listening on port ${PORT} for React clients`);

// Connect to Python detection server
const pythonSocket = Client(PYTHON_SERVER_URL);

pythonSocket.on('connect', () => {
  console.log(`🔗 Successfully connected to Python detection server at ${PYTHON_SERVER_URL}`);
});

// Relay detection data from Python to React clients
pythonSocket.on('deteksi', (data) => {
  io.emit('deteksi', data);
});

// When new detection is logged to database, update all clients
pythonSocket.on('log', async (data) => {
  console.log('📝 New detection logged to database -> Updating clients');
  
  // Send log event
  io.emit('log', data);
  
  // Send updated data from database
  try {
    const latestDetections = await getLatestDetections();
    const stats = await getDetectionStats();
    
    io.emit('database_update', {
      detections: latestDetections,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error sending database update:', error);
  }
});

// Relay video frames
pythonSocket.on('video_frame', (data) => {
  io.emit('video_frame', data);
});

pythonSocket.on('disconnect', () => {
  console.log('🔌 Python detection server disconnected');
});

pythonSocket.on('connect_error', (error) => {
  console.log('❌ Failed to connect to Python server:', error.message);
});

// Initialize database and start server
async function startServer() {
  await initDatabase();
  httpServer.listen(PORT, () => {
    console.log(`🌐 Server running on http://localhost:${PORT}`);
  });
}

startServer();