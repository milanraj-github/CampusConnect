# Campus Connect - MPU-6050 & Motor Verification Guide

This package provides test scripts to verify the **MPU-6050 IMU sensor (Yaw Degrees & Left/Right Direction)** on both **Arduino Uno** and **Raspberry Pi**.

---

## 📁 Project Structure

```
c:/NIRMAAAN/
├── arduino/
│   └── mpu6050_compass_test/
│       └── mpu6050_compass_test.ino   <-- Upload this to Arduino Uno
├── raspberry_pi/
│   ├── requirements.txt               <-- Python dependencies (pyserial, smbus2)
│   ├── imu_serial_reader.py           <-- Reads IMU data from Arduino via USB Serial
│   └── imu_direct_i2c.py              <-- Reads IMU data directly from Pi GPIO I2C
└── README.md
```

---

## ⚡ 1. Pin Connections Summary

### MPU-6050 Connections
| MPU-6050 Pin | Arduino Uno | Raspberry Pi (Direct I2C) |
|---|---|---|
| **VCC** | `5V` (or `3.3V`) | `Pin 1` (3.3V Power) |
| **GND** | `GND` | `Pin 6` (GND) |
| **SCL** | `A5` | `Pin 5` (GPIO 3 / SCL) |
| **SDA** | `A4` | `Pin 3` (GPIO 2 / SDA) |
| **AD0** | `GND` | `GND` |

### L298N & Motor Connections
- **12V Screw Terminal**: Battery (+)
- **GND Screw Terminal**: Battery (-) **AND** Arduino GND *(Common Ground)*
- **OUT1 & OUT2**: Left 2 BO Motors (in parallel)
- **OUT3 & OUT4**: Right 2 BO Motors (in parallel)
- **IN1, IN2, IN3, IN4**: Arduino pins `D8`, `D9`, `D10`, `D11`

---

## 🖥️ 2. How to use in RealVNC Connect on Raspberry Pi

### Step 1: Open Terminal in RealVNC
1. Connect to your Raspberry Pi using **RealVNC Viewer**.
2. Click the black **Terminal** icon on the top panel (or press `Ctrl + Alt + T`).

### Step 2: Create the Project Folder
Run in the Raspberry Pi terminal:
```bash
mkdir -p ~/campus_connect
cd ~/campus_connect
```

### Step 3: Create the Files on Raspberry Pi

#### Option A: Copy-Paste via RealVNC & Nano (Simplest)
Create `requirements.txt`:
```bash
nano requirements.txt
```
*(Paste contents and press `Ctrl + O`, `Enter`, then `Ctrl + X`)*

Create `imu_serial_reader.py`:
```bash
nano imu_serial_reader.py
```
*(Paste script contents and save)*

Create `imu_direct_i2c.py`:
```bash
nano imu_direct_i2c.py
```
*(Paste script contents and save)*

---

### Step 4: Install Dependencies & Run

1. **Install python packages**:
```bash
pip3 install -r requirements.txt
```

2. **If reading from Arduino over USB Serial**:
   - Plug the Arduino Uno into any USB port of the Raspberry Pi.
   - Run:
   ```bash
   python3 imu_serial_reader.py
   ```

3. **If connecting MPU-6050 directly to Raspberry Pi GPIO**:
   - Enable I2C: `sudo raspi-config` -> *Interface Options* -> *I2C* -> *Yes* -> *Finish*.
   - Run:
   ```bash
   python3 imu_direct_i2c.py
   ```
