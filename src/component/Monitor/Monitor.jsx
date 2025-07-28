// Monitor.jsx - Diperbaiki untuk Menerima Streaming Video
import React, { useState, useEffect } from "react"; // Hapus useRef
import { io } from "socket.io-client";
import "./Monitor.css";

const socket = io("http://localhost:3000");

const Monitor = () => {
  // --- Frame video dari server ---
  const [videoFrame, setVideoFrame] = useState(""); 
  const [detectionData, setDetectionData] = useState(null);
  const [logList, setLogList] = useState([]);
  
  // Hapus fungsi startCamera dan stopCamera karena tidak diperlukan lagi

  useEffect(() => {
    // --- Listener untuk menerima frame video ---
    socket.on('video_frame', (data) => {
      // Data adalah string base64, ubah menjadi format gambar untuk tag <img>
      const imageSrc = `data:image/jpeg;base64,${data}`;
      setVideoFrame(imageSrc);
    });

    socket.on("deteksi", (data) => {
      setDetectionData(data);
    });

    socket.on("log", (data) => {
      // --- Simpan log sebagai objek
      setLogList((prevLogs) => [
        { 
          text: `⚠️ ${data.jumlah} object detected`, 
          time: data.waktu 
        },
        ...prevLogs,
      ]);
    });

    return () => {
      // Bersihkan semua listener saat komponen unmount
      socket.off("video_frame");
      socket.off("deteksi");
      socket.off("log");
    };
  }, []);

  return (
    <div className="monitor">
      {/* Bagian Kiri (Kamera dari Server) */}
      <div className="monitor-left">
        <div className="monitor-left-title">
          <h1>Monitoring Camera</h1>
          {/* <p>Real-time feed from the detection server.</p> */}
        </div>
        <div className="monitor-left-content">
          
          <div className="video-wrapper">
  {videoFrame ? (
    // ---  Tampilkan gambar 4x ---
    <div className="video-grid-container">
      {[0, 1, 2, 3].map((index) => (
        <img
          key={index}
          src={videoFrame}
          alt={`Live Feed ${index + 1}`}
          className="camera-feed"
        />
      ))}
    </div>
  ) : (
    <div className="video-placeholder">
      Menunggu streaming video dari server...
    </div>
  )}
</div>
        </div>
      </div>

      {/* Bagian Kanan (Feed/Log) tidak berubah */}
      <div className="monitor-right">
        <div className="monitor-right-title">
          <h2>Live Camera Feed</h2>
          <p>Feed the camera is detecting the objects.</p>
        </div>
        <div className="monitor-right-content-status">
          <h4>Current Status:</h4>
          {detectionData ? (
            <>
              <p><strong>{detectionData.jumlah}</strong> object detected by the camera</p>
              <p><em>Last update: {detectionData.waktu}</em></p>
            </>
          ) : (
            <p>Waiting for data...</p>
          )}
        </div>
        <div className="monitor-right-content-log">
          <h4>Object Detection Log:</h4>
          <ul id="log">
          {logList.length > 0 ? (
            // --- PERUBAHAN 2: Render dua <span> di dalam <li> ---
            logList.map((log, index) => (
              
              <li key={index} className="log-entry">
                <span>{log.text}</span>
                <span>{log.time}</span>
              </li>
            ))
          ) : (
            <li>No objects detected.</li>
          )}
        </ul>
        </div>
      </div>
    </div>
  );
};

export default Monitor;