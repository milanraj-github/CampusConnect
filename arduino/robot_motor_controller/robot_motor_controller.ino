/*
 * Campus Connect - Integrated Robot Controller with Robust HC-SR04 & MPU-6050
 * 
 * Pin Connections:
 *   HC-SR04 Ultrasonic Sensor:
 *     VCC  -> Arduino 5V
 *     GND  -> Arduino GND
 *     TRIG -> Arduino D12
 *     ECHO -> Arduino D4   <-- (Changed from D13 to D4 to avoid Pin 13 LED interference!)
 * 
 *   MPU-6050:
 *     VCC -> 5V | GND -> GND | SCL -> A5 | SDA -> A4 | AD0 -> GND
 * 
 *   L298N Motor Driver:
 *     ENA -> D5 | ENB -> D6 | IN1 -> D8 | IN2 -> D9 | IN3 -> D10 | IN4 -> D11
 */

#include <Wire.h>

// --- HC-SR04 Ultrasonic Pins ---
const int TRIG_PIN = 12;
const int ECHO_PIN = 4; // Connected to D4 for 100% clean echo pulses

const float OBSTACLE_THRESHOLD_CM = 25.0; // Distance in cm to trigger obstacle alert & auto-stop

// --- L298N Motor Pins ---
const int ENA = 5;
const int IN1 = 8;
const int IN2 = 9;
const int IN3 = 10;
const int IN4 = 11;
const int ENB = 6;

int motor_speed = 200;

// Motor Direction Flags
bool INVERT_LEFT_MOTOR  = true;
bool INVERT_RIGHT_MOTOR = true;

// Calibration scale (physical deg * 0.5 = sensor target deg)
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

// --- Low Level Motor Drivers ---
void setLeftMotor(int speed, bool forward) {
  if (INVERT_LEFT_MOTOR) forward = !forward;
  if (speed == 0) {
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
  if (speed == 0) {
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

// --- High Level Motion Functions ---
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
  setLeftMotor(spd, true);   // Left wheels Forward
  setRightMotor(spd, false); // Right wheels Reverse
  current_motion = "TURNING LEFT";
}

void turnRight(int spd) {
  setLeftMotor(spd, false);  // Left wheels Reverse
  setRightMotor(spd, true);  // Right wheels Forward
  current_motion = "TURNING RIGHT";
}

// Robust Ultrasonic Distance Measurement (3-sample filter)
float readUltrasonicDistance() {
  long sum = 0;
  int valid_samples = 0;

  for (int i = 0; i < 3; i++) {
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    // Timeout 30000us ~ 5 meters
    long duration = pulseIn(ECHO_PIN, HIGH, 30000);
    if (duration > 50 && duration < 30000) {
      sum += duration;
      valid_samples++;
    }
    delayMicroseconds(500);
  }

  if (valid_samples == 0) {
    return 999.0;
  }
  long avg_duration = sum / valid_samples;
  return (avg_duration * 0.0343) / 2.0; // cm
}

// Update IMU
void updateIMU() {
  unsigned long current_time = millis();
  float dt = (current_time - prev_time) / 1000.0;
  prev_time = current_time;

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x47);
  byte err = Wire.endTransmission(false);

  if (err == 0) {
    byte bytesReceived = Wire.requestFrom(MPU_ADDR, 2, true);
    if (bytesReceived >= 2) {
      gyro_z_raw = (Wire.read() << 8) | Wire.read();
      gyro_z_deg_s = ((float)gyro_z_raw - gyro_z_offset) / 131.0;
      if (abs(gyro_z_deg_s) > 1.2) {
        yaw_angle += gyro_z_deg_s * dt;
      }
    }
  } else {
    Wire.clearWireTimeoutFlag();
  }
}

// Precision Closed-Loop Turn
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

  // Active reverse counter-pulse
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

void setup() {
  Serial.begin(115200);
  Wire.begin();

  Wire.setWireTimeout(10000, true);

  // Ultrasonic Pins
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // Motor Pins
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  stopMotors();

  // Wake MPU-6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0x00);
  Wire.endTransmission(true);

  // Calibrate Gyro
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

  Serial.println("\n[SYSTEM] Robot Ready! Ultrasonic on D12(TRIG)/D4(ECHO).");
}

unsigned long last_telemetry = 0;
unsigned long last_sonar = 0;

void loop() {
  // 1. Read Ultrasonic Distance every 50ms
  if (millis() - last_sonar >= 50) {
    last_sonar = millis();
    float dist = readUltrasonicDistance();
    if (dist > 0 && dist < 400.0) {
      current_distance_cm = dist;
    }

    if (current_distance_cm <= OBSTACLE_THRESHOLD_CM) {
      obstacle_detected = true;
      if (current_motion == "FORWARD") {
        stopMotors();
        current_motion = "OBSTACLE_DETECTED";
      }
    } else {
      obstacle_detected = false;
    }
  }

  // 2. Process incoming Serial Commands
  while (Serial.available() > 0) {
    char cmd = Serial.read();

    if (cmd == '\r' || cmd == '\n') continue;

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
    // --- Angle Turns ---
    else if (cmd == '1') executePhysicalTurn(90.0, true);
    else if (cmd == '2') executePhysicalTurn(90.0, false);
    else if (cmd == '3') executePhysicalTurn(180.0, true);
    else if (cmd == '4') executePhysicalTurn(180.0, false);
    else if (cmd == '5') executePhysicalTurn(45.0, true);
    else if (cmd == '6') executePhysicalTurn(45.0, false);
    else if (cmd == '7') executePhysicalTurn(135.0, true);
    else if (cmd == '8') executePhysicalTurn(135.0, false);
    else if (cmd == '+' || cmd == '=') {
      motor_speed = min(255, motor_speed + 20);
    } 
    else if (cmd == '-' || cmd == '_') {
      motor_speed = max(120, motor_speed - 20);
    } 
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
