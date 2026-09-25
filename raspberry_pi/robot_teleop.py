#!/usr/bin/env python3
"""
Campus Connect - Robot Teleop with Precision Angle Turning (Raspberry Pi)
"""

import sys
import time
import glob
import select
import termios
import tty
import serial

def find_arduino():
    ports = glob.glob('/dev/ttyACM*') + glob.glob('/dev/ttyUSB*')
    return ports[0] if ports else None

def get_char():
    """Non-blocking single character read from terminal."""
    dr, _, _ = select.select([sys.stdin], [], [], 0.02)
    if dr:
        return sys.stdin.read(1)
    return None

def main():
    port = find_arduino()
    if not port:
        print("[ERROR] Arduino not detected on /dev/ttyACM* or /dev/ttyUSB*.")
        print("Please check USB cable connection.")
        sys.exit(1)

    print(f"[INFO] Connecting to Arduino on {port}...")
    try:
        ser = serial.Serial(port, 115200, timeout=0.05)
        time.sleep(2)
        ser.reset_input_buffer()
    except Exception as e:
        print(f"[ERROR] Could not open port: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("      🚀 CAMPUS CONNECT - ADVANCED TELEOP & AUTO-TURNS      ")
    print("=" * 60)
    print("  Manual Controls:")
    print("    [ W ]  Move FORWARD")
    print("    [ S ]  Move BACKWARD")
    print("    [ A ]  Turn LEFT")
    print("    [ D ]  Turn RIGHT")
    print("    [ Space ] or [ X ]  STOP MOTORS")
    print("\n  🎯 Precise MPU-6050 Angle Auto-Turns:")
    print("    [ 1 ]  Auto-Turn  90° LEFT")
    print("    [ 2 ]  Auto-Turn  90° RIGHT")
    print("    [ 3 ]  Auto-Turn 180° LEFT  (U-Turn)")
    print("    [ 4 ]  Auto-Turn 180° RIGHT (U-Turn)")
    print("\n  Utilities:")
    print("    [ + / - ]  Speed Up / Speed Down")
    print("    [ Z ]      Reset Angle Heading to 0°")
    print("    [ Q ]      Quit Teleop")
    print("=" * 60 + "\n")

    fd = sys.stdin.fileno()
    old_settings = termios.tcgetattr(fd)

    try:
        tty.setraw(fd)

        while True:
            # 1. Read key input
            ch = get_char()
            if ch:
                k = ch.lower()

                if k == 'w':
                    ser.write(b'W')
                elif k == 's':
                    ser.write(b'S')
                elif k == 'a':
                    ser.write(b'A')
                elif k == 'd':
                    ser.write(b'D')
                elif k in [' ', 'x']:
                    ser.write(b'X')
                # Precise angle turn triggers:
                elif k == '1':
                    ser.write(b'1')
                elif k == '2':
                    ser.write(b'2')
                elif k == '3':
                    ser.write(b'3')
                elif k == '4':
                    ser.write(b'4')
                # Utilities:
                elif k in ['+', '=']:
                    ser.write(b'+')
                elif k in ['-', '_']:
                    ser.write(b'-')
                elif k == 'z':
                    ser.write(b'Z')
                elif k == 'q' or ord(ch) == 3: # Q or Ctrl+C
                    ser.write(b'X')
                    break

            # 2. Print Arduino output
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if line.startswith("YAW:"):
                    sys.stdout.write(f"\r\033[K[ROBOT STATUS] {line}")
                    sys.stdout.flush()
                elif line:
                    sys.stdout.write(f"\r\033[K{line}\n")
                    sys.stdout.flush()

            time.sleep(0.01)

    except Exception as e:
        ser.write(b'X')
        print(f"\n[ERROR] {e}")
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_settings)
        ser.write(b'X')
        ser.close()
        print("\n[INFO] Exited cleanly. Motors stopped.\n")

if __name__ == '__main__':
    main()
