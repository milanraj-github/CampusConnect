/*
 * ==============================================================================
 * Campus Connect - Integrated Autonomous Robot Controller
 * Features:
 *   - HC-SR04 Ultrasonic Obstacle Detection (Exact 15.0cm Safety Stop Threshold)
 *   - MPU-6050 6-DOF IMU Closed-Loop Gyroscope Angular Navigation
 *   - L298N 4-WD Dual H-Bridge Motor Driver with Deceleration & Counter-Braking
 *   - Real-Time Bidirectional Serial Telemetry (115200 Baud)
 * 
 * Hardware Pin Connections:
 *   1. HC-SR04 Ultrasonic Sensor:
 *      - VCC  -> Arduino 5V
 *      - GND  -> Arduino GND
 *      - TRIG -> Arduino Pin D12
 *      - ECHO -> Arduino Pin D4   (Connected to D4 to avoid Pin 13 LED resistor interference)
 * 
 *   2. MPU-6050 Gyroscope / Accelerometer:
 *      - VCC -> 5V / 3.3V
 *      - GND -> GND
 *      - SCL -> Arduino Pin A5
 *      - SDA -> Arduino Pin A4
 *      - AD0 -> GND (Address 0x68)
 * 
 *   3. L298N Motor Driver:
 *      - ENA (Left Speed PWM)  -> Arduino Pin D5
 *      - ENB (Right Speed PWM) -> Arduino Pin D6
 *      - IN1 (Left Dir 1)      -> Arduino Pin D8
 *      - IN2 (Left Dir 2)      -> Arduino Pin D9
 *      - IN3 (Right Dir 1)     -> Arduino Pin D10
 *      - IN4 (Right Dir 2)     -> Arduino Pin D11
 * ==============================================================================
 */

#include <Wire.h>

// --- HC-SR04 Ultrasonic Sensor ---
const int TRIG_PIN = 12;
const int ECHO_PIN = 4; // High-impedance clean digital input

const float OBSTACLE_THRESHOLD_CM = 15.0; // Exact 15.0cm safety distance

// --- L298N Motor Driver Pins ---
const int ENA = 5;
const int IN1 = 8;
const int IN2 = 9;
const int IN3 = 10;
const int IN4 = 11;
const int ENB = 6;

int motor_speed = 200;

// Motor Polarity Alignment Flags
bool INVERT_LEFT_MOTOR  = true;
bool INVERT_RIGHT_MOTOR = true;

// MPU-6050 Calibration Scale (Physical deg * 0.5 = Sensor target deg)
const float SENSOR_SCALE = 0.5;

// --- MPU-6050 Variables ---
const int MPU_ADDR = 0x68;
int16_t gyro_z_raw = 0;
float gyro_z_deg_s = 0.0;
float gyro_z_offset = 0.0;
float yaw_angle = 0.0;
unsigned long prev_time = 0;

String current_motion = "STOPPED";
float current_distance_cm = 999.0;
bool obstacle_detected = false;

// --- Low-Level Motor Control ---
void setLeftMotor(int speed, bool forward) {
  if (INVERT_LEFT_MOTOR) forward = !forward;
  if (speed <= 0) {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    analogWrite(ENA, 0);
  } else if (forward) {
    digitalWrite(IN1, HIGH);
    digitalWrite(IN2, LOW);
    analogWrite(ENA, speed);
  } else {
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, HIGH);
    analogWrite(ENA, speed);
  }
}

void setRightMotor(int speed, bool forward) {
  if (INVERT_RIGHT_MOTOR) forward = !forward;
  if (speed <= 0) {
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);
    analogWrite(ENB, 0);
  } else if (forward) {
    digitalWrite(IN3, HIGH);
    digitalWrite(IN4, LOW);
    analogWrite(ENB, speed);
  } else {
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, HIGH);
    analogWrite(ENB, speed);
  }
}

// --- High-Level Motion Commands ---
void stopMotors() {
  setLeftMotor(0, true);
  setRightMotor(0, true);
  current_motion = "STOPPED";
}

void moveForward(int spd) {
  if (obstacle_detected) {
    stopMotors();
    current_motion = "BLOCKED";
    return;
  }
  setLeftMotor(spd, true);
  setRightMotor(spd, true);
  current_motion = "FORWARD";
}

void moveBackward(int spd) {
  setLeftMotor(spd, false);
  setRightMotor(spd, false);
  current_motion = "BACKWARD";
}

void turnLeft(int spd) {
  setLeftMotor(spd, true);   // Left wheels forward
  setRightMotor(spd, false); // Right wheels reverse
  current_motion = "TURNING LEFT";
}

void turnRight(int spd) {
  setLeftMotor(spd, false);  // Left wheels reverse
  setRightMotor(spd, true);  // Right wheels forward
  current_motion = "TURNING RIGHT";
}

// --- Responsive Ultrasonic Distance Measurement (3-sample median) ---
float readUltrasonicDistance() {
  long sum = 0;
  int valid_samples = 0;

  for (int i = 0; i < 3; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    // Timeout 15000us (~2.5 meters) for fast, responsive detection
    long duration = pulseIn(ECHO_PIN, HIGH, 15000);
    if (duration > 60 && duration < 15000) {
      sum += duration;
      valid_samples++;
    }
    delayMicroseconds(300);
  }

  if (valid_samples == 0) {
    return 999.0;
  }
  long avg_duration = sum / valid_samples;
  return (avg_duration * 0.0343) / 2.0; // Distance in cm
}

// --- IMU Update Routine ---
void updateIMU() {
  unsigned long current_time = millis();
  float dt = (current_time - prev_time) / 1000.0;
  prev_time = current_time;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x47); // GYRO_ZOUT_H
  byte err = Wire.endTransmission(false);

  if (err == 0) {
    byte bytesReceived = Wire.requestFrom(MPU_ADDR, 2, true);
    if (bytesReceived >= 2) {
      gyro_z_raw = (Wire.read() << 8) | Wire.read();
      gyro_z_deg_s = ((float)gyro_z_raw - gyro_z_offset) / 131.0;
      
      // Noise deadband
      if (abs(gyro_z_deg_s) > 1.2) {
        yaw_angle += gyro_z_deg_s * dt;
      }
    }
  } else {
    Wire.clearWireTimeoutFlag();
  }
}

// --- Closed-Loop Precision Angle Turn with Active Deceleration ---
void executePreciseTurn(float sensor_target_deg, bool is_left, int turn_speed) {
  float start_yaw = yaw_angle;
  unsigned long timeout = millis() + 4000;

  int slow_spd = 130;
  float slow_down_lead = 15.0;
  float brake_lead = 2.5;

  while (millis() < timeout) {
    updateIMU();
    
    float rotated = abs(yaw_angle - start_yaw);
    float remaining = sensor_target_deg - rotated;

    if (remaining <= brake_lead) {
      break;
    } else if (remaining <= slow_down_lead) {
      if (is_left) turnLeft(slow_spd);
      else turnRight(slow_spd);
    } else {
      if (is_left) turnLeft(turn_speed);
      else turnRight(turn_speed);
    }
    delay(5);
  }

  // Active reverse counter-pulse (35ms) to kill inertia
  if (is_left) turnRight(150);
  else turnLeft(150);
  delay(35);

  stopMotors();
  delay(80);
  updateIMU();
}

void executePhysicalTurn(float physical_deg, bool is_left) {
  float sensor_deg = physical_deg * SENSOR_SCALE;
  executePreciseTurn(sensor_deg, is_left, 175);
}

// --- Setup ---
void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Prevent I2C lockups from motor EMF noise
  Wire.setWireTimeout(10000, true);

  // Ultrasonic Pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // Motor Driver Pins
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  stopMotors();

  // Wake up MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0x00); // Wake up
  Wire.endTransmission(true);

  // Calibrate Gyro Offset (average over 250 samples)
  long sum_z = 0;
  for (int i = 0; i < 250; i++) {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x47);
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_ADDR, 2, true);
    if (Wire.available() >= 2) {
      sum_z += (Wire.read() << 8) | Wire.read();
    }
    delay(4);
  }
  gyro_z_offset = (float)sum_z / 250.0;
  prev_time = millis();

  Serial.println("\n[SYSTEM] Robot Ready! Ultrasonic on D12(TRIG)/D4(ECHO). Threshold: 15cm.");
}

unsigned long last_telemetry = 0;
unsigned long last_sonar = 0;

// --- Main Loop ---
void loop() {
  // 1. Ultrasonic Distance Sampling every 40ms
  if (millis() - last_sonar >= 40) {
    last_sonar = millis();
    float dist = readUltrasonicDistance();
    if (dist > 0.5 && dist < 400.0) {
      current_distance_cm = dist;
    }

    // Exact 15cm threshold detection
    if (current_distance_cm <= OBSTACLE_THRESHOLD_CM && current_distance_cm > 0.5) {
      obstacle_detected = true;
      if (current_motion == "FORWARD") {
        stopMotors();
        current_motion = "OBSTACLE_DETECTED";
      }
    } else {
      obstacle_detected = false;
    }
  }

  // 2. Serial Command Processor
  while (Serial.available() > 0) {
    char cmd = Serial.read();

    if (cmd == '\r' || cmd == '\n') continue;

    // Movement Commands
    if (cmd == ' ' || cmd == 'X' || cmd == 'x') {
      stopMotors();
      Serial.println("[ACTION] STOP");
    } 
    else if (cmd == 'W' || cmd == 'w' || cmd == 'F' || cmd == 'f') {
      moveForward(motor_speed);
      Serial.println("[ACTION] FORWARD");
    } 
    else if (cmd == 'S' || cmd == 's' || cmd == 'B' || cmd == 'b') {
      moveBackward(motor_speed);
      Serial.println("[ACTION] BACKWARD");
    } 
    else if (cmd == 'A' || cmd == 'a') {
      turnLeft(motor_speed);
      Serial.println("[ACTION] TURN LEFT");
    } 
    else if (cmd == 'D' || cmd == 'd') {
      turnRight(motor_speed);
      Serial.println("[ACTION] TURN RIGHT");
    } 
    // Calibrated Angle Turns
    else if (cmd == '1') executePhysicalTurn(90.0, true);
    else if (cmd == '2') executePhysicalTurn(90.0, false);
    else if (cmd == '3') executePhysicalTurn(180.0, true);
    else if (cmd == '4') executePhysicalTurn(180.0, false);
    else if (cmd == '5') executePhysicalTurn(45.0, true);
    else if (cmd == '6') executePhysicalTurn(45.0, false);
    else if (cmd == '7') executePhysicalTurn(135.0, true);
    else if (cmd == '8') executePhysicalTurn(135.0, false);
    // Speed adjustments
    else if (cmd == '+' || cmd == '=') {
      motor_speed = min(255, motor_speed + 20);
    } 
    else if (cmd == '-' || cmd == '_') {
      motor_speed = max(120, motor_speed - 20);
    } 
    // Zero IMU
    else if (cmd == 'Z' || cmd == 'z') {
      yaw_angle = 0.0;
    }
  }

  updateIMU();

  // 3. Telemetry Stream to Raspberry Pi (every 100ms)
  if (millis() - last_telemetry >= 100) {
    last_telemetry = millis();
    Serial.print("YAW:");
    Serial.print(yaw_angle, 1);
    Serial.print("|DIST:");
    Serial.print(current_distance_cm, 1);
    Serial.print("|OBST:");
    Serial.print(obstacle_detected ? "1" : "0");
    Serial.print("|STATE:");
    Serial.println(current_motion);
  }

  delay(5);
}
