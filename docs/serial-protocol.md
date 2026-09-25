# CampusConnect — Serial Communication Protocol

## Overview

The Raspberry Pi and Arduino Uno communicate across USB Serial at **115200 baud**, 8 data bits, no parity, 1 stop bit (8N1).

All commands and responses are newline-terminated (`\n`) ASCII strings.

---

## 1. Commands (Raspberry Pi -> Arduino)

| Command String | Parameters | Example | Description |
|---|---|---|---|
| `F` or `F:<speed>` | `speed`: 0–255 | `F:160\n` | Move both motors continuously forward. |
| `FT:<speed>:<ms>` | `speed`: 0–255<br>`ms`: integer | `FT:160:2000\n` | Move forward at `speed` for `ms` milliseconds, then actively brake and send `FC`. |
| `S` | None | `S\n` | Immediate motor stop / brake. |
| `L:<deg>` | `deg`: target angle | `L:90\n` | Turn left using MPU6050 yaw angle feedback. Brakes and sends `TC` when $\Delta\theta = 90^\circ$. |
| `R:<deg>` | `deg`: target angle | `R:90\n` | Turn right using MPU6050 yaw angle feedback. Brakes and sends `TC` when $\Delta\theta = 90^\circ$. |
| `U` | None | `U\n` | 180° turn around using MPU6050 feedback. |
| `E` | None | `E\n` | **Hardware Emergency Stop**: disable all PWM outputs immediately. |
| `D?` | None | `D?\n` | Request instantaneous HC-SR04 ultrasonic distance in cm. |
| `Y?` | None | `Y?\n` | Request current MPU6050 yaw angle in degrees. |
| `CAL_IMU` | None | `CAL_IMU\n` | Recalibrate and zero MPU6050 gyro offsets. |
| `P` | None | `P\n` | Heartbeat / ping. Expects `PONG\n`. |

---

## 2. Responses & Telemetry (Arduino -> Raspberry Pi)

| Message String | Example | Description |
|---|---|---|
| `D:<distance>` | `D:42.5\n` | Distance reading in centimeters from HC-SR04 ultrasonic sensor. |
| `OBS:1` | `OBS:1\n` | **Obstacle Alert Active**: obstacle detected within safe threshold ($<30\text{ cm}$). |
| `OBS:0` | `OBS:0\n` | **Obstacle Cleared**: path is unobstructed. |
| `TC` | `TC\n` | **Turn Complete**: MPU6050 confirmed target yaw angle has been reached. |
| `FC` | `FC\n` | **Forward Complete**: Timed forward movement duration finished. |
| `Y:<angle>` | `Y:89.7\n` | Current integrated yaw heading in degrees. |
| `PONG` | `PONG\n` | Heartbeat acknowledgement. |
| `OK` | `OK\n` | Command accepted and executed. |
| `ERR:<msg>` | `ERR:TURN_TIMEOUT\n` | Error notice (e.g. turn blocked or timeout exceeded). |
