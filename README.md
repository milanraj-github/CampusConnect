# 🤖 CampusConnect: Autonomous IMU Robot Navigation & Teleoperation System

[![Platform](https://img.shields.io/badge/Platform-Raspberry%20Pi%20%7C%20Arduino%20Uno-blue.svg)](https://www.raspberrypi.com/)
[![Framework](https://img.shields.io/badge/Backend-Flask%20%7C%20Python%203-green.svg)](https://flask.palletsprojects.com/)
[![Computer Vision](https://img.shields.io/badge/Vision-OpenCV%20QR%20%7C%20rpicam-red.svg)](https://opencv.org/)
[![Pathfinding](https://img.shields.io/badge/Algorithm-Dynamic%20Dijkstra-orange.svg)]()
[![License](https://img.shields.io/badge/License-MIT-purple.svg)]()

**CampusConnect** is a full-stack, autonomous 4WD rover navigation platform that combines closed-loop **MPU-6050 IMU gyroscope guidance**, **HC-SR04 ultrasonic safety braking**, **dynamic Dijkstra graph pathfinding**, **real-time MJPEG camera streaming**, **destination QR code verification**, **USB microphone voice navigation**, and a **modern mobile-responsive Web UI**.

---

## 🌟 Key Highlights & System Features

- 🧭 **Closed-Loop IMU Gyroscopic Navigation:** Real-time Z-axis yaw integration from the MPU-6050 sensor provides calibrated precision turns ($45^\circ$, $90^\circ$, $135^\circ$, $180^\circ$) with two-stage deceleration and active counter-braking to eliminate inertia overshoot.
- 🛡️ **15.0 cm Ultrasonic Safety Stop & Dynamic Rerouting:** Sub-40ms HC-SR04 median-filtered distance tracking automatically triggers an emergency brake when an obstacle is within **15.0 cm**, announces *"Obstacle detected! Rerouting"*, and recalculates a collision-free detour with Dijkstra.
- 📷 **Live Video Stream & Destination QR Code Verification:** High-frame-rate MJPEG streaming with native camera process management. Upon arriving at a destination, OpenCV scans for the node's QR code (`NODE_A`, `NODE_B`, `NODE_C`, `NODE_D`, `NODE_S`), draws a visual bounding box on the feed, and announces 🔊 *"Destination verified successfully!"*.
- 🎙️ **Multi-Modal Voice Interaction:**
  - **Input:** Physical USB Gooseneck microphone speech recognition (*"Navigate to Point A"*, *"Go to Base Station"*).
  - **Output:** Non-blocking multi-engine text-to-speech (`pico2wave` / `espeak-ng` + `aplay`) routed to the rover's Bluetooth speaker.
- 📱 **Mobile Touch Teleoperation & SVG Route Map:** Responsive dark-mode dashboard with touch D-pad, live yaw heading, distance telemetry, and an interactive SVG map showing the active node.

---

## 🏗️ Hardware Architecture & Pin Matrix

```
                          ┌──────────────────────────┐
                          │    Power Supply (12V)    │
                          └─────────────┬────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 ▼                                             ▼
       ┌──────────────────┐                          ┌──────────────────┐
       │   L298N Driver   │                          │   Raspberry Pi   │
       │ (4 BO DC Motors) │                          │   (Bookworm OS)  │
       └─────────▲────────┘                          └─────────▲────────┘
                 │ PWM & Dir Controls                          │
                 │                                             │ USB Serial (115200)
                 │         ┌───────────────────────┐           │ /dev/ttyUSB0
                 └─────────┤      Arduino Uno      ├───────────┘
                           │   (Firmware Engine)   │
                           └───────────┬───────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
          ┌──────────────────┐                  ┌──────────────────┐
          │     MPU-6050     │                  │  HC-SR04 Sonar   │
          │   6-DOF Gyro/Acc │                  │ (15cm Threshold) │
          └──────────────────┘                  └──────────────────┘
```

### ⚡ Wiring & Pinout Connections

| Component | Pin / Signal | Connected To | Description |
| :--- | :--- | :--- | :--- |
| **HC-SR04 Ultrasonic** | `VCC` | Arduino `5V` | 5V Power Supply |
| | `GND` | Arduino `GND` | Ground |
| | `TRIG` | Arduino `D12` | Trigger output pulse |
| | `ECHO` | Arduino `D4` | Clean echo input *(avoids D13 LED resistor)* |
| **MPU-6050 IMU** | `VCC` | Arduino `5V` | Power |
| | `GND` | Arduino `GND` | Ground |
| | `SCL` | Arduino `A5` | I2C Clock (Hardware I2C) |
| | `SDA` | Arduino `A4` | I2C Data (Hardware I2C) |
| | `AD0` | Arduino `GND` | I2C Address Select (`0x68`) |
| **L298N Motor Driver** | `ENA` | Arduino `D5` | Left Motors Speed PWM |
| | `ENB` | Arduino `D6` | Right Motors Speed PWM |
| | `IN1` | Arduino `D8` | Left Motors Forward |
| | `IN2` | Arduino `D9` | Left Motors Reverse |
| | `IN3` | Arduino `D10` | Right Motors Forward |
| | `IN4` | Arduino `D11` | Right Motors Reverse |
| | `12V Term` | Battery `+12V` | Motor Power Supply |
| | `GND Term` | Battery `-` & Arduino `GND` | Common Ground |
| **CSI Camera** | Ribbon Cable | Raspberry Pi CSI | Live Video & QR Detection |
| **USB Microphone** | USB Port | Raspberry Pi USB (`card 3`) | Hardware Voice Recognition |
| **Bluetooth Speaker** | Bluetooth / 3.5mm | Raspberry Pi Audio Sink | Live Voice Alerts |

---

## 🗺️ Navigation Topology & Dijkstra Graph

The physical layout is modeled as a connected planar graph in `routes.json`:

```
               [Point B]
              /    |    \
             /     |     \
    [Point A] ----[S]---- [Point D]
             \  (Base)   /
              \    |    /
               [Point C]
```

- **Nodes:** `S` (Base Station / Start), `A`, `B`, `C`, `D`.
- **Dynamic Dijkstra Engine:** If an obstacle blocks path $S \to A$, the edge $(S, A)$ is blocked and the pathfinder calculates the alternate detour: $S \to B \to A$.

---

## 📱 5 Node Destination QR Codes

Access printable high-resolution QR codes directly from the web dashboard at `http://<RaspberryPi_IP>:5000/qrcodes`:

| Node | Name | QR Payload | Expected Rover Response |
| :---: | :--- | :---: | :--- |
| **S** | 🏠 Base Station (Home) | `NODE_S` | 🔊 *"Destination verified successfully!"* |
| **A** | 📍 Point A | `NODE_A` | 🔊 *"Destination verified successfully!"* |
| **B** | 📍 Point B | `NODE_B` | 🔊 *"Destination verified successfully!"* |
| **C** | 📍 Point C | `NODE_C` | 🔊 *"Destination verified successfully!"* |
| **D** | 📍 Point D | `NODE_D` | 🔊 *"Destination verified successfully!"* |

---

## 📁 Repository Structure

```
c:/NIRMAAAN/
├── arduino/
│   ├── robot_motor_controller/
│   │   └── robot_motor_controller.ino     # Production Arduino Uno firmware
│   ├── mpu6050_compass_test/
│   │   └── mpu6050_compass_test.ino       # Standalone MPU-6050 test sketch
│   └── robot_motor_autotest/
│       └── robot_motor_autotest.ino       # Motor direction diagnostic sketch
├── raspberry_pi/
│   ├── app.py                             # Main Flask server & video/QR/speech streamer
│   ├── campus_navigator.py                # Graph parser & Dijkstra routing engine
│   ├── routes.json                        # Node coordinates, distances & motion commands
│   ├── test_all_devices.py                # Complete hardware diagnostic test suite
│   ├── requirements.txt                   # Python package dependencies
│   └── templates/
│       ├── index.html                     # Responsive web dashboard with live camera & D-pad
│       └── qrcodes.html                   # Printable QR codes page for all 5 nodes
└── README.md
```

---

## 🚀 Quick Setup & Installation Guide

### 1. Arduino Uno Setup
1. Open `arduino/robot_motor_controller/robot_motor_controller.ino` in the Arduino IDE.
2. Select Board: **Arduino Uno**, Port: your Arduino USB port.
3. Click **Upload**.

### 2. Raspberry Pi Setup
1. Connect to your Raspberry Pi terminal via SSH or VNC.
2. Clone the repository:
   ```bash
   cd ~
   git clone https://github.com/<your-username>/NIRMAAAN.git campus_connect
   cd ~/campus_connect/raspberry_pi
   ```
3. Install system dependencies:
   ```bash
   sudo apt update
   sudo apt install -y python3-opencv python3-numpy espeak-ng alsa-utils flac
   ```
4. Install Python dependencies:
   ```bash
   pip3 install -r requirements.txt
   ```

### 3. Run Hardware Diagnostics
Verify all sensors, camera, USB mic, and speaker with the diagnostic tool:
```bash
python3 test_all_devices.py
```

### 4. Launch the Navigation Server
```bash
python3 app.py
```
Open your mobile or desktop browser and navigate to:
```
http://<RaspberryPi_IP>:5000
```

---

## 🎮 Web Dashboard & Manual Teleop Controls

- **Autonomous Navigation:** Tap any destination button (`Point A`, `Point B`, `Point C`, `Point D`, or `Base Station`).
- **Voice Mic:** Tap the microphone icon and speak clearly into the robot's USB mic (*"Navigate to Point A"*).
- **Manual Touch D-Pad:**
  - `▲` : Forward
  - `◀` : Left Spin
  - `▶` : Right Spin
  - `▼` : Backward
  - `⏹` : Instant Emergency Stop
- **Precision IMU Angle Turns:**
  - `↰ 90° Left` / `↱ 90° Right`
  - `⮌ 180° Left` / `⮌ 180° Right` (U-Turns)
  - `↰ 45° Left` / `↱ 45° Right`
  - `🎯 Reset Heading`: Resets the yaw angle back to $0.0^\circ$.
- **Keyboard Shortcuts:** `W`, `A`, `S`, `D`, `Space` / `X` (Stop), `1` (90°L), `2` (90°R), `3` (180°L), `4` (180°R), `Z` (Reset Yaw).

---

## 📡 REST API Reference

| Endpoint | Method | Payload / Params | Description |
| :--- | :---: | :--- | :--- |
| `/` | `GET` | — | Web Dashboard UI |
| `/qrcodes` | `GET` | — | Printable 5-Node QR Codes View |
| `/video_feed` | `GET` | — | Live MJPEG Camera Stream with QR Overlays |
| `/navigate` | `POST` | `{"destination": "A"}` | Starts autonomous navigation to node |
| `/manual_cmd` | `POST` | `{"cmd": "W"}` | Sends direct teleop command to Arduino |
| `/current` | `GET` | — | Returns current node (`{"location": "S"}`) |
| `/robot_status` | `GET` | — | Returns status, obstacle alert, and QR state |
| `/imu` | `GET` | — | Returns live yaw heading angle (`{"yaw": 45.2}`) |
| `/listen_usb_mic` | `POST` | — | Records 4s from USB Mic and routes to destination |
| `/test_speaker` | `POST` | — | Plays test voice announcement through speaker |

---

## 📄 License
This project is open-source and released under the **MIT License**.
