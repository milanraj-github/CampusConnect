# CampusConnect — Autonomous Campus Assistance Robot

CampusConnect is an end-to-end autonomous campus assistance robot platform controlled through a responsive web application and natural voice commands.

An administrator can visually design and manage the campus map (locations, paths, directions, and destination Q&A) without writing any JSON manually. The robot synchronizes the map in real time, responds to voice commands, navigates between buildings with closed-loop MPU6050 IMU turns, verifies destinations with OpenCV QR detection, handles obstacles via HC-SR04 ultrasonic sensors, and answers destination questions before returning autonomously to its starting dock.

---

## 🏗️ Architecture Overview

```
[ ADMIN WEB APPLICATION ]  (React 18 + Vite + TypeScript + React Flow + Tailwind CSS)
            │
            ▼ (REST API / WebSockets)
[ BACKEND SERVER ]         (Node.js + Express + TypeScript + Prisma + SQLite + Socket.IO)
            │
            ▼ (Wi-Fi / Socket.IO / MJPEG Stream)
[ RASPBERRY PI ]           (Python 3: Vosk STT, pyttsx3 TTS, OpenCV QR/ArUco, FSM, NetworkX)
            │
            ▼ (USB Serial @ 115200 Baud)
[ ARDUINO UNO ]            (C++: L298N Motors, HC-SR04 Ultrasonic Sonar, MPU6050 Gyro IMU)
```

---

## 🚀 Key Features

1. **Visual Map Editor (React Flow)**: Drag-and-drop campus locations, draw directional paths, configure distances and QR code markers visually.
2. **Centralized 16-State Machine**: Robust finite state machine controlling all states (`IDLE`, `LISTENING`, `NAVIGATING`, `TURNING_LEFT`, `WAITING_FOR_OBSTACLE`, `VERIFYING_DESTINATION`, `ARRIVED`, `QUESTION_MODE`, `RETURNING_HOME`, `VERIFYING_START`, `COMPLETED`, `ERROR`).
3. **Closed-Loop MPU6050 Turns**: Precision 90° and 180° turns on Arduino using continuous gyroscope yaw integration.
4. **Offline Voice Interaction**: 100% offline speech-to-text (Vosk) and text-to-speech (pyttsx3) with RapidFuzz destination and intent parsing.
5. **Multi-Layer Safety**:
   - Immediate hardware-level motor stop on Arduino if obstacle $<10\text{ cm}$.
   - Automatic state machine pause and voice alert at $<30\text{ cm}$, resuming automatically when the path clears.
6. **QR Code Ground-Truth Localization**: Cross-verifies starting dock and destination markers before confirming arrival.
7. **Destination Knowledge Base**: Answers spoken user questions about building timings, floors, and services using database information.
8. **Live Operator Dashboard**: Real-time robot telemetry, obstacle warnings, animated route visualizer, and live MJPEG camera feed.

---

## 📁 Repository Structure

```
campusconnect/
├── backend/          # Node.js + Express + TypeScript + Prisma + SQLite
├── frontend/         # React 18 + Vite + TypeScript + React Flow + Tailwind CSS
├── robot/            # Python 3 autonomous robot software (Raspberry Pi)
├── arduino/          # Arduino Uno C++ firmware (L298N, MPU6050, HC-SR04)
├── docs/             # Hardware wiring, deployment, API, and troubleshooting guides
└── README.md
```

---

## ⚡ Quick Start

### 1. Start Backend Server
```bash
cd campusconnect/backend
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

### 2. Start Admin Frontend
```bash
cd campusconnect/frontend
npm install
npm run dev
```
Open `http://localhost:5173` and log in with `admin@campusconnect.local` / `admin123`.

### 3. Start Robot Software
```bash
cd campusconnect/robot
pip install -r requirements.txt
python -m src.main --demo --mock
```

---

---

## 🤖 Raspberry Pi Direct Live Integration

The website is configured to communicate directly with your Raspberry Pi at **`http://10.78.161.184:5000/`**:

1. **Live Camera Video Streaming**:
   - Streams from `http://10.78.161.184:5000/video_feed` (with `/stream` and `/` fallbacks).
   - Includes real-time connection status, manual refresh, and quick path switching in the dashboard.
2. **Real-Time Telemetry Polling**:
   - Fetches live sensor data, obstacle clearance, battery, heading, and state transitions every 2 seconds.
   - Automatically merges Raspberry Pi telemetry into the global website state and live map.
3. **Hardware Monitor & Teleoperation D-Pad**:
   - Dedicated dashboard at `/robot-monitor` displaying live Sonar Distance (HC-SR04), IMU Heading (MPU6050), Motor Speed PWM, CPU temperature, and raw JSON telemetry.
   - Interactive directional controls (Forward, Backward, Turn Left, Turn Right, Stop) dispatching commands directly to `http://10.78.161.184:5000/command`.
4. **Configuration & Connection Testing**:
   - Configure or change the Raspberry Pi IP anytime at `/settings` with a single-click **"Test Connection & Ping Pi"** button and live latency inspector.

---

## 📖 Documentation Links

- [Hardware Wiring & Pinout Guide](docs/hardware-setup.md)
- [Serial Communication Protocol (Pi ↔ Arduino)](docs/serial-protocol.md)
- [Deployment & Setup Guide](docs/deployment.md)
- [Troubleshooting & Diagnostics](docs/troubleshooting.md)
- [REST API Reference](docs/api-reference.md)

