#!/usr/bin/env python3
"""
Campus Connect - IMU Serial Reader (Raspberry Pi)
Reads MPU-6050 degree heading and direction streamed from Arduino Uno over USB.
"""

import sys
import time
import glob
import serial

def find_arduino_port():
    """Detect common Arduino USB serial ports on Raspberry Pi."""
    ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')
    if ports:
        return ports[0]
    return None

def main():
    port = find_arduino_port()
    if not port:
        print("[ERROR] No Arduino found on /dev/ttyACM* or /dev/ttyUSB*.")
        print("Please check your USB cable connection between Raspberry Pi and Arduino.")
        sys.exit(1)

    baud_rate = 115200
    print(f"[INFO] Connecting to Arduino on {port} @ {baud_rate} baud...")

    try:
        ser = serial.Serial(port, baud_rate, timeout=1)
        time.sleep(2) # Allow Arduino to reset and finish calibration
        ser.reset_input_buffer()
        print("[INFO] Connected successfully! Streaming IMU data:\n")
        print("=" * 65)

        while True:
            if ser.in_waiting > 0:
                raw_line = ser.readline().decode('utf-8', errors='ignore').strip()
                if raw_line:
                    print(raw_line)

    except serial.SerialException as err:
        print(f"\n[ERROR] Serial communication error: {err}")
    except KeyboardInterrupt:
        print("\n[INFO] Stopped by user.")
    finally:
        if 'ser' in locals() and ser.is_open:
            ser.close()

if __name__ == '__main__':
    main()
