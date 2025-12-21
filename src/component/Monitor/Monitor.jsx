// Monitor.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import "./Monitor.css";

import MonitorLeft from "./MonitorLeft";
import MonitorRight from "./MonitorRight";

const getTodayDDMMYYYY = () => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const Monitor = () => {
  const [videoFrame, setVideoFrame] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [detectionData, setDetectionData] = useState(null);
  const [detectionHistory, setDetectionHistory] = useState([]);
  const [detectionStats, setDetectionStats] = useState({
    today_birds: 0,
    total_birds: 0,
    today_detections: 0,
    total_detections: 0,
  });

  const [selectedDate, setSelectedDate] = useState("today");
  const [availableDates, setAvailableDates] = useState([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const socketRef = useRef(null);

  const getTodayDate = () => new Date().toISOString().split("T")[0];

  const formatTime = (ts) => new Date(ts).toLocaleTimeString("id-ID");

  const formatDate = (date) =>
    date === "today" ? "Today" : new Date(date).toLocaleDateString("id-ID");

  const handleDateChange = (date) => {
    const realDate = date === "today" ? getTodayDDMMYYYY() : date;

    setSelectedDate(realDate);
    setIsRefreshing(true);

    socketRef.current?.emit("request_date_data", {
      date: realDate,
    });
  };

  const handleFallbackRefresh = () => {
    setIsRefreshing(true);
    // API fallback kamu tetap di sini
  };

  const totalBirdsSelectedDate = detectionHistory.reduce(
    (sum, d) => sum + (d.birds || 0),
    0
  );

  useEffect(() => {
    const socket = io("http://localhost:3000");
    socketRef.current = socket;

    const mapDetections = (rows = []) =>
      rows.map((row) => ({
        id: row.id,
        birds: row.jumlah_burung,
        time: `${row.waktu}`,
        date: `${row.tanggal}`,
        duration: row.lama_terdeteksi,
      }));

    socket.on("connect", () => {
      setConnectionStatus("Connected");

      // 🔥 LANGSUNG REQUEST DATA HARI INI
      const today = getTodayDDMMYYYY();
      setSelectedDate(today);
      setIsRefreshing(true);

      socket.emit("request_date_data", {
        date: today,
      });
    });
    socket.on("disconnect", () => setConnectionStatus("Disconnected"));

    socket.on("video_frame", (data) =>
      setVideoFrame(`data:image/jpeg;base64,${data}`)
    );

    socket.on("deteksi", setDetectionData);

    socket.on("initial_data", (data) => {
      setDetectionHistory(mapDetections(data.detections));
      setDetectionStats(data.stats);

      // 🔥 PAKSA selectedDate menjadi tanggal hari ini
      setSelectedDate(getTodayDDMMYYYY());

      setIsRefreshing(false);
    });

    // ⬇️ TODAY REFRESH
    socket.on("latest_data", (data) => {
      setDetectionHistory(mapDetections(data.detections));
      setDetectionStats(data.stats);
      setIsRefreshing(false);
    });

    // ⬇️ DATE PICKER
    socket.on("date_data", (data) => {
      setDetectionHistory(mapDetections(data.detections));
      setDetectionStats(data.stats);
      setIsRefreshing(false);
    });

    // ⬇️ DB UPDATE FROM PYTHON
    socket.on("database_update", (data) => {
      setDetectionHistory(mapDetections(data.detections));
      setDetectionStats(data.stats);
    });

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    setIsLoadingDates(true);

    fetch("http://localhost:3000/api/available-dates")
      .then((res) => res.json())
      .then((dates) => {
        setAvailableDates(dates); // ← isi dari kolom `tanggal`
        setIsLoadingDates(false);
      })
      .catch((err) => {
        console.error("Failed to load dates:", err);
        setIsLoadingDates(false);
      });
  }, []);

  return (
    <section id="home">
      <div className="monitor">
        <MonitorLeft
          videoFrame={videoFrame}
          connectionStatus={connectionStatus}
        />

        <MonitorRight
          selectedDate={selectedDate}
          availableDates={availableDates}
          isLoadingDates={isLoadingDates}
          isRefreshing={isRefreshing}
          detectionData={detectionData}
          detectionStats={detectionStats}
          detectionHistory={detectionHistory}
          totalBirds={totalBirdsSelectedDate}
          formatDate={formatDate}
          handleDateChange={handleDateChange}
          handleFallbackRefresh={handleFallbackRefresh}
          getTodayDDMMYYYY={getTodayDDMMYYYY}
        />
      </div>
    </section>
  );
};

export default Monitor;
