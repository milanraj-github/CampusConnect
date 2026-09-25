#!/usr/bin/env python3
"""
Campus Connect - Autonomous IMU Robot Navigation Server (Flask)
With Ultrasonic Obstacle Voice Announcements ("Obstacle detected, rerouting") & Dynamic Dijkstra Rerouting.
"""

import os
import sys
import time
import glob
import re
import threading
import subprocess
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

# --- NATIVE RASPBERRY PI CAMERA STREAMER ---
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
    
    if picam2_obj:
        while True:
            try:
                frame = picam2_obj.capture_array()
                frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
                ret, buffer = cv2.imencode('.jpg', frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 65])
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
                time.sleep(0.04)
            except Exception:
                time.sleep(0.1)
    else:
        cmd = ["rpicam-vid", "-t", "0", "--inline", "--width", "640", "--height", "480", "--codec", "mjpeg", "--framerate", "20", "-o", "-"]
        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=10**6)
            stream_bytes = b''
            while True:
                stream_bytes += p.stdout.read(1024)
                a = stream_bytes.find(b'\xff\xd8')
                b = stream_bytes.find(b'\xff\xd9')
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
    if now - last_voice_alert_time < 2.5:
        return
    last_voice_alert_time = now
    print(f"[SPEAKER ALERT] 🔊 {text}")
    try:
        subprocess.Popen(["espeak", "-v", "en-us", "-s", "140", text],
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
                        # Format: YAW:+0.0|DIST:15.2|OBST:1|STATE:OBSTACLE_DETECTED
                        parts = line.split('|')
                        for p in parts:
                            if p.startswith("YAW:"):
                                current_yaw = float(p.replace("YAW:", ""))
                            elif p.startswith("DIST:"):
                                current_distance = float(p.replace("DIST:", ""))
                            elif p.startswith("OBST:"):
                                is_obst = (p.replace("OBST:", "") == "1")
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

# Autonomous Navigation with Obstacle Voice Alert & Rerouting
def execute_navigation(destination):
    global current_location, robot_status, is_navigating, obstacle_detected

    if current_location == destination:
        robot_status = f"Already at Point {destination}"
        is_navigating = False
        return

    blocked_edges = set()

    while is_navigating and current_location != destination:
        path, dist = nav_engine.dijkstra(current_location, destination, blocked_edges)
        if not path or len(path) < 2:
            robot_status = f"No alternative path to {destination}"
            speak_alert("No alternative route available. Please clear the obstacle.")
            is_navigating = False
            return

        robot_status = f"Navigating: {' ➔ '.join(path)}"
        print(f"\n[NAV] Following Path: {' -> '.join(path)}")

        motion_steps = nav_engine.get_motion_commands_for_path(path)
        path_interrupted = False

        for idx, step in enumerate(motion_steps):
            if not is_navigating:
                break

            step_type = step['type']
            action_name = step['action']
            cmd = step['arduino_cmd']
            leg = step['leg']
            u = step.get('from_node')
            v = step.get('to_node')

            robot_status = f"[{leg}] {action_name}"
            print(f"[NAV Step {idx+1}/{len(motion_steps)}] {action_name} -> Send '{cmd}'")

            if step_type == 'TURN':
                if cmd:
                    send_cmd(cmd)
                    time.sleep(2.2)
            elif step_type == 'DRIVE':
                # Check for obstacle before starting to drive forward
                if cmd == 'W' and obstacle_detected:
                    send_cmd('X')
                    speak_alert("Obstacle detected! Rerouting.")
                    robot_status = f"⚠️ Obstacle on {leg}! Rerouting..."
                    blocked_edges.add((u, v))
                    blocked_edges.add((v, u))
                    path_interrupted = True
                    time.sleep(1.0)
                    break

                send_cmd(cmd)
                duration = step.get('duration', 2.5)
                
                start_t = time.time()
                while time.time() - start_t < duration:
                    if not is_navigating:
                        break
                    
                    # If obstacle suddenly appears during forward drive
                    if cmd == 'W' and obstacle_detected:
                        send_cmd('X')
                        speak_alert("Obstacle detected! Rerouting.")
                        robot_status = f"⚠️ Obstacle on {leg}! Rerouting..."
                        blocked_edges.add((u, v))
                        blocked_edges.add((v, u))
                        path_interrupted = True
                        time.sleep(1.0)
                        break
                    
                    time.sleep(0.08)

                if path_interrupted:
                    break

                send_cmd('X')
                current_location = v
                time.sleep(0.6)

        if not path_interrupted and current_location == destination:
            break

    send_cmd('X')
    if current_location == destination:
        robot_status = f"Arrived at Point {destination} (Idle)"
        speak_alert(f"Arrived at destination Point {destination}.")
    is_navigating = False
    print(f"[NAV] Navigation Finished! Current Location: {current_location}\n")

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

@app.route('/manual_cmd', methods=['POST'])
@app.route('/api/manual_control', methods=['POST'])
def handle_manual_control():
    global is_navigating, robot_status
    is_navigating = False
    data = request.json or {}
    cmd = data.get('cmd')
    if cmd:
        send_cmd(cmd)
        cmd_labels = {
            'W': 'Moving Forward',
            'S': 'Moving Backward',
            'A': 'Turning Left',
            'D': 'Turning Right',
            'X': 'Motors Stopped',
            '1': 'Turn 90° Left',
            '2': 'Turn 90° Right',
            '3': 'Turn 180° Left',
            '4': 'Turn 180° Right',
            '5': 'Turn 45° Left',
            '6': 'Turn 45° Right',
            'Z': 'Heading Reset to 0°'
        }
        robot_status = cmd_labels.get(cmd, f"Command '{cmd}' Executed")
        return jsonify({"success": True, "cmd": cmd, "status": robot_status})
    return jsonify({"success": False, "message": "No command received"}), 400

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

@app.route('/listen_usb_mic', methods=['POST'])
def handle_listen_usb_mic():
    global is_navigating
    if is_navigating:
        return jsonify({"success": False, "message": "Robot is currently busy navigating."})

    audio_file = "robot_speech.wav"
    
    try:
        subprocess.run(["amixer", "-c", "3", "sset", "Mic", "100%", "cap"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        subprocess.run(["amixer", "-c", "3", "sset", "Capture", "100%", "cap"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass

    try:
        cmd = ["arecord", "-D", "plughw:3,0", "-d", "4", "-f", "S16_LE", "-r", "16000", "-c", "1", audio_file]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=6)
    except Exception as e:
        return jsonify({"success": False, "message": f"Mic recording error: {e}"})

    recognized_text = ""
    rec_error = ""
    try:
        import speech_recognition as sr
        r = sr.Recognizer()
        r.energy_threshold = 200
        r.dynamic_energy_threshold = True

        with sr.AudioFile(audio_file) as source:
            audio_data = r.record(source)
            try:
                recognized_text = r.recognize_google(audio_data)
            except sr.UnknownValueError:
                rec_error = "Could not understand audio. Please speak clearly."
            except sr.RequestError as req_err:
                rec_error = f"Speech API error: {req_err}"
    except Exception as e:
        rec_error = f"Speech error: {e}"

    if not recognized_text:
        print(f"[SPEECH FAIL] {rec_error}")
        return jsonify({"success": False, "message": rec_error or "No speech detected."})

    print(f"[USB MIC SPEECH] Recognized: '{recognized_text}'")
    transcript = recognized_text.upper().strip()

    target = None
    if any(k in transcript for k in ["BASE", "HOME", "STATION", "START", "CENTER", "POINT S", "TO S", "NODE S"]) or transcript == "S":
        target = "S"
    elif any(k in transcript for k in ["POINT A", "TO A", "NODE A", "PART A", "ALPHA", "FIRST", "LETTER A"]) or transcript.endswith(" A") or " A " in transcript or transcript == "A":
        target = "A"
    elif any(k in transcript for k in ["POINT B", "TO B", "NODE B", "PART B", "BRAVO", "BEE", "SECOND", "LETTER B"]) or transcript.endswith(" B") or " B " in transcript or transcript == "B":
        target = "B"
    elif any(k in transcript for k in ["POINT C", "TO C", "NODE C", "PART C", "CHARLIE", "SEE", "SEA", "THIRD", "LETTER C"]) or transcript.endswith(" C") or " C " in transcript or transcript == "C":
        target = "C"
    elif any(k in transcript for k in ["POINT D", "TO D", "NODE D", "PART D", "DELTA", "DEE", "FOURTH", "LETTER D"]) or transcript.endswith(" D") or " D " in transcript or transcript == "D":
        target = "D"
    else:
        match = re.search(r'\b([A-D]|S)\b', transcript)
        if match:
            target = match.group(1)

    if target:
        is_navigating = True
        threading.Thread(target=execute_navigation, args=(target,), daemon=True).start()
        return jsonify({"success": True, "text": recognized_text, "message": f"Heard '{recognized_text}' ➔ Navigating to Point {target}"})

    return jsonify({"success": False, "text": recognized_text, "message": f"Heard '{recognized_text}'. Say e.g. 'Navigate to A', 'Point B', or 'Base Station'."})

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
