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
from mysql.connector import Error

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'database': 'monitoring',
    'user': 'root',  # Sesuaikan dengan username database Anda
    'password': ''   # Sesuaikan dengan password database Anda
}

# Initialize detection components
cascade_path = os.path.join(os.path.dirname(__file__), 'face_ref.xml')
face_cascade = cv2.CascadeClassifier(cascade_path)
camera = cv2.VideoCapture(0)

last_logged_time = 0

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
            birds INT NOT NULL,
            time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
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

def save_detection_to_db(bird_count):
    """Save detection result to database"""
    try:
        connection = mysql.connector.connect(**DB_CONFIG)
        cursor = connection.cursor()
        
        insert_query = """
        INSERT INTO log_detection (birds, time) 
        VALUES (%s, %s)
        """
        current_time = datetime.datetime.now()
        cursor.execute(insert_query, (bird_count, current_time))
        connection.commit()
        
        print(f"✅ Detection saved to database: {bird_count} objects at {current_time}")
        return True
        
    except Error as e:
        print(f"❌ Error saving to database: {e}")
        return False
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def detect_and_stream():
    """Main detection and streaming function"""
    global last_logged_time
    
    while True:
        ret, frame = camera.read()
        if not ret:
            continue

        # Convert to grayscale for detection
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)

        # Draw bounding boxes
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        # Encode frame to base64 for streaming
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        
        frame_as_text = base64.b64encode(buffer).decode('utf-8')
        
        # Send video frame to server
        socketio.emit('video_frame', frame_as_text)

        # Process detection results
        bird_count = len(faces)  # Using faces as bird detection for demo
        now_str = datetime.datetime.now().strftime("%H:%M:%S")
        realtime_data = {"jumlah": bird_count, "waktu": now_str}
        
        # Send real-time detection data
        # Kirim data deteksi real-time
        socketio.emit("deteksi", realtime_data)

        # Simpan ke database jika ada objek terdeteksi (setiap 60 detik)
        now_epoch = time.time()
        if bird_count > 0 and now_epoch - last_logged_time >= 60:
            if save_detection_to_db(bird_count):
                socketio.emit("log", realtime_data)
                last_logged_time = now_epoch

        # Sesuaikan nilai ini untuk FPS yang berbeda. 0.033 untuk ~30 FPS
        socketio.sleep(1) 

@socketio.on('connect')
def connect():
    print("✅ Client connected to Flask detection server")

@socketio.on('disconnect')
def disconnect():
    print("❌ Client disconnected from Flask detection server")

if __name__ == "__main__":
    # Initialize database
    init_database()
    
    # Start detection thread
    detection_thread = threading.Thread(target=detect_and_stream)
    detection_thread.daemon = True
    detection_thread.start()
    
    print("🚀 Starting Flask detection server on port 5000...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)