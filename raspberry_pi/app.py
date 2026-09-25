#!/usr/bin/env python3
"""
Campus Connect - Autonomous IMU Robot Navigation Server (Flask)
Equipped with Picamera2 / rpicam Native Video Streaming and USB Mic Speech Recognition.
"""

import os
import sys
import time
import glob
import re
import threading
import subprocess
import io
from flask import Flask, render_template, request, jsonify, Response
import serial

from campus_navigator import CampusNavigator

app = Flask(__name__)

# State
current_location = "S"
robot_status = "System Ready (Idle)"
current_yaw = 0.0
current_distance = 999.0
obstacle_detected = False
is_navigating = False
arduino_serial = None
nav_engine = None

last_voice_alert_time = 0

# --- NATIVE RASPBERRY PI CAMERA STREAMER (Picamera2 / rpicam fallback) ---
picam2_obj = None

def init_picamera():
    global picam2_obj
    try:
        from picamera2 import Picamera2
        picam2_obj = Picamera2()
        config = picam2_obj.create_preview_configuration(main={"size": (640, 480), "format": "RGB888"})
        picam2_obj.configure(config)
        picam2_obj.start()
        print("[CAMERA] Picamera2 initialized successfully!")
    except Exception as e:
        print(f"[CAMERA] Picamera2 init note: {e}")
        picam2_obj = None

def generate_video_frames():
    global picam2_obj
    import cv2
    
    # Try Picamera2 first (Official Bookworm library)
    if picam2_obj:
        while True:
            try:
                frame = picam2_obj.capture_array()
                # Frame is RGB, convert to BGR for OpenCV encode
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                ret, buffer = cv2.imencode('.jpg', frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 65])
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.04) # ~25 FPS
            except Exception:
                time.sleep(0.1)
    else:
        # Fallback to rpicam-vid MJPEG pipe
        cmd = ["rpicam-vid", "-t", "0", "--inline", "--width", "640", "--height", "480", "--codec", "mjpeg", "--framerate", "20", "-o", "-"]
        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=10**6)
            stream_bytes = b''
            while True:
                stream_bytes += p.stdout.read(1024)
                a = stream_bytes.find(b'\xff\xd8') # JPEG Start
                b = stream_bytes.find(b'\xff\xd9') # JPEG End
                if a != -1 and b != -1:
                    jpg = stream_bytes[a:b+2]
                    stream_bytes = stream_bytes[b+2:]
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + jpg + b'\r\n')
        except Exception as err:
            print(f"[CAMERA STREAM ERROR] {err}")

# --- HARDWARE CONNECTIVITY ---
def find_arduino():
    ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')
    return ports[0] if ports else None

def speak_alert(text):
    global last_voice_alert_time
    now = time.time()
    if now - last_voice_alert_time < 3.5:
        return
    last_voice_alert_time = now
    print(f"[AUDIO ALERT] 🔊 {text}")
    try:
        subprocess.Popen(["espeak", "-v", "en-us", "-s", "145", text],
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

def init_serial():
    global arduino_serial
    port = find_arduino()
    if port:
        try:
            arduino_serial = serial.Serial(port, 115200, timeout=0.1)
            time.sleep(2)
            arduino_serial.reset_input_buffer()
            print(f"[INFO] Connected to Arduino on {port}")
            threading.Thread(target=serial_telemetry_loop, daemon=True).start()
        except Exception as e:
            print(f"[WARN] Serial connect failed: {e}")
    else:
        print("[WARN] Arduino not detected. Running in simulated mode.")

def serial_telemetry_loop():
    global arduino_serial, current_yaw, current_distance, obstacle_detected, robot_status
    while True:
        if arduino_serial and arduino_serial.is_open:
            try:
                if arduino_serial.in_waiting > 0:
                    line = arduino_serial.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith("YAW:"):
                        parts = line.split('|')
                        for p in parts:
                            if p.startswith("YAW:"):
                                current_yaw = float(p.replace("YAW:", ""))
                            elif p.startswith("DIST:"):
                                current_distance = float(p.replace("DIST:", ""))
                            elif p.startswith("OBST:"):
                                is_obst = (p.replace("OBST:", "") == "1")
                                if is_obst and not obstacle_detected:
                                    speak_alert("Warning! Object detected ahead. Stopping robot.")
                                    robot_status = "⚠️ Obstacle Detected Ahead! Robot Stopped."
                                obstacle_detected = is_obst
            except Exception:
                pass
        time.sleep(0.04)

def send_cmd(cmd_str):
    global arduino_serial
    if arduino_serial and arduino_serial.is_open:
        try:
            arduino_serial.write(cmd_str.encode('utf-8'))
            arduino_serial.flush()
        except Exception as e:
            print(f"[ERROR] Serial write error: {e}")

# Autonomous Navigation Worker
def execute_navigation(destination):
    global current_location, robot_status, is_navigating, obstacle_detected

    if current_location == destination:
        robot_status = f"Already at Point {destination}"
        is_navigating = False
        return

    path, dist = nav_engine.dijkstra(current_location, destination)
    if not path or len(path) < 2:
        robot_status = f"No path found to {destination}"
        is_navigating = False
        return

    robot_status = f"Navigating: {' ➔ '.join(path)}"
    print(f"\n[NAV] Starting Navigation: {' -> '.join(path)}")

    motion_steps = nav_engine.get_motion_commands_for_path(path)

    for idx, step in enumerate(motion_steps):
        if not is_navigating:
            break

        step_type = step['type']
        action_name = step['action']
        cmd = step['arduino_cmd']
        leg = step['leg']

        robot_status = f"[{leg}] {action_name}"
        print(f"[NAV Step {idx+1}/{len(motion_steps)}] {action_name} -> Send '{cmd}'")

        if step_type == 'TURN':
            if cmd:
                send_cmd(cmd)
                time.sleep(2.2)
        elif step_type == 'DRIVE':
            if cmd == 'W' and obstacle_detected:
                speak_alert("Path blocked. Waiting for obstacle to clear.")
                robot_status = "⚠️ Path Blocked! Waiting for obstacle to clear..."
                while obstacle_detected and is_navigating:
                    send_cmd('X')
                    time.sleep(0.5)

            send_cmd(cmd)
            duration = step.get('duration', 2.5)
            
            start_t = time.time()
            while time.time() - start_t < duration:
                if not is_navigating:
                    break
                if cmd == 'W' and obstacle_detected:
                    send_cmd('X')
                    robot_status = "⚠️ Obstacle in front! Paused."
                    time.sleep(0.5)
                    continue
                time.sleep(0.1)

            send_cmd('X')
            time.sleep(0.6)

    send_cmd('X')
    current_location = destination
    robot_status = f"Arrived at Point {destination} (Idle)"
    is_navigating = False
    speak_alert(f"Arrived at destination Point {destination}.")
    print(f"[NAV] Navigation Complete! Current Node: {current_location}\n")

# --- API Endpoints ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_video_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/navigate', methods=['POST'])
def handle_navigate():
    global is_navigating, robot_status
    data = request.json or {}
    dest = (data.get('destination') or '').upper()

    if dest not in nav_engine.graph:
        return jsonify({"success": False, "message": f"Invalid destination '{dest}'"}), 400

    if is_navigating:
        return jsonify({"success": False, "message": "Robot is already navigating!"}), 400

    is_navigating = True
    threading.Thread(target=execute_navigation, args=(dest,), daemon=True).start()
    return jsonify({"success": True, "message": f"Routing from {current_location} to {dest}..."})

@app.route('/current')
def handle_current():
    return jsonify({"location": current_location})

@app.route('/robot_status')
def handle_status():
    if obstacle_detected:
        return jsonify({"status": f"⚠️ Obstacle Detected at {current_distance:.1f}cm!"})
    return jsonify({"status": robot_status})

@app.route('/imu')
def handle_imu():
    return jsonify({"yaw": current_yaw})

# --- ROBOT USB MIC RECORD & SPEECH RECOGNITION (Bypasses Phone Browser Restrictions!) ---
@app.route('/listen_usb_mic', methods=['POST'])
def handle_listen_usb_mic():
    global is_navigating
    if is_navigating:
        return jsonify({"success": False, "message": "Robot is currently busy navigating."})

    # Record 3 seconds from USB Microphone Card 3
    audio_file = "robot_speech.wav"
    try:
        subprocess.run(["arecord", "-D", "plughw:3,0", "-d", "3", "-f", "cd", audio_file],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5)
    except Exception as e:
        return jsonify({"success": False, "message": f"Mic recording error: {e}"})

    # Recognize speech using SpeechRecognition library or Google API if internet available
    recognized_text = ""
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        with sr.AudioFile(audio_file) as source:
            audio_data = r.record(source)
            recognized_text = r.recognize_google(audio_data)
    except Exception:
        pass

    if not recognized_text:
        # Fallback quick simulation prompt if offline
        return jsonify({"success": False, "message": "Audio recorded. No internet speech recognition or speak clearer."})

    print(f"[USB MIC SPEECH] Recognized: '{recognized_text}'")
    transcript = recognized_text.upper()

    # Route extraction
    target = None
    if "BASE" in transcript or "HOME" in transcript or "STATION" in transcript or " POINT S" in transcript or " TO S" in transcript:
        target = "S"
    elif "POINT A" in transcript or " TO A" in transcript or transcript.endswith(" A"):
        target = "A"
    elif "POINT B" in transcript or " TO B" in transcript or transcript.endswith(" B"):
        target = "B"
    elif "POINT C" in transcript or " TO C" in transcript or transcript.endswith(" C"):
        target = "C"
    elif "POINT D" in transcript or " TO D" in transcript or transcript.endswith(" D"):
        target = "D"
    else:
        match = re.search(r'\b([A-D]|S)\b', transcript)
        if match:
            target = match.group(1)

    if target:
        is_navigating = True
        threading.Thread(target=execute_navigation, args=(target,), daemon=True).start()
        return jsonify({"success": True, "text": recognized_text, "message": f"Heard '{recognized_text}' ➔ Navigating to {target}"})

    return jsonify({"success": False, "text": recognized_text, "message": f"Could not find destination in '{recognized_text}'"})

@app.route('/voice', methods=['POST'])
def handle_voice():
    global is_navigating
    data = request.json or {}
    transcript = (data.get('text') or '').upper()
    print(f"[VOICE] Heard: {transcript}")

    target = None
    if "BASE" in transcript or "HOME" in transcript or "STATION" in transcript or " POINT S" in transcript or " TO S" in transcript:
        target = "S"
    elif "POINT A" in transcript or " TO A" in transcript or transcript.endswith(" A"):
        target = "A"
    elif "POINT B" in transcript or " TO B" in transcript or transcript.endswith(" B"):
        target = "B"
    elif "POINT C" in transcript or " TO C" in transcript or transcript.endswith(" C"):
        target = "C"
    elif "POINT D" in transcript or " TO D" in transcript or transcript.endswith(" D"):
        target = "D"
    else:
        match = re.search(r'\b([A-D]|S)\b', transcript)
        if match:
            target = match.group(1)

    if target:
        if is_navigating:
            return jsonify({"success": False, "message": "Robot currently busy navigating."})
        is_navigating = True
        threading.Thread(target=execute_navigation, args=(target,), daemon=True).start()
        return jsonify({"success": True, "message": f"Voice recognized: Navigating to Point {target}"})

    return jsonify({"success": False, "message": f"Could not extract destination from '{transcript}'"})

if __name__ == '__main__':
    routes_file = os.path.join(os.path.dirname(__file__), 'routes.json')
    nav_engine = CampusNavigator(routes_file)
    init_serial()
    init_picamera()
    print("\n" + "=" * 60)
    print(" 🤖 CAMPUS CONNECT ROBOT SERVER ACTIVE")
    print(" Open in Browser: http://<RaspberryPi_IP>:5000")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
