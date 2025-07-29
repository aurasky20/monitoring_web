// Monitor.jsx - Enhanced Monitoring Component with Database Integration
import React, { useState, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import "./Monitor.css";

const socket = io("http://localhost:3000");

const Monitor = () => {
  // Video and detection states
  const [videoFrame, setVideoFrame] = useState("");
  const [detectionData, setDetectionData] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  
  // Database states
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [detectionStats, setDetectionStats] = useState({
    today_birds: 0
  });
  
  // Live log states
  const [liveLogList, setLiveLogList] = useState([]);

  // Format timestamp for display
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('id-ID', {
      // year: 'numeric',
      // month: '2-digit',
      // day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  useEffect(() => {
    // Connection status handlers
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnectionStatus("Connected");
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setConnectionStatus("Disconnected");
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Connection error:', error);
      setConnectionStatus("Connection Error");
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
    });

    // Request latest data handler
    socket.on('latest_data', (data) => {
      if (data.detections) {
        setDetectionHistory(data.detections);
      }
      if (data.stats) {
        setDetectionStats(data.stats);
      }
    });

    // Request initial data on component mount
    socket.emit('request_latest_data');

    // Cleanup function
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("video_frame");
      socket.off("deteksi");
      socket.off("log");
      socket.off("database_update");
      socket.off("initial_data");
      socket.off("latest_data");
    };
  }, []);

  // Manual refresh function
  const handleRefresh = () => {
    socket.emit('request_latest_data');
  };

  return (
    <div className="monitor">
      {/* Left Side - Camera Feed */}
      <div className="monitor-left">
        <div className="monitor-left-title">
          <h1>🎥 Real-time Camera Feed</h1>
          <div className="connection-status">
            <span className={`status-indicator ${connectionStatus.toLowerCase().replace(' ', '-')}`}>
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
          <button onClick={handleRefresh} className="refresh-btn">
            🔄 Refresh Data
          </button>
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
        

        {/* Live Detection Log */}
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
        </div>

        {/* Database Detection History */}
        <div className="detection-history">
          <h4>Detection History (Database):</h4>
          <div className="history-container">
            {detectionHistory.length > 0 ? (
              detectionHistory.map((detection, index) => (
                <div key={detection.id || index} className="history-entry">
                  <div className="history-content">
                    <span className="history-count">
                      🐦 {detection.birds} bird {detection.birds !== 1 ? 's' : ''}
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

        {/* Detection Statistics */}
        <div className="detection-stats">
          <h4>Detection Statistics:</h4>
          
        </div>

      </div>
    </div>
  );
};

export default Monitor;