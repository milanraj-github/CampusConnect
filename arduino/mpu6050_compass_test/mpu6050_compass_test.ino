/*
 * Campus Connect - MPU-6050 IMU Heading & Turn Direction Verification
 * Target: Arduino Uno
 * 
 * Connections:
 *   MPU-6050 VCC -> Arduino 5V (or 3.3V)
 *   MPU-6050 GND -> Arduino GND
 *   MPU-6050 SCL -> Arduino A5 (SCL)
 *   MPU-6050 SDA -> Arduino A4 (SDA)
 *   MPU-6050 AD0 -> Arduino GND (Address 0x68)
 */

#include <Wire.h>

const int MPU_ADDR = 0x68; // I2C address of MPU-6050

int16_t gyro_z_raw;
float gyro_z_deg_s = 0.0;
float gyro_z_offset = 0.0;
float yaw_angle = 0.0;

unsigned long prev_time = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Wake up MPU-6050 (PWR_MGMT_1 register)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission(true);

  // Set Full Scale Gyro Range (+/- 250 deg/s)
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1B);
  Wire.write(0x00);
  Wire.endTransmission(true);

  Serial.println("\n==========================================");
  Serial.println("  MPU-6050 Campus Connect Direction Test  ");
  Serial.println("==========================================");
  Serial.println("[INFO] Calibrating Gyroscope... Keep sensor STILL!");

  // Gyro Z Calibration (500 samples)
  long sum_z = 0;
  for (int i = 0; i < 500; i++) {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x47); // GYRO_ZOUT_H
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_ADDR, 2, true);

    if (Wire.available() >= 2) {
      int16_t gz = (Wire.read() << 8) | Wire.read();
      sum_z += gz;
    }
    delay(4);
  }
  gyro_z_offset = (float)sum_z / 500.0;

  Serial.print("[INFO] Gyro Z Offset Calibrated: ");
  Serial.println(gyro_z_offset);
  Serial.println("[INFO] Ready! Rotate the sensor left or right.");
  Serial.println("------------------------------------------");

  prev_time = millis();
}

void loop() {
  unsigned long current_time = millis();
  float dt = (current_time - prev_time) / 1000.0; // in seconds
  prev_time = current_time;

  // Read Gyro Z axis register
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x47); // GYRO_ZOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 2, true);

  if (Wire.available() >= 2) {
    gyro_z_raw = (Wire.read() << 8) | Wire.read();
  }

  // Convert raw value to degrees/second (131.0 LSB / (deg/s))
  gyro_z_deg_s = ((float)gyro_z_raw - gyro_z_offset) / 131.0;

  // Integration for Yaw Heading Angle (with noise deadband filter)
  if (abs(gyro_z_deg_s) > 1.2) {
    yaw_angle += gyro_z_deg_s * dt;
  }

  // Determine Direction State
  String direction_str = "STRAIGHT / IDLE";
  if (gyro_z_deg_s > 3.5) {
    direction_str = "TURNING LEFT  <<";
  } else if (gyro_z_deg_s < -3.5) {
    direction_str = "TURNING RIGHT >>";
  }

  // Serial formatted telemetry
  Serial.print("Yaw: ");
  if (yaw_angle >= 0) Serial.print("+");
  Serial.print(yaw_angle, 1);
  Serial.print(" deg | Rate: ");
  if (gyro_z_deg_s >= 0) Serial.print("+");
  Serial.print(gyro_z_deg_s, 1);
  Serial.print(" deg/s | Direction: ");
  Serial.println(direction_str);

  delay(50); // 20 Hz loop rate
}
