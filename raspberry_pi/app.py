#!/usr/bin/env python3
"""
Campus Connect - Mobile Web Application Server (Flask)
Hosts the mobile-friendly web interface on port 5000.
Connect from your phone browser at: http://<RaspberryPi_IP>:5000
"""

import os
import sys
import time
import glob
import json
import threading
from flask import Flask, render_template, request, jsonify
import serial

from campus_navigator import CampusNavigator

app = Flask(__name__)

# Global state
arduino_serial = None
current_telemetry = {
    "yaw": 0.0,
    "speed": 200,
    "state": "STOPPED",
    "nav_status": "IDLE"
}
nav_engine = None
is_navigating = False
nav_thread = None

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
            # Start telemetry reader thread
            t = threading.Thread(target=serial_reader_loop, daemon=True)
            t.start()
        except Exception as e:
            print(f"[WARN] Could not open serial: {e}")
    else:
        print("[WARN] Arduino not connected. Web interface running in simulation mode.")

def send_command(cmd_char):
    global arduino_serial
    if arduino_serial and arduino_serial.is_open:
        try:
            arduino_serial.write(cmd_char.encode('utf-8'))
            arduino_serial.flush()
        except Exception as e:
            print(f"[ERROR] Serial write error: {e}")

def serial_reader_loop():
    global arduino_serial, current_telemetry
    while True:
        if arduino_serial and arduino_serial.is_open:
            try:
                if arduino_serial.in_waiting > 0:
                    line = arduino_serial.readline().decode('utf-8', errors='ignore').strip()
                    if line.startswith("YAW:"):
                        # Parse format: YAW:+45.2|SPEED:200|STATE:STOPPED
                        parts = line.split('|')
                        for p in parts:
                            if p.startswith("YAW:"):
                                current_telemetry["yaw"] = float(p.replace("YAW:", ""))
                            elif p.startswith("SPEED:"):
                                current_telemetry["speed"] = int(p.replace("SPEED:", ""))
                            elif p.startswith("STATE:"):
                                current_telemetry["state"] = p.replace("STATE:", "")
            except Exception:
                pass
        time.sleep(0.05)

# Autonomous Navigation Runner
def run_autonomous_route(steps):
    global is_navigating, current_telemetry
    is_navigating = True
    current_telemetry["nav_status"] = "NAVIGATING"

    for idx, step in enumerate(steps):
        if not is_navigating:
            break

        current_telemetry["nav_status"] = f"Step {idx+1}/{len(steps)}: {step['turn_action']} -> {step['to_name']}"
        print(f"[NAV] {current_telemetry['nav_status']}")

        # 1. Execute Turn if needed
        turn_cmd = step.get('turn_cmd')
        if turn_cmd:
            send_command(turn_cmd)
            time.sleep(1.8) # Wait for auto-turn completion

        # 2. Drive Forward
        send_command('W')
        drive_time = step.get('drive_duration', 3.5)
        
        # Check for interrupt during driving
        start_t = time.time()
        while time.time() - start_t < drive_time:
            if not is_navigating:
                break
            time.sleep(0.1)

        # 3. Stop at node
        send_command('X')
        time.sleep(0.8)

    send_command('X')
    is_navigating = False
    current_telemetry["nav_status"] = "ARRIVED AT DESTINATION" if is_navigating is False else "IDLE"
    print("[NAV] Autonomous Navigation Completed.")

@app.route('/')
def index():
    nodes = list(nav_engine.nodes.values()) if nav_engine else []
    return render_template('index.html', nodes=nodes, campus_name=nav_engine.campus_name if nav_engine else "CampusConnect")

@app.route('/api/telemetry')
def api_telemetry():
    return jsonify(current_telemetry)

@app.route('/api/plan_route', methods=['POST'])
def api_plan_route():
    data = request.json or {}
    start_id = data.get('start')
    end_id = data.get('destination')

    path, distance = nav_engine.dijkstra(start_id, end_id)
    if not path:
        return jsonify({"success": False, "message": "No path found between locations"}), 404

    steps = nav_engine.generate_turn_by_turn(path, initial_heading=0)
    return jsonify({
        "success": True,
        "path": path,
        "path_names": [nav_engine.nodes[p]['name'] for p in path],
        "total_distance": distance,
        "steps": steps
    })

@app.route('/api/start_nav', methods=['POST'])
def api_start_nav():
    global nav_thread, is_navigating
    data = request.json or {}
    steps = data.get('steps', [])

    if not steps:
        return jsonify({"success": False, "message": "No steps provided"}), 400

    if is_navigating:
        return jsonify({"success": False, "message": "Already navigating"}), 400

    nav_thread = threading.Thread(target=run_autonomous_route, args=(steps,), daemon=True)
    nav_thread.start()
    return jsonify({"success": True, "message": "Navigation started"})

@app.route('/api/stop_nav', methods=['POST'])
def api_stop_nav():
    global is_navigating
    is_navigating = False
    send_command('X')
    current_telemetry["nav_status"] = "STOPPED"
    return jsonify({"success": True, "message": "Navigation halted"})

@app.route('/api/manual_control', methods=['POST'])
def api_manual_control():
    global is_navigating
    is_navigating = False # Manual override
    data = request.json or {}
    cmd = data.get('cmd')
    if cmd:
        send_command(cmd)
        return jsonify({"success": True, "cmd": cmd})
    return jsonify({"success": False, "message": "No command"}), 400

if __name__ == '__main__':
    routes_path = os.path.join(os.path.dirname(__file__), 'routes.json')
    nav_engine = CampusNavigator(routes_path)
    init_serial()
    print("\n" + "=" * 60)
    print(" 📱 CAMPUS CONNECT MOBILE WEB SERVER RUNNING")
    print(" Open from your Phone or PC at: http://<RaspberryPi_IP>:5000")
    print("=" * 60 + "\n")
    app.run(host='0.0.0.0', port=5000, debug=False)
