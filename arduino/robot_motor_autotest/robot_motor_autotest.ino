/*
 * Campus Connect - Motor Auto Diagnostic Test
 * Tests Forward, Backward, Turn Left, Turn Right in a loop.
 */

const int ENA = 5;
const int IN1 = 8;
const int IN2 = 9;
const int IN3 = 10;
const int IN4 = 11;
const int ENB = 6;

const int SPEED = 200;

void stopMotors() {
  analogWrite(ENA, 0);
  analogWrite(ENB, 0);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW);
  digitalWrite(IN4, LOW);
}

void setup() {
  Serial.begin(115200);
  pinMode(ENA, OUTPUT);
  pinMode(ENB, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(IN3, OUTPUT);
  pinMode(IN4, OUTPUT);
  stopMotors();

  Serial.println("[START] Motor Diagnostic Starting in 3 seconds...");
  delay(3000);
}

void loop() {
  Serial.println(">> Moving FORWARD (2 sec)");
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  analogWrite(ENA, SPEED); analogWrite(ENB, SPEED);
  delay(2000);

  Serial.println(">> STOP (1 sec)");
  stopMotors();
  delay(1000);

  Serial.println(">> Moving BACKWARD (2 sec)");
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
  analogWrite(ENA, SPEED); analogWrite(ENB, SPEED);
  delay(2000);

  Serial.println(">> STOP (1 sec)");
  stopMotors();
  delay(1000);

  Serial.println(">> Turning LEFT (1.5 sec)");
  digitalWrite(IN1, LOW); digitalWrite(IN2, HIGH);
  digitalWrite(IN3, HIGH); digitalWrite(IN4, LOW);
  analogWrite(ENA, SPEED); analogWrite(ENB, SPEED);
  delay(1500);

  Serial.println(">> STOP (1 sec)");
  stopMotors();
  delay(1000);

  Serial.println(">> Turning RIGHT (1.5 sec)");
  digitalWrite(IN1, HIGH); digitalWrite(IN2, LOW);
  digitalWrite(IN3, LOW); digitalWrite(IN4, HIGH);
  analogWrite(ENA, SPEED); analogWrite(ENB, SPEED);
  delay(1500);

  Serial.println(">> STOP (3 sec)");
  stopMotors();
  delay(3000);
}
