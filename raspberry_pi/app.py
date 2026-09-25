#!/usr/bin/env python3
"""
Campus Connect - Autonomous IMU Robot Navigation Server (Flask)
Features:
- Bulletproof Live MJPEG Camera Video Streaming with Auto-Cleanup
- Integrated Destination QR Code Scanner & Verification ("Destination verified successfully!")
- 15.0cm Ultrasonic Safety Zone & Dynamic Dijkstra Obstacle Rerouting
- Crystal-Clear Multi-Engine Speaker Voice Output (Bluetooth / Audio)
- USB Microphone Speech Recognition
- Real-Time Manual Touch D-Pad & Keyboard Teleop Control
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

# OpenCV for live camera QR Code detection
try:
    import cv2
    import numpy as np
    qr_detector = cv2.QRCodeDetector()
    HAS_QR_DETECTOR = True
    print("[INFO] OpenCV QR Code Detector initialized successfully.")
except Exception as e:
    HAS_QR_DETECTOR = False
    print(f"[WARN] OpenCV QR Detector not available: {e}")

app = Flask(__name__)

# System State
current_location = "S"
robot_status = "System Ready (Idle)"
current_yaw = 0.0
current_distance = 999.0
obstacle_detected = False
is_navigating = False
arduino_serial = None
nav_engine = None

# QR Code State
target_qr_destination = None
qr_verified = False
last_scanned_qr = ""
last_scanned_time = 0

last_voice_alert_time = 0

# --- HIGH-QUALITY SPEAKER VOICE OUTPUT ---
def speak_alert(text):
    """Speaks clear audio through speaker using pico2wave / aplay / espeak pipeline."""
    global last_voice_alert_time
    now = time.time()
    if now - last_voice_alert_time < 1.5:
        return
    last_voice_alert_time = now
    print(f"[SPEAKER ANNOUNCEMENT] 🔊 {text}")

    safe_text = re.sub(r'[^a-zA-Z0-9 .,!?]', '', text)

    def _play_speech():
        # Pipeline 1: pico2wave + aplay (Natural clear voice routed to active Bluetooth / audio sink)
        try:
            wav_path = "/tmp/speech_alert.wav"
            cmd_pico = f'pico2wave -w {wav_path} "{safe_text}" && aplay -q {wav_path}'
            ret = os.system(cmd_pico)
            if ret == 0:
                return
        except Exception:
            pass

        # Pipeline 2: espeak piped to aplay (Routes through ALSA / Bluetooth system default)
        try:
            cmd_pipe = f'espeak -v en-us -s 135 -a 200 "{safe_text}" --stdout | aplay -q'
            ret = os.system(cmd_pipe)
            if ret == 0:
                return
        except Exception:
            pass

        # Pipeline 3: Direct espeak
        try:
            os.system(f'espeak -v en-us -s 135 -a 200 "{safe_text}" >/dev/null 2>&1')
        except Exception:
            pass

    threading.Thread(target=_play_speech, daemon=True).start()

# --- LIVE CAMERA FRAME QR PROCESSING ---
def process_frame_for_qr(jpg_frame):
    """Detects QR codes in video stream, draws bounding box, and verifies destination."""
    global target_qr_destination, qr_verified, last_scanned_qr, last_scanned_time, robot_status

    if not HAS_QR_DETECTOR:
        return jpg_frame

    try:
        np_arr = np.frombuffer(jpg_frame, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return jpg_frame

        data, bbox, _ = qr_detector.detectAndDecode(img)
        if data:
            data_clean = data.strip().upper()
            now = time.time()

            if (data_clean != last_scanned_qr) or (now - last_scanned_time > 3.0):
                last_scanned_qr = data_clean
                last_scanned_time = now
                print(f"[QR SCANNER] 📷 Detected QR Code: '{data_clean}'")

                # Match destination if actively verifying
                if target_qr_destination:
                    target = target_qr_destination.upper()
                    match = False
                    if target == "S" and any(k in data_clean for k in ["S", "BASE", "HOME", "NODE_S"]):
                        match = True
                    elif target in data_clean or f"NODE_{target}" in data_clean or f"POINT_{target}" in data_clean:
                        match = True

                    if match and not qr_verified:
                        qr_verified = True
                        dest_name = "Base Station" if target == "S" else f"Point {target}"
                        print(f"[QR SUCCESS] ✅ {dest_name} matched QR: '{data_clean}'!")
                        speak_alert("Destination verified successfully!")
                        robot_status = f"✅ {dest_name} Verified Successfully (QR: {data_clean})"

            # Draw visual highlight on live camera stream
            if bbox is not None and len(bbox) > 0:
                pts = bbox[0].astype(int)
                n = len(pts)
                for i in range(n):
                    cv2.line(img, tuple(pts[i]), tuple(pts[(i + 1) % n]), (0, 255, 0), 3)
                cv2.putText(img, f"QR: {data_clean}", (int(pts[0][0]), int(pts[0][1]) - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                _, enc = cv2.imencode('.jpg', img, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                return enc.tobytes()

    except Exception:
        pass

    return jpg_frame

# --- ROCK-SOLID LIVE CAMERA STREAM GENERATOR ---
def generate_video_frames():
    """Streams live MJPEG camera video with QR detection and auto process cleanup."""
    # Kill any dangling camera processes first
    os.system("pkill -9 -f rpicam-vid >/dev/null 2>&1")
    os.system("pkill -9 -f libcamera-vid >/dev/null 2>&1")
    time.sleep(0.15)

    cam_cmd = "rpicam-vid"
    if subprocess.call(["which", "rpicam-vid"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) != 0:
        if subprocess.call(["which", "libcamera-vid"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0:
            cam_cmd = "libcamera-vid"

    cmd = [
        cam_cmd,
        "-t", "0",
        "--inline",
        "--width", "640",
        "--height", "480",
        "--codec", "mjpeg",
        "--framerate", "25",
        "--nopreview",
        "-o", "-"
    ]

    process = None
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=65536)
        buffer = b''
        frame_counter = 0
        while True:
            chunk = process.stdout.read(4096)
            if not chunk:
                break
            buffer += chunk
            a = buffer.find(b'\xff\xd8') # JPEG Start
            if a != -1:
                b = buffer.find(b'\xff\xd9', a + 2) # JPEG End
                if b != -1:
                    jpg_frame = buffer[a:b+2]
                    buffer = buffer[b+2:]
                    frame_counter += 1

                    # Run QR detection
                    if HAS_QR_DETECTOR and (target_qr_destination or frame_counter % 2 == 0):
                        jpg_frame = process_frame_for_qr(jpg_frame)

                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + jpg_frame + b'\r\n')
            if len(buffer) > 250000:
                buffer = b''
    except GeneratorExit:
        pass
    except Exception as err:
        print(f"[CAMERA STREAM NOTICE] {err}")
    finally:
        if process:
            try:
                process.terminate()
                process.wait(timeout=0.4)
            except Exception:
                try:
                    process.kill()
                except Exception:
                    pass

def find_arduino():
    ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')
    return ports[0] if ports else None

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
                        # Format: YAW:+0.0|DIST:14.2|OBST:1|STATE:FORWARD
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
        time.sleep(0.03)

def send_cmd(cmd_str):
    global arduino_serial
    if arduino_serial and arduino_serial.is_open:
        try:
            arduino_serial.write(cmd_str.encode('utf-8'))
            arduino_serial.flush()
        except Exception as e:
            print(f"[ERROR] Serial write error: {e}")

# Autonomous Navigation Worker with 15cm Obstacle Avoidance & QR Destination Verification
def execute_navigation(destination):
    global current_location, robot_status, is_navigating, obstacle_detected, target_qr_destination, qr_verified

    dest_name = "Base Station" if destination == "S" else f"Point {destination}"
    speak_alert(f"Starting navigation to {dest_name}.")

    if current_location == destination:
        robot_status = f"Already at {dest_name}"
        speak_alert(f"Already at {dest_name}.")
        is_navigating = False
        return

    blocked_edges = set()

    while is_navigating and current_location != destination:
        path, dist = nav_engine.dijkstra(current_location, destination, blocked_edges)
        if not path or len(path) < 2:
            robot_status = f"Path to {dest_name} is blocked"
            speak_alert(f"All paths are blocked. Cannot reach {dest_name}.")
            is_navigating = False
            return

        robot_status = f"Navigating: {' ➔ '.join(path)}"
        print(f"\n[NAV] Following Shortest Path: {' -> '.join(path)}")

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
                # Check for obstacle within 15cm before driving forward
                if cmd == 'W' and obstacle_detected:
                    send_cmd('X')
                    speak_alert("Obstacle detected! Rerouting.")
                    robot_status = f"⚠️ Obstacle on {leg}! Rerouting..."
                    blocked_edges.add((u, v))
                    blocked_edges.add((v, u))
                    path_interrupted = True
                    time.sleep(1.2)
                    break

                send_cmd(cmd)
                duration = step.get('duration', 2.5)
                
                start_t = time.time()
                while time.time() - start_t < duration:
                    if not is_navigating:
                        break
                    
                    if cmd == 'W' and obstacle_detected:
                        send_cmd('X')
                        speak_alert("Obstacle detected! Rerouting.")
                        robot_status = f"⚠️ Obstacle on {leg}! Rerouting..."
                        blocked_edges.add((u, v))
                        blocked_edges.add((v, u))
                        path_interrupted = True
                        time.sleep(1.2)
                        break
                    
                    time.sleep(0.04)

                if path_interrupted:
                    break

                send_cmd('X')
                current_location = v
                time.sleep(0.6)

        if not path_interrupted and current_location == destination:
            break

    send_cmd('X')

    if current_location == destination:
        dest_name = "Base Station" if destination == "S" else f"Point {destination}"
        robot_status = f"Arrived at {dest_name}. Scanning QR Code..."
        speak_alert(f"Arrived at {dest_name}. Scanning QR code.")

        # Active QR Code Scan Window (up to 8 seconds)
        target_qr_destination = destination
        qr_verified = False
        scan_start = time.time()

        while time.time() - scan_start < 8.0:
            if qr_verified:
                break
            time.sleep(0.1)

        if qr_verified:
            robot_status = f"✅ {dest_name} Verified Successfully (Idle)"
        else:
            robot_status = f"Arrived at {dest_name} (Idle)"
            speak_alert(f"Arrived at {dest_name}.")

        target_qr_destination = None

    is_navigating = False
    print(f"[NAV] Trip Complete! Current Location: {current_location}\n")

# --- API Endpoints ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/qrcodes')
def qrcodes():
    return render_template('qrcodes.html')

@app.route('/video_feed')
def video_feed():
    return Response(generate_video_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/test_speaker', methods=['POST'])
def handle_test_speaker():
    speak_alert("Bluetooth speaker test. Voice system is fully operational.")
    return jsonify({"success": True, "message": "Spoke test phrase through speaker."})

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
            '7': 'Turn 135° Left',
            '8': 'Turn 135° Right',
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
    return jsonify({"status": robot_status, "last_qr": last_scanned_qr, "qr_verified": qr_verified})

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
                rec_error = "Could not understand audio. Please speak clearly into the mic."
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

    return jsonify({"success": False, "text": recognized_text, "message": f"Heard '{recognized_text}'. Say e.g. 'Navigate to Point A', 'Point B', or 'Base Station'."})

if __name__ == '__main__':
    routes_file = os.path.join(os.path.dirname(__file__), 'routes.json')
    nav_engine = CampusNavigator(routes_file)
    init_serial()
    print("\n" + "=" * 60)
    print(" 🤖 CAMPUS CONNECT ROBOT SERVER ACTIVE")
    print(" Open in Browser: http://<RaspberryPi_IP>:5000")
    print(" Destination QR Codes: http://<RaspberryPi_IP>:5000/qrcodes")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
