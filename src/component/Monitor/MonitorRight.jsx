// MonitorRight.jsx
import React from "react";
import { BiSolidCameraMovie } from "react-icons/bi";

const toISODate = (ddmmyyyy) => {
  const [dd, mm, yyyy] = ddmmyyyy.split("-");
  return `${yyyy}-${mm}-${dd}`;
};

const MonitorRight = ({
  selectedDate,
  availableDates,
  isLoadingDates,
  isRefreshing,
  detectionData,
  detectionStats,
  detectionHistory,
  handleDateChange,
  handleFallbackRefresh,
  getTodayDDMMYYYY,
  totalBirds,
}) => {
  return (
    <div className="monitor-right">
      <div className="monitor-right-title">
        <div className="monitoring-right-subtitle">
          <BiSolidCameraMovie size={32} />
          <h2>Log Detection</h2>
        </div>
      </div>

      {/* Date Picker */}
      <div className="date-picker-section">
        <label>📅 Select Date:</label>

        <div
          className="custom-date-picker"
          onClick={() =>
            document.getElementById("hidden-date-input").showPicker()
          }
        >
          {/* TEXT FIELD (READ ONLY) */}
          <input
            type="text"
            readOnly
            className="date-display-input"
            value={
              selectedDate === "today"
                ? `Today (${getTodayDDMMYYYY()})`
                : selectedDate
            }
          />

          {/* ICON CALENDAR */}
          <div className="calendar-icon">📅</div>
        </div>

        {/* INPUT DATE ASLI (HIDDEN) */}
        <input
          id="hidden-date-input"
          type="date"
          className="hidden-date-input"
          max={new Date().toISOString().split("T")[0]}
          value={
            selectedDate === "today"
              ? new Date().toISOString().split("T")[0]
              : toISODate(selectedDate)
          }
          onChange={(e) => {
            const [yyyy, mm, dd] = e.target.value.split("-");
            handleDateChange(`${dd}-${mm}-${yyyy}`);
          }}
        />
      </div>

      {/* Current Detection Status */}
      <div className="monitor-right-content">
        <div className="monitor-right-content-status">
          <h4>🔴 Live Detection Status:</h4>
          {detectionData ? (
            <div className="current-detection">
              <div className="detection-count">
                <strong>{detectionData.jumlah}</strong>
                <span>
                  {" "}
                  bird{detectionData.jumlah !== 1 ? "s" : ""} detected
                </span>
              </div>
              {/* <p className="last-update">Last update: {detectionData.waktu}</p> */}
            </div>
          ) : (
            <p className="waiting-data">Waiting for detection data...</p>
          )}
        </div>
        <div className="stat-item">
          <span className="stat-number">{totalBirds}</span>
          <span className="stat-label">Total Birds Detected</span>
        </div>
      </div>

      {/* Database Detection History */}
      <div className="detection-history">
        <h4>Detection History ({selectedDate}):</h4>
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
                    🐦 {detection.birds} bird
                    {detection.birds !== 1 ? "s" : ""} detected
                  </span>

                  <span className="history-time">⏱ {detection.duration}</span>

                  <span className="history-time">
                    {detection.time}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-history">
              No detection records found for {selectedDate}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonitorRight;
