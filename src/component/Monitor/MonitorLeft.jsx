// MonitorLeft.jsx
import React from "react";

const MonitorLeft = ({ videoFrame, connectionStatus }) => {
  return (
    <div className="monitor-left">
      <div className="monitor-left-title">
        <span
          className={`status-indicator ${connectionStatus
            .toLowerCase()
            .replace(/[^a-z]/g, "-")}`}
        >
          ● {connectionStatus}
        </span>
      </div>

      <div className="monitor-left-content">
        {videoFrame ? (
          <div className="camera-container">
            <img
              src={videoFrame}
              alt="Camera Feed"
              className="camera-feed"
            />
            <div className="camera-label">Camera</div>
          </div>
        ) : (
          <div className="video-placeholder">
            <div className="loading-spinner"></div>
            <p>Waiting for video stream from detection server...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorLeft;
