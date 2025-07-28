# app.py - Diperbaiki untuk Streaming Video
from flask import Flask
from flask_socketio import SocketIO
import cv2
import datetime
import threading
import os
import time
import base64 # <-- Tambahkan ini

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

cascade_path = os.path.join(os.path.dirname(__file__), 'face_ref.xml')
face_cascade = cv2.CascadeClassifier(cascade_path)
camera = cv2.VideoCapture(0)

last_logged_time = 0

def detect_and_stream():
    global last_logged_time
    while True:
        ret, frame = camera.read()
        if not ret:
            continue

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5)

        # --- Bbounding box ---
        for (x, y, w, h) in faces:
            cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
        
        # --- Encode frame ke JPG dan Base64 ---
        ret, buffer = cv2.imencode('.jpg', frame)
        if not ret:
            continue
        
        # Ubah buffer menjadi string base64 untuk dikirim
        frame_as_text = base64.b64encode(buffer).decode('utf-8')
        
        # Kirim frame video ke server.js
        socketio.emit('video_frame', frame_as_text)
        # ---------------------------------------------------

        # Kirim data deteksi (jumlah dan waktu) seperti sebelumnya
        jumlah_wajah = len(faces)
        now_str = datetime.datetime.now().strftime("%H:%M:%S")
        realtime_data = {"jumlah": jumlah_wajah, "waktu": now_str}
        socketio.emit("deteksi", realtime_data)

        # Kirim log capture per menit jika ada objek
        now_epoch = time.time()
        if jumlah_wajah > 0 and now_epoch - last_logged_time >= 60:
            socketio.emit("log", realtime_data)
            last_logged_time = now_epoch

        socketio.sleep(0.05) # Kurangi jeda agar streaming lebih lancar (sekitar 20 FPS)

@socketio.on('connect')
def connect():
    print("Client Flask terhubung.")

if __name__ == "__main__":
    # Ganti target thread ke fungsi baru
    threading.Thread(target=detect_and_stream).start() 
    socketio.run(app, host="0.0.0.0", port=5000)