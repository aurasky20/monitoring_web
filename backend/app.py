# app.py - Detection System with Database Integration
from flask import Flask
from flask_socketio import SocketIO
import cv2
import datetime
import threading
import os
import time
import base64
import mysql.connector
from ultralytics import YOLO
from mysql.connector import Error

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

previous_bird_count = 0
group_start_time = None
last_detected_time = None
last_bird_count = 0

pending_save_time = None
pending_save_count = None

REDUCTION_CONFIRM_SECONDS = 5
LOST_TOLERANCE_SECONDS = 2



# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'monitoring',
    'user': 'root',  # Sesuaikan dengan username database Anda
    'password': ''   # Sesuaikan dengan password database Anda
}

# Initialize detection components
cascade_path = os.path.join(os.path.dirname(__file__), 'best.pt')
model = YOLO("best.pt") 
camera = cv2.VideoCapture(0)

detection_start_time = None
max_bird_count = 0

MIN_DETECTION_SECONDS = 10

def format_duration(seconds):
    seconds = int(seconds)
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:02d}"


def init_database():
    """Initialize database and create table if not exists"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        # Create database if not exists
        cursor.execute("CREATE DATABASE IF NOT EXISTS monitoring")
        cursor.execute("USE monitoring")
        
        # Create table if not exists
        create_table_query = """
        CREATE TABLE IF NOT EXISTS log_detection (
            id INT AUTO_INCREMENT PRIMARY KEY,
            jumlah_burung INT NOT NULL,
            lama_terdeteksi TIME NOT NULL,
            waktu TIME NOT NULL,
            tanggal VARCHAR(10) NOT NULL
        );

        """
        cursor.execute(create_table_query)
        connection.commit()
        print("✅ Database initialized successfully")
        
    except Error as e:
        print(f"❌ Error initializing database: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def save_detection_to_db(jumlah_burung, duration_seconds, end_time):
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()

        lama_terdeteksi = str(datetime.timedelta(seconds=int(duration_seconds)))
        waktu = end_time.strftime("%H:%M:%S")
        tanggal = end_time.strftime("%d-%m-%Y")

        query = """
        INSERT INTO log_detection 
        (jumlah_burung, lama_terdeteksi, waktu, tanggal)
        VALUES (%s, %s, %s, %s)
        """
        cursor.execute(query, (
            jumlah_burung,
            lama_terdeteksi,
            waktu,
            tanggal
        ))
        connection.commit()

        print(f"✅ Saved: {jumlah_burung} burung | {lama_terdeteksi}")

        # 🔥 KIRIM EVENT KE NODE
        socketio.emit("log", {
            "jumlah_burung": jumlah_burung,
            "lama_terdeteksi": lama_terdeteksi,
            "waktu": waktu,
            "tanggal": tanggal
        })

    except Error as e:
        print(f"❌ DB Error: {e}")

    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()


def detect_and_stream():
    """Main detection and streaming function"""

    global group_start_time, last_bird_count, last_detected_time
    global pending_save_time, pending_save_count

    while True:
        ret, frame = camera.read()
        if not ret:
            continue

        frame = cv2.flip(frame, 1)

        results = model(frame, conf=0.5, verbose=False)

        detections = results[0].boxes

        bird_boxes = []
        for box in detections:
            cls_id = int(box.cls[0])
            if cls_id == 0:  # 0 = birds
                bird_boxes.append(box)

        bird_count = len(bird_boxes)

        now = datetime.datetime.now()

        active_duration = 0
        if group_start_time:
            active_duration = (now - group_start_time).total_seconds()

        # === DRAW BOX & TIMER ===
        for box in bird_boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

            if group_start_time: 
                if bird_count <= 1:
                    label = f"{bird_count} bird | {format_duration(active_duration)}"
                else:
                    label = f"{bird_count} birds | {format_duration(active_duration)}"
            else: 
                label = f"Objek: {bird_count}"

            # label = f"Bird {conf:.2f}"
            cv2.putText(
                frame,
                label,
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 255),
                2
            )

        # === STREAM FRAME ===
        ret, buffer = cv2.imencode('.jpg', frame)
        if ret:
            socketio.emit('video_frame', base64.b64encode(buffer).decode())

        # === LOGIC EVENT ===
        if bird_count > 0:
            last_detected_time = now

            if group_start_time is None:
                group_start_time = now
                last_bird_count = bird_count
                pending_save_time = None

            elif bird_count > last_bird_count:
                last_bird_count = bird_count
                pending_save_time = None

            elif bird_count < last_bird_count:
                if pending_save_time is None:
                    pending_save_time = now
                    pending_save_count = last_bird_count

                elif (now - pending_save_time).total_seconds() >= REDUCTION_CONFIRM_SECONDS:
                    duration = (pending_save_time - group_start_time).total_seconds()

                    if duration >= MIN_DETECTION_SECONDS:
                        save_detection_to_db(
                            pending_save_count,
                            duration,
                            pending_save_time
                        )

                    group_start_time = now
                    last_bird_count = bird_count
                    pending_save_time = None
            else:
                pending_save_time = None

        else:
            if last_detected_time and (now - last_detected_time).total_seconds() >= REDUCTION_CONFIRM_SECONDS:
                if group_start_time and last_bird_count > 0:
                    duration = (last_detected_time - group_start_time).total_seconds()
                    if duration >= MIN_DETECTION_SECONDS:
                        save_detection_to_db(
                            last_bird_count,
                            duration,
                            last_detected_time
                        )

                group_start_time = None
                last_bird_count = 0
                last_detected_time = None
                pending_save_time = None

        socketio.emit("deteksi", {
            "jumlah": bird_count,
            "waktu": now.strftime("%H:%M:%S")
        })

        socketio.sleep(0.01)

@socketio.on('connect')
def connect():
    print("✅ Client connected to Flask detection server")

@socketio.on('disconnect')
def disconnect():
    print("❌ Client disconnected from Flask detection server")

if __name__ == "__main__":
    # Initialize database
    init_database()

    # Ganti cara memulai thread dengan metode dari Socket.IO
    socketio.start_background_task(target=detect_and_stream)

    print("🚀 Starting Flask detection server on port 5000...")
    socketio.run(app, host="0.0.0.0", port=5000)