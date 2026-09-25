# CampusConnect — Deployment & Quick Start Guide

## Prerequisites

- **Server / Laptop**: Node.js v18+, npm 9+
- **Robot (Raspberry Pi 4/5 or PC for testing)**: Python 3.9+, USB Camera, USB Microphone, Speaker
- **Microcontroller**: Arduino Uno with USB cable

---

## 1. Backend Server Setup

```bash
cd campusconnect/backend

# Install dependencies
npm install

# Initialize SQLite database and seed demo map
npx prisma generate
npx prisma db push
npm run db:seed

# Start backend server
npm run dev
```
The REST API will be live at `http://localhost:3001/api` and WebSocket namespaces at `/robot` and `/dashboard`.

---

## 2. Admin Web Frontend Setup

```bash
cd campusconnect/frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open your browser at `http://localhost:5173`.
Log in with default admin credentials:
- **Email**: `admin@campusconnect.local`
- **Password**: `admin123`

---

## 3. Robot Software Setup (on Raspberry Pi or PC)

```bash
cd campusconnect/robot

# Install python dependencies
pip install -r requirements.txt

# (Optional) Download offline Vosk English speech model (~40MB)
mkdir -p models
# Download and unzip vosk-model-small-en-us-0.15 into models/

# Launch autonomous robot software
python -m src.main
```

### Running Automated Section 43 Demo

To test the complete end-to-end voice and navigation lifecycle automatically without needing physical hardware connected:

```bash
cd campusconnect/robot
python -m src.main --demo --mock
```

This will automatically execute the exact demonstration scenario from Section 43:
1. Speaks *"Take me to the library."*
2. Robot calculates route via Dijkstra (`Main Entrance -> Block A -> Library`).
3. Executes MPU6050 turn (*"I am turning right."*).
4. Moves forward (*"I am moving forward."*).
5. Scans and verifies destination QR (`QR-LIBRARY-01`).
6. Robot arrives and announces arrival.
7. Asks library timings and reading room location.
8. User says *"Thank you"* and robot navigates back to Start dock.
