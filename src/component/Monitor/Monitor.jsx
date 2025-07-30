// Monitor.jsx - Enhanced Monitoring Component with Database Integration
import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import "./Monitor.css";

const Monitor = () => {
  // Video and detection states
  const [videoFrame, setVideoFrame] = useState("");
  const [detectionData, setDetectionData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Database states
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [detectionStats, setDetectionStats] = useState({
    today_birds: 0
  });
  
  // Live log states
  const [liveLogList, setLiveLogList] = useState([]);
  
  // Socket reference to ensure we always have the latest instance
  const socketRef = useRef(null);
  const refreshTimeoutRef = useRef(null);

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const socket = io("http://localhost:3000", {
      forceNew: true,
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection status handlers
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnectionStatus("Connected");
      // Request initial data after connection
      socket.emit('request_latest_data');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      setConnectionStatus("Disconnected");
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Connection error:', error);
      setConnectionStatus("Connection Error");
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Reconnected after', attemptNumber, 'attempts');
      setConnectionStatus("Connected");
      // Request fresh data after reconnection
      socket.emit('request_latest_data');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Attempting to reconnect...', attemptNumber);
      setConnectionStatus("Reconnecting...");
    });

    socket.on('reconnect_failed', () => {
      console.log('❌ Failed to reconnect');
      setConnectionStatus("Connection Failed");
    });

    // Video frame handler
    socket.on('video_frame', (data) => {
      const imageSrc = `data:image/jpeg;base64,${data}`;
      setVideoFrame(imageSrc);
    });

    // Real-time detection data handler
    socket.on("deteksi", (data) => {
      setDetectionData(data);
    });

    // Live log handler (when detection is saved to database)
    socket.on("log", (data) => {
      const logEntry = {
        text: `🐦 ${data.jumlah} bird${data.jumlah > 1 ? 's' : ''} detected`,
        time: data.waktu,
        count: data.jumlah,
        timestamp: new Date().toISOString()
      };
      
      setLiveLogList((prevLogs) => [logEntry, ...prevLogs.slice(0, 19)]); // Keep only last 20 entries
    });

    // Database update handler
    socket.on('database_update', (data) => {
      if (data.detections) {
        setDetectionHistory(data.detections);
      }
      if (data.stats) {
        setDetectionStats(data.stats);
      }
    });

    // Initial data handler
    socket.on('initial_data', (data) => {
      console.log('📊 Received initial data from database');
      if (data.detections) {
        setDetectionHistory(data.detections);
      }
      if (data.stats) {
        setDetectionStats(data.stats);
      }
      setIsRefreshing(false);
    });

    // Request latest data handler
    socket.on('latest_data', (data) => {
      console.log('📊 Received latest data from database');
      if (data.detections) {
        setDetectionHistory(data.detections);
      }
      if (data.stats) {
        setDetectionStats(data.stats);
      }
      setIsRefreshing(false);
    });

    return socket;
  }, []);

  // Format timestamp for display
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  useEffect(() => {
    const socket = initializeSocket();
    
    // Cleanup function
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("reconnect");
      socket.off("reconnect_attempt");
      socket.off("reconnect_failed");
      socket.off("video_frame");
      socket.off("deteksi");
      socket.off("log");
      socket.off("database_update");
      socket.off("initial_data");
      socket.off("latest_data");
      socket.disconnect();
    };
  }, []);

  // Enhanced refresh function with better error handling and timeout
  const handleRefresh = useCallback(() => {
    if (isRefreshing) {
      console.log('⚠️ Refresh already in progress, skipping...');
      return;
    }

    console.log('🔄 Manual refresh triggered');
    setIsRefreshing(true);

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    try {
      // Check if socket is connected
      if (socketRef.current && socketRef.current.connected) {
        console.log('📡 Socket connected, requesting latest data...');
        socketRef.current.emit('request_latest_data');
        
        // Set timeout to reset refreshing state if no response
        refreshTimeoutRef.current = setTimeout(() => {
          console.log('⚠️ Refresh timeout, resetting state...');
          setIsRefreshing(false);
        }, 10000);
        
      } else {
        console.log('🔌 Socket disconnected, attempting to reconnect...');
        setConnectionStatus("Reconnecting...");
        
        // Try to reconnect
        if (socketRef.current) {
          socketRef.current.connect();
        } else {
          // Reinitialize socket if it doesn't exist
          initializeSocket();
        }
        
        // Reset refreshing state after attempting reconnection
        setTimeout(() => {
          setIsRefreshing(false);
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      setIsRefreshing(false);
    }
  }, [isRefreshing, initializeSocket]);

  // Fallback API refresh function
  const handleFallbackRefresh = useCallback(async () => {
    console.log('🌐 Using fallback API refresh...');
    setIsRefreshing(true);
    
    try {
      // Fetch data directly from API as fallback
      const [detectionsResponse, statsResponse] = await Promise.all([
        fetch('http://localhost:3000/api/detections'),
        fetch('http://localhost:3000/api/stats')
      ]);
      
      if (detectionsResponse.ok && statsResponse.ok) {
        const detections = await detectionsResponse.json();
        const stats = await statsResponse.json();
        
        setDetectionHistory(detections);
        setDetectionStats(stats);
        console.log('✅ Fallback refresh successful');
      } else {
        console.error('❌ API requests failed');
      }
    } catch (error) {
      console.error('❌ Fallback refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Connection health check every 30 seconds
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      if (socketRef.current && !socketRef.current.connected) {
        console.log('🏥 Health check: Socket disconnected, attempting reconnection...');
        setConnectionStatus("Reconnecting...");
        socketRef.current.connect();
      }
    }, 30000);

    return () => clearInterval(healthCheckInterval);
  }, []);

  return (
    <div className="monitor">
      {/* Left Side - Camera Feed */}
      <div className="monitor-left">
        <div className="monitor-left-title">
          <h1>🎥 Real-time Camera Feed</h1>
          <div className="connection-status">
            <span className={`status-indicator ${connectionStatus.toLowerCase().replace(/[^a-z]/g, '-')}`}>
              ● {connectionStatus}
            </span>
          </div>
        </div>
        
        <div className="monitor-left-content">
          <div className="video-wrapper">
            {videoFrame ? (
              <div className="video-grid-container">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="camera-container">
                    <img
                      src={videoFrame}
                      alt={`Camera Feed ${index + 1}`}
                      className="camera-feed"
                    />
                    <div className="camera-label">Camera {index + 1}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="video-placeholder">
                <div className="loading-spinner"></div>
                <p>Waiting for video stream from detection server...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Side - Detection Data and Database Records */}
      <div className="monitor-right">
        <div className="monitor-right-title">
          <h2>📊 Detection Monitoring</h2>
          <div className="refresh-buttons">
            {/* <button 
              onClick={handleRefresh} 
              className={`refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              disabled={isRefreshing}
            >
              {isRefreshing ? '⏳ Refreshing...' : '🔄 Refresh Data'}
            </button> */}
            <button 
              onClick={handleFallbackRefresh} 
              className="refresh-btn"
              disabled={isRefreshing}
              title="Use API fallback if socket fails"
            >
              🌐 API Refresh
            </button>
          </div>
        </div>

        {/* Current Detection Status */}
        <div className="monitor-right-content">
          <div className="monitor-right-content-status">
            <h4>🔴 Live Detection Status:</h4>
            {detectionData ? (
              <div className="current-detection">
                <div className="detection-count">
                  <strong>{detectionData.jumlah}</strong> 
                  <span> bird{detectionData.jumlah !== 1 ? 's' : ''} currently detected</span>
                </div>
                <p className="last-update">Last update: {detectionData.waktu}</p>
              </div>
            ) : (
              <p className="waiting-data">Waiting for detection data...</p>
            )}
          </div>
          <div className="stat-item">
            <span className="stat-number">{detectionStats.today_birds} </span>
            <span className="stat-label">Birds Today</span>
          </div>
        </div>

        {/* Live Detection Log
        <div className="monitor-right-content-log">
          <h4>Live Detection Alerts:</h4>
          <div className="log-container">
            {liveLogList.length > 0 ? (
              liveLogList.map((log, index) => (
                <div key={index} className="log-entry live-log">
                  <span className="log-text">{log.text}</span>
                  <span className="log-time">{log.time}</span>
                </div>
              ))
            ) : (
              <div className="no-logs">No recent detection alerts</div>
            )}
          </div>
        </div> */}

        {/* Database Detection History */}
        <div className="detection-history">
          <h4>Detection History (Database):</h4>
          <div className="history-container">
            {detectionHistory.length > 0 ? (
              detectionHistory.map((detection, index) => (
                <div key={detection.id || index} className="history-entry">
                  <div className="history-content">
                    <span className="history-count">
                      🐦 {detection.birds} bird{detection.birds !== 1 ? 's' : ''} detected
                    </span>
                    <span className="history-time">
                      {formatTime(detection.time)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-history">No detection records found in database</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Monitor;