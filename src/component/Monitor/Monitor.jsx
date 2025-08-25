// Monitor.jsx - Enhanced Monitoring Component with Date Picker
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
  
  // Date picker states
  const [selectedDate, setSelectedDate] = useState('today');
  const [availableDates, setAvailableDates] = useState([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  
  // Live log states
  const [liveLogList, setLiveLogList] = useState([]);
  
  // Socket reference
  const socketRef = useRef(null);
  const refreshTimeoutRef = useRef(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

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
      if (selectedDate === 'today') {
        socket.emit('request_latest_data');
      } else {
        socket.emit('request_date_data', { date: selectedDate });
      }
      // Load available dates
      loadAvailableDates();
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
      if (selectedDate === 'today') {
        socket.emit('request_latest_data');
      } else {
        socket.emit('request_date_data', { date: selectedDate });
      }
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
      
      setLiveLogList((prevLogs) => [logEntry, ...prevLogs.slice(0, 19)]);
      setDetectionData(data); 
    });

    // Database update handler
    socket.on('database_update', (data) => {
      if (selectedDate === 'today') {
        if (data.detections) {
          setDetectionHistory(data.detections);
        }
        if (data.stats) {
          setDetectionStats(data.stats);
        }
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

    // Date-specific data handler
    socket.on('date_data', (data) => {
      console.log('📊 Received date-specific data:', data.requestedDate);
      if (data.detections) {
        setDetectionHistory(data.detections);
      }
      if (data.stats) {
        setDetectionStats(data.stats);
      }
      setIsRefreshing(false);
    });

    return socket;
  }, [selectedDate]);

  // Load available dates
  const loadAvailableDates = useCallback(async () => {
    setIsLoadingDates(true);
    try {
      const response = await fetch('http://localhost:3000/api/available-dates');
      if (response.ok) {
        const dates = await response.json();
        setAvailableDates(dates);
      }
    } catch (error) {
      console.error('❌ Error loading available dates:', error);
    } finally {
      setIsLoadingDates(false);
    }
  }, []);

  // Handle date selection
  const handleDateChange = useCallback((date) => {
    console.log('📅 Date changed to:', date);
    setSelectedDate(date);
    setIsRefreshing(true);

    if (socketRef.current && socketRef.current.connected) {
      if (date === 'today') {
        socketRef.current.emit('request_latest_data');
      } else {
        socketRef.current.emit('request_date_data', { date: date });
      }
    } else {
      // Fallback to API if socket not connected
      handleAPIRefreshForDate(date);
    }
  }, []);

  // API refresh for specific date
  const handleAPIRefreshForDate = useCallback(async (date) => {
    console.log('🌐 API refresh for date:', date);
    setIsRefreshing(true);
    
    try {
      const url = date === 'today' 
        ? 'http://localhost:3000/api/detections'
        : `http://localhost:3000/api/detections/${date}`;
        
      const [detectionsResponse, statsResponse] = await Promise.all([
        fetch(url),
        fetch('http://localhost:3000/api/stats')
      ]);
      
      if (detectionsResponse.ok && statsResponse.ok) {
        const detectionsData = await detectionsResponse.json();
        const stats = await statsResponse.json();
        
        // Handle the new API response format
        const detections = detectionsData.detections || detectionsData;
        
        setDetectionHistory(detections);
        setDetectionStats(stats);
        console.log('✅ API refresh successful for date:', date);
      } else {
        console.error('❌ API requests failed');
      }
    } catch (error) {
      console.error('❌ API refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
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

  // Format date for display
  const formatDate = useCallback((dateStr) => {
    if (dateStr === 'today') return 'Today';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
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
      socket.off("date_data");
      socket.disconnect();
    };
  }, []);

  // Enhanced refresh function
  const handleRefresh = useCallback(() => {
    if (isRefreshing) {
      console.log('⚠️ Refresh already in progress, skipping...');
      return;
    }

    console.log('🔄 Manual refresh triggered for:', selectedDate);
    handleDateChange(selectedDate);
  }, [isRefreshing, selectedDate, handleDateChange]);

  // Fallback API refresh function
  const handleFallbackRefresh = useCallback(async () => {
    await handleAPIRefreshForDate(selectedDate);
  }, [selectedDate, handleAPIRefreshForDate]);

  return (
    <section id="home"> 
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
              className="refresh-btn"
              disabled={isRefreshing}
            >
              {isRefreshing ? '⏳' : '🔄'} Refresh
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

        {/* Date Picker */}
        <div className="date-picker-section">
          <label htmlFor="date-select">📅 Select Date:</label>
          <select 
            id="date-select"
            value={selectedDate} 
            onChange={(e) => handleDateChange(e.target.value)}
            disabled={isLoadingDates}
            className="date-select"
          >
            <option value="today">Today ({getTodayDate()})</option>
            {availableDates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)} ({date})
              </option>
            ))}
          </select>
          <span className="selected-date-info">
            Showing data for: <strong>{formatDate(selectedDate)}</strong>
          </span>
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

        {/* Database Detection History */}
        <div className="detection-history">
          <h4>Detection History ({formatDate(selectedDate)}):</h4>
          <div className="history-container">
            {isRefreshing ? (
              <div className="loading-history">
                <div className="loading-spinner"></div>
                <span>Loading detection history...</span>
              </div>
            ) : detectionHistory.length > 0 ? (
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
              <div className="no-history">
                No detection records found for {formatDate(selectedDate)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </section>
  );
};

export default Monitor;