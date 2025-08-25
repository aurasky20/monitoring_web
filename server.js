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
  user: 'root',
  password: '',
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

// Function to get today's detections only
async function getTodaysDetections(limit = 50) {
  try {
    const [rows] = await dbPool.execute(
      'SELECT * FROM log_detection WHERE DATE(time) = CURDATE() ORDER BY time DESC LIMIT ?',
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('❌ Error fetching today\'s detection data:', error);
    return [];
  }
}

// Function to get detections by specific date
async function getDetectionsByDate(date, limit = 50) {
  try {
    const [rows] = await dbPool.execute(
      'SELECT * FROM log_detection WHERE DATE(time) = ? ORDER BY time DESC LIMIT ?',
      [date, limit]
    );
    return rows;
  } catch (error) {
    console.error('❌ Error fetching detection data for date:', date, error);
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
  
  // Send initial data from database (today's data only)
  try {
    const todaysDetections = await getTodaysDetections();
    const stats = await getDetectionStats();
    
    socket.emit('initial_data', {
      detections: todaysDetections,
      stats: stats
    });
  } catch (error) {
    console.error('❌ Error sending initial data:', error);
  }
  
  // Handle request for latest data (today's data only)
  socket.on('request_latest_data', async () => {
    try {
      const todaysDetections = await getTodaysDetections();
      const stats = await getDetectionStats();
      
      socket.emit('latest_data', {
        detections: todaysDetections,
        stats: stats
      });
    } catch (error) {
      console.error('❌ Error sending latest data:', error);
    }
  });

  // Handle request for specific date data
  socket.on('request_date_data', async (data) => {
    try {
      const { date, limit } = data;
      const detections = await getDetectionsByDate(date, limit || 50);
      const stats = await getDetectionStats();
      
      socket.emit('date_data', {
        detections: detections,
        stats: stats,
        requestedDate: date
      });
    } catch (error) {
      console.error('❌ Error sending date data:', error);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('❌ React client disconnected:', socket.id);
  });
});

// REST API endpoints
// Original endpoint for today's detections only
app.get('/api/detections', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const detections = await getTodaysDetections(limit);
    res.json(detections);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch detections' });
  }
});

// New endpoint with optional date parameter
app.get('/api/detections/:date?', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const date = req.params.date; // Format: YYYY-MM-DD
    
    let detections;
    if (date) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      detections = await getDetectionsByDate(date, limit);
    } else {
      detections = await getTodaysDetections(limit);
    }
    
    res.json({
      date: date || 'today',
      count: detections.length,
      detections: detections
    });
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

// Additional endpoint to get available dates
app.get('/api/available-dates', async (req, res) => {
  try {
    const [rows] = await dbPool.execute(
      'SELECT DISTINCT DATE(time) as date FROM log_detection ORDER BY date DESC LIMIT 30'
    );
    res.json(rows.map(row => row.date));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available dates' });
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
  
  // Send updated data from database (today's data only)
  try {
    const todaysDetections = await getTodaysDetections();
    const stats = await getDetectionStats();
    
    io.emit('database_update', {
      detections: todaysDetections,
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