# CampusConnect — Hardware Wiring & Assembly Guide

## Overview

CampusConnect employs a **Dual-Controller Architecture**:
- **High-Level Computer (Raspberry Pi 4 / 5)**: Vision (OpenCV QR/ArUco), Voice Recognition (Vosk), Text-to-Speech (pyttsx3), Finite State Machine, and Web Cloud Communication.
- **Low-Level Microcontroller (Arduino Uno)**: Real-time motor PWM speed control, MPU6050 IMU heading integration, and HC-SR04 ultrasonic obstacle interrupter.
- **Inter-controller Link**: USB Type-A to Type-B Cable (115200 baud serial).

---

## Complete Wiring Pinout Table

### 1. L298N Dual H-Bridge Motor Driver -> Arduino Uno

| L298N Pin | Arduino Uno Pin | Function / Description |
|---|---|---|
| **ENA** | **Pin 5** | Left Motor PWM Speed Control (0–255) |
| **IN1** | **Pin 6** | Left Motor Forward Direction |
| **IN2** | **Pin 7** | Left Motor Reverse Direction |
| **IN3** | **Pin 8** | Right Motor Forward Direction |
| **IN4** | **Pin 9** | Right Motor Reverse Direction |
| **ENB** | **Pin 10** | Right Motor PWM Speed Control (0–255) |
| **12V / VMS** | **Battery (+) 11.1V / 12V** | Motor Power Supply |
| **GND** | **Battery (-) & Arduino GND** | **Common Ground (Essential!)** |
| **5V Out** | *(Optional to Arduino Vin)* | Logic 5V if 5V jumper enabled |

> ⚠️ **CRITICAL NOTE**: The GND of the battery pack and the GND of the Arduino Uno MUST be connected together (Common Ground). Without common ground, PWM logic will not function properly.

---

### 2. MPU6050 6-Axis IMU Sensor -> Arduino Uno (I2C)

| MPU6050 Pin | Arduino Uno Pin | Description |
|---|---|---|
| **VCC** | **5V** or **3.3V** | Power Supply |
| **GND** | **GND** | Ground |
| **SCL** | **Pin A5** (or dedicated SCL) | I2C Clock (Fast Mode 400kHz) |
| **SDA** | **Pin A4** (or dedicated SDA) | I2C Data |
| **AD0** | **GND** | Sets I2C Address to `0x68` |

---

### 3. HC-SR04 Ultrasonic Distance Sensor -> Arduino Uno

| HC-SR04 Pin | Arduino Uno Pin | Description |
|---|---|---|
| **VCC** | **5V** | 5V Power Supply |
| **GND** | **GND** | Ground |
| **TRIG** | **Pin 11** | 10µs Trigger Output Pulse |
| **ECHO** | **Pin 12** | Echo Return Pulse Width |

---

### 4. Raspberry Pi Connections

| Peripheral | Port / Interface |
|---|---|
| **Arduino Uno** | USB Port 1 (`/dev/ttyUSB0` or `/dev/ttyACM0` on Linux, `COM3` on Windows) |
| **USB Camera / Pi Camera** | USB Port 2 / CSI Ribbon Cable |
| **USB Microphone** | USB Port 3 |
| **Speaker** | 3.5mm Audio Jack / USB Audio / Bluetooth |
| **Power** | 5V 3A USB-C Power Bank / Buck Converter |

---

## Flashing Arduino Firmware

1. Install [Arduino IDE](https://www.arduino.cc/en/software) or `arduino-cli`.
2. Open `campusconnect/arduino/campusconnect_firmware/campusconnect_firmware.ino`.
3. Select **Board**: `Arduino Uno` and choose the appropriate Serial Port.
4. Click **Upload**.
5. Once uploaded, the Arduino is ready to receive commands and execute MPU6050-guided turns.
