# CampusConnect — Troubleshooting Guide

## 1. Robot Shows OFFLINE on Dashboard

- **Check Backend**: Verify the backend server is running on `http://localhost:3001`.
- **Token Match**: Ensure `ROBOT_TOKEN` in `campusconnect/robot/.env` matches `ROBOT_TOKEN` in `campusconnect/backend/.env`.
- **LAN IP**: If running on physical Raspberry Pi over Wi-Fi, set `SERVER_URL=http://<YOUR_PC_IP>:3001` in the robot's `.env`.

---

## 2. Arduino Serial Connection Fails

- **Serial Port Name**: On Windows, check Device Manager (e.g. `COM3` or `COM4`). On Linux/Pi, run `ls /dev/ttyUSB* /dev/ttyACM*`.
- **Permission on Linux**: Add user to `dialout` group: `sudo usermod -a -G dialout $USER`.
- **Baud Rate**: Ensure `115200` baud is used across both `settings.py` and Arduino `config.h`.

---

## 3. Motors Do Not Spin or Turn Weakly

- **Common Ground**: Ensure battery pack ground (-) and Arduino GND are physically connected together.
- **Battery Voltage**: L298N requires at least 9V–12V for DC geared motors (BO motors). Check if battery pack is charged.
- **Enable Jumpers**: Ensure ENA and ENB jumpers are removed if using PWM pins 5 and 10 for speed control.

---

## 4. MPU6050 Gyro Drift / Turn Timeout

- **Keep Stationary on Boot**: When the Arduino boots, it performs gyro bias calibration for 1 second. Do not move or bump the robot during power-up.
- **I2C Pullups**: Arduino Uno internal pull-ups work for short I2C wires. Keep I2C wires shorter than 20cm.

---

## 5. Camera / MJPEG Stream Not Showing

- **Camera Index**: Set `CAMERA_INDEX=0` (or `1` if external webcam).
- **Port 8081**: Ensure firewall permits port 8081 for the MJPEG stream.
- **Mock Mode**: If no camera is attached, set `MOCK_HARDWARE=true` in `robot/.env` to stream synthetic frames.
