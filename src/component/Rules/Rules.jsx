import React from 'react';
import './Rules.css';

function Rules() {
  return (
    <section id="rules">
    <div className="rules-container">
      <div className="rules-header">
        <h1>📋 Monitoring System Guidelines</h1>
        <p className="rules-subtitle">Bird Detection Camera Monitoring Rules & Procedures</p>
      </div>

      <div className="rules-content">
        {/* System Operation Rules */}
        <div className="rules-section">
          <div className="section-header">
            <h3>🎥 Camera System Operations</h3>
          </div>
          <div className="rules-list">
            <div className="rule-item">
              <div className="rule-number">1</div>
              <div className="rule-text">
                <strong>Continuous Monitoring:</strong> Camera feeds must remain active 24/7 for optimal bird detection coverage
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">2</div>
              <div className="rule-text">
                <strong>Connection Status Check:</strong> Monitor connection status indicator - report any disconnection immediately
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">3</div>
              <div className="rule-text">
                <strong>Video Feed Quality:</strong> Ensure all 4 camera feeds display clear, real-time footage without lag
              </div>
            </div>
          </div>
        </div>

        {/* Detection Monitoring Rules */}
        <div className="rules-section">
          <div className="section-header">
            <h3>🐦 Bird Detection Monitoring</h3>
          </div>
          <div className="rules-list">
            <div className="rule-item">
              <div className="rule-number">4</div>
              <div className="rule-text">
                <strong>Detection Verification:</strong> Cross-reference live detection counts with visual confirmation from camera feeds
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">5</div>
              <div className="rule-text">
                <strong>Data Accuracy:</strong> Report any discrepancies between detection counts and actual bird presence
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">6</div>
              <div className="rule-text">
                <strong>Detection History:</strong> Review detection history logs daily to identify patterns and anomalies
              </div>
            </div>
          </div>
        </div>

        {/* System Maintenance Rules */}
        <div className="rules-section">
          <div className="section-header">
            <h3>⚙️ System Maintenance & Response</h3>
          </div>
          <div className="rules-list">
            <div className="rule-item">
              <div className="rule-number">7</div>
              <div className="rule-text">
                <strong>Refresh Protocol:</strong> Use "API Refresh" button if data appears outdated or connection issues occur
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">8</div>
              <div className="rule-text">
                <strong>Error Reporting:</strong> Document and report system errors, connection failures, or detection malfunctions
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">9</div>
              <div className="rule-text">
                <strong>Regular Checks:</strong> Perform system health checks every 2 hours during monitoring shifts
              </div>
            </div>
          </div>
        </div>

        {/* Data Management Rules */}
        <div className="rules-section">
          <div className="section-header">
            <h3>📊 Data Management & Privacy</h3>
          </div>
          <div className="rules-list">
            <div className="rule-item">
              <div className="rule-number">10</div>
              <div className="rule-text">
                <strong>Data Confidentiality:</strong> All detection data and camera feeds are confidential - no unauthorized sharing
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">11</div>
              <div className="rule-text">
                <strong>Access Control:</strong> Only authorized personnel may access the monitoring system and its data
              </div>
            </div>
            <div className="rule-item">
              <div className="rule-number">12</div>
              <div className="rule-text">
                <strong>Backup Verification:</strong> Ensure detection history is properly stored in the database system
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </section>
  );
}

export default Rules;