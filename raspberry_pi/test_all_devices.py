#!/usr/bin/env python3
"""
Campus Connect - All Hardware Diagnostics & Verification Script
Verifies: Camera, USB Microphone (Card 3), Arduino Uno, MPU-6050, Ultrasonic Sensor, Speaker
"""

import os
import sys
import time
import glob
import subprocess

def print_header(title):
    print("\n" + "=" * 60)
    print(f" 🔍 {title}")
    print("=" * 60)

def test_camera():
    print_header("1. TESTING RASPBERRY PI CAMERA (OV5647)")
    cmd = ["rpicam-still", "-t", "1000", "-o", "camera_test.jpg", "--width", "640", "--height", "480"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        if os.path.exists("camera_test.jpg") and os.path.getsize("camera_test.jpg") > 1000:
            print("  ✅ Camera PASSED! Captured image saved to: camera_test.jpg")
        else:
            print("  ❌ Camera capture failed:")
            print(res.stderr)
    except Exception as e:
        print(f"  ❌ Camera Error: {e}")

def find_mic_card():
    try:
        out = subprocess.check_output(["arecord", "-l"], text=True)
        for line in out.splitlines():
            if "card" in line and "USB" in line:
                # e.g. "card 3: Device [USB PnP Sound Device]..."
                parts = line.split(":")
                card_num = parts[0].replace("card", "").strip()
                return card_num
    except Exception:
        pass
    return "3" # Default based on your diagnostic

def test_microphone():
    print_header("2. TESTING USB MICROPHONE")
    card_num = find_mic_card()
    device = f"plughw:{card_num},0"
    print(f"  Detected USB Mic at: {device}")
    print("  🎤 RECORDING 3 SECONDS... PLEASE SPEAK INTO THE MIC NOW!")
    
    cmd = ["arecord", "-D", device, "-d", "3", "-f", "cd", "mic_test.wav"]
    try:
        subprocess.run(cmd, check=True)
        if os.path.exists("mic_test.wav") and os.path.getsize("mic_test.wav") > 1000:
            print("  ✅ USB Microphone PASSED! Audio recorded to: mic_test.wav")
            print("  🔊 Playing back recorded voice...")
            subprocess.run(["aplay", "mic_test.wav"], capture_output=True)
        else:
            print("  ❌ Audio recording failed (file empty).")
    except Exception as e:
        print(f"  ❌ Mic Recording Error: {e}")

def test_speaker():
    print_header("3. TESTING AUDIO / BLUETOOTH SPEAKER")
    print("  🔊 Speaking test alert...")
    try:
        subprocess.run(["espeak", "All hardware devices verified and ready."], check=True)
        print("  ✅ Audio Output PASSED!")
    except Exception as e:
        print(f"  ⚠️ Audio Output Notice: {e}")

def test_arduino_and_sensors():
    print_header("4. TESTING ARDUINO, MPU-6050 & ULTRASONIC SENSOR")
    ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')
    if not ports:
        print("  ❌ Arduino NOT FOUND! Check USB cable.")
        return

    port = ports[0]
    print(f"  Found Arduino on {port}")
    try:
        import serial
        ser = serial.Serial(port, 115200, timeout=1)
        time.sleep(2)
        ser.reset_input_buffer()

        start_t = time.time()
        telemetry_count = 0
        print("  Reading Telemetry stream from Arduino (3 seconds)...")
        while time.time() - start_t < 3.0:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line.startswith("YAW:"):
                    telemetry_count += 1
                    print(f"    -> {line}")
            time.sleep(0.05)

        ser.close()
        if telemetry_count > 0:
            print(f"  ✅ Arduino & Sensors PASSED! ({telemetry_count} telemetry packets received)")
        else:
            print("  ⚠️ Arduino connected, but no telemetry lines received. Make sure robot_motor_controller.ino is uploaded!")
    except Exception as e:
        print(f"  ❌ Serial Error: {e}")

if __name__ == '__main__':
    print("\n" + "#" * 60)
    print("   🤖 CAMPUS CONNECT FULL HARDWARE DIAGNOSTICS")
    print("#" * 60)
    
    test_camera()
    test_microphone()
    test_speaker()
    test_arduino_and_sensors()

    print("\n" + "#" * 60)
    print("   🎉 DIAGNOSTICS COMPLETE!")
    print("#" * 60 + "\n")
