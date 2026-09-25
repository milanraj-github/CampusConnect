#!/usr/bin/env python3
"""
Campus Connect - Autonomous IMU Robot Navigation Server (Flask)
Supports SVG Diamond Map, Voice Commands, Dijkstra Pathfinding, and Live Telemetry.
"""

import os
import sys
import time
import glob
import re
import threading
from flask import Flask, render_template, request, jsonify
import serial

from campus_navigator import CampusNavigator

app = Flask(__name__)

# State
current_location = "S"
robot_status = "System Ready (Idle)"
current_yaw = 0.0
is_navigating = False
arduino_serial = None
nav_engine = None

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
    global arduino_serial, current_yaw
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
            except Exception:
                pass
        time.sleep(0.05)

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
    global current_location, robot_status, is_navigating

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
    print(f"[NAV] Path: {' -> '.join(path)} ({dist}m)")

    steps = nav_engine.generate_turn_by_turn(path, initial_heading=0)

    for step in steps:
        if not is_navigating:
            break

        to_node = step['to_node']
        turn_cmd = step.get('turn_cmd')
        turn_action = step.get('turn_action', 'STRAIGHT')

        # 1. Turn
        if turn_cmd:
            robot_status = f"{turn_action}..."
            send_cmd(turn_cmd)
            time.sleep(1.8)

        # 2. Drive Forward
        robot_status = f"Moving to Node {to_node}..."
        send_cmd('W')
        drive_time = step.get('drive_duration', 3.0)
        
        start_t = time.time()
        while time.time() - start_t < drive_time:
            if not is_navigating:
                break
            time.sleep(0.1)

        # 3. Arrive & Stop at node
        send_cmd('X')
        current_location = to_node
        time.sleep(0.8)

    send_cmd('X')
    robot_status = f"Arrived at Point {destination} (Idle)"
    is_navigating = False
    print(f"[NAV] Navigation finished at {current_location}")

# --- API Endpoints ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/navigate', methods=['POST'])
def handle_navigate():
    global is_navigating, robot_status
    data = request.json or {}
    dest = (data.get('destination') or '').upper()

    if dest not in nav_engine.nodes:
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
    return jsonify({"status": robot_status})

@app.route('/imu')
def handle_imu():
    return jsonify({"yaw": current_yaw})

@app.route('/voice', methods=['POST'])
def handle_voice():
    global is_navigating
    data = request.json or {}
    transcript = (data.get('text') or '').upper()
    print(f"[VOICE] Heard: {transcript}")

    # Detect destination letter A, B, C, D, S or Base/Home
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
        # Check regex single letter
        match = re.search(r'\b([A-D]|S)\b', transcript)
        if match:
            target = match.group(1)

    if target:
        if is_navigating:
            return jsonify({"success": False, "message": "Robot currently busy navigating."})
        is_navigating = True
        threading.Thread(target=execute_navigation, args=(target,), daemon=True).start()
        return jsonify({"success": True, "message": f"Voice command recognized: Navigating to Point {target}"})

    return jsonify({"success": False, "message": f"Could not extract destination from '{transcript}'"})

if __name__ == '__main__':
    routes_file = os.path.join(os.path.dirname(__file__), 'routes.json')
    nav_engine = CampusNavigator(routes_file)
    init_serial()
    print("\n" + "=" * 60)
    print(" 🤖 CAMPUS CONNECT AUTONOMOUS ROBOT SERVER ACTIVE")
    print(" Open in Browser: http://<RaspberryPi_IP>:5000")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
