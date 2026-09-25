#!/usr/bin/env python3
"""
Campus Connect - Direct I2C MPU-6050 Reader (Raspberry Pi)
Reads MPU-6050 connected directly to Raspberry Pi GPIO I2C (Pin 3: SDA, Pin 5: SCL).
"""

import sys
import time

try:
    import smbus2
except ImportError:
    print("[ERROR] smbus2 library not found. Run: pip3 install smbus2")
    sys.exit(1)

MPU_ADDR = 0x68
PWR_MGMT_1 = 0x6B
GYRO_CONFIG = 0x1B
GYRO_ZOUT_H = 0x47

def setup_mpu(bus):
    try:
        # Wake up MPU-6050
        bus.write_byte_data(MPU_ADDR, PWR_MGMT_1, 0x00)
        # Gyro +/- 250 deg/s range
        bus.write_byte_data(MPU_ADDR, GYRO_CONFIG, 0x00)
        time.sleep(0.1)
    except Exception as e:
        print(f"[ERROR] Failed to communicate with MPU-6050 at address 0x{MPU_ADDR:02X}: {e}")
        print("Please check wiring (SDA -> Pin 3, SCL -> Pin 5, VCC -> 3.3V Pin 1, GND -> Pin 6)")
        sys.exit(1)

def read_raw_gyro_z(bus):
    high = bus.read_byte_data(MPU_ADDR, GYRO_ZOUT_H)
    low = bus.read_byte_data(MPU_ADDR, GYRO_ZOUT_H + 1)
    value = (high << 8) | low
    if value > 32767:
        value -= 65536
    return value

def main():
    try:
        bus = smbus2.SMBus(1)
    except Exception as e:
        print(f"[ERROR] Could not open I2C bus 1: {e}")
        print("Make sure I2C is enabled in raspi-config!")
        sys.exit(1)

    setup_mpu(bus)

    print("\n==========================================")
    print(" Raspberry Pi Direct I2C MPU-6050 Test    ")
    print("==========================================")
    print("[INFO] Calibrating Gyroscope... Keep sensor STILL!")

    # 400 sample calibration
    samples = 400
    total = 0
    for _ in range(samples):
        total += read_raw_gyro_z(bus)
        time.sleep(0.005)
    offset_z = total / samples

    print(f"[INFO] Gyro Z Offset Calibrated: {offset_z:.2f}")
    print("[INFO] Ready! Rotate the sensor left or right.")
    print("=" * 65)

    yaw_angle = 0.0
    prev_time = time.time()

    try:
        while True:
            current_time = time.time()
            dt = current_time - prev_time
            prev_time = current_time

            raw_z = read_raw_gyro_z(bus)
            rate_z = (raw_z - offset_z) / 131.0 # 131 LSB / (deg/s)

            # Deadband noise suppression
            if abs(rate_z) > 1.2:
                yaw_angle += rate_z * dt

            # Direction detection
            if rate_z > 3.5:
                direction_str = "TURNING LEFT  <<"
            elif rate_z < -3.5:
                direction_str = "TURNING RIGHT >>"
            else:
                direction_str = "STRAIGHT / IDLE"

            sign_yaw = "+" if yaw_angle >= 0 else ""
            sign_rate = "+" if rate_z >= 0 else ""
            print(f"Yaw: {sign_yaw}{yaw_angle:6.1f} deg | Rate: {sign_rate}{rate_z:6.1f} deg/s | Direction: {direction_str}")
            time.sleep(0.05)

    except KeyboardInterrupt:
        print("\n[INFO] Stopped by user.")
    finally:
        bus.close()

if __name__ == '__main__':
    main()
