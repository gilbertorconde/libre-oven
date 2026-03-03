# Libre Oven -- Project Build Guide

This document covers everything needed to physically build the Libre Oven controller: which oven was used, how it was wired, what parts are needed, GPIO pinout, 3D-printed parts, and the custom PCB.

For firmware details (state machine, PID tuning, ESPHome configuration), see [`esp32/README.md`](esp32/README.md).
For the Home Assistant frontend card, see the [root README](../README.md).

---

## Table of Contents

- [The Oven](#the-oven)
- [Parts List](#parts-list)
- [System Architecture](#system-architecture)
- [PCB](#pcb)
- [Wiring Overview](#wiring-overview)
- [GPIO Pinout](#gpio-pinout)
- [Temperature Sensor (MAX31865 + PT100)](#temperature-sensor-max31865--pt100)
- [Buzzer Wiring](#buzzer-wiring)
- [3D Printed Parts](#3d-printed-parts)
- [Assembly Steps](#assembly-steps)
- [Firmware Installation](#firmware-installation)
- [Safety](#safety)
- [Build Photos](#build-photos)
- [Folder Structure](#folder-structure)

---

## The Oven

**Meireles MF 7606 X** -- a built-in electric multifunction oven (55 L, Class A).

| Spec | Value |
|------|-------|
| Oven type | Electric multifunction (6 modes) |
| Top element | 1100 W |
| Bottom element | 1500 W |
| Grill | 1500 W |
| Max power | 2654 W |
| Supply | 220-240 V / 50-60 Hz |
| Cooling | Tangential cooling fan |
| Dimensions (W x H x D) | 598 x 580 x 500 mm |

The oven's original mechanical timer and selector knob are replaced with the ESP32-S3 controller, rotary encoders, and a TFT display. The original thermal safety cutouts are kept in place.

Full oven specifications are in [`docs/meireles_mf_7606_x_info.md`](docs/meireles_mf_7606_x_info.md).

### Oven Heating Modes

| # | Mode | Elements |
|---|------|----------|
| 1 | Grill | Grill (1500 W) |
| 2 | Grill + Top | Grill + Top element |
| 3 | Bottom only | Bottom element (1500 W) |
| 4 | Top + Bottom | Top (1100 W) + Bottom (1500 W) |
| 5 | Convection | Top + Bottom + Fan |
| 6 | Fan grill | Grill + Bottom + Fan |

With Libre Oven you can freely combine any elements and the fan, beyond the original 6-mode limitation.

---

## Parts List

| Qty | Component | Notes |
|-----|-----------|-------|
| 1 | ESP32-S3-DevKitC-1 (WROOM-1-N16R8) | 16 MB Flash, 8 MB PSRAM |
| 1 | 2.4" ILI9341 TFT LCD | SPI, 240x320 |
| 1 | MAX31865 breakout board | For PT100 RTD, 430 Ω reference resistor |
| 1 | 3-wire PT100 RTD probe | Oven-rated, high temperature |
| 3 | Rotary encoders with push button | KY-040 or equivalent |
| 5 | Solid State Relays (SSR) | Rated for 230 V AC / 10 A minimum |
| 1 | Active buzzer | 3.3 V or 5 V |
| 1 | NPN transistor (2N2222 or similar) | For buzzer drive |
| 1 | 1 kΩ resistor | Base resistor for buzzer transistor |
| 1 | Libre Oven PCB | See [`pcb/`](pcb/) |
| -- | Hookup wire, connectors, heatshrink | As needed |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     ESP32-S3-DevKitC-1                   │
│                                                          │
│  SPI Bus 1 ──── MAX31865 ──── PT100 RTD (oven cavity)   │
│  SPI Bus 2 ──── ILI9341 TFT Display                     │
│                                                          │
│  GPIO ──── 3x Rotary Encoders (Timer, Temp, Mode)        │
│  GPIO ──── 5x SSR Outputs (Top, Bottom, Grill, Fan, Light)│
│  GPIO ──── Buzzer (via NPN transistor)                   │
│  GPIO48 ── On-board status LED                           │
│                                                          │
│  Wi-Fi ──── Home Assistant (ESPHome API)                 │
└─────────────────────────────────────────────────────────┘
```

---

## PCB

The custom PCB design is in [`pcb/libre_oven_devkit.eprj`](pcb/libre_oven_devkit.eprj) (EasyEDA format).

Revision history (backups in `pcb/libre_oven_devkit_backup/`):

| Version | Date | Notes |
|---------|------|-------|
| v37 | 2026-02-06 | Initial layout |
| v48 | 2026-02-06 | Refinements |
| v63 | 2026-02-06 | Further revisions |
| v77 | 2026-02-27 | Latest revision |

The PCB connects the ESP32-S3 devkit to all peripherals: SSR outputs, encoder inputs, SPI buses for the display and temperature sensor, and the buzzer circuit.

---

## Wiring Overview

### High-Level Connections

```
              ┌── SSR ── Top element (230V)
              ├── SSR ── Bottom element (230V)
              ├── SSR ── Grill element (230V)
ESP32-S3 ────├── SSR ── Convection fan (230V)
  (3.3V)     ├── SSR ── Oven light + cooling fan (230V)
              ├── Buzzer (via NPN)
              ├── ILI9341 TFT (SPI)
              ├── MAX31865 + PT100 (SPI)
              └── 3x Rotary encoders
```

The SSRs switch 230 V AC loads. The ESP32 drives the SSR control inputs with 3.3 V GPIO signals. Always ensure proper isolation between the mains side and the low-voltage control side.

---

## GPIO Pinout

### SPI Bus 1 -- MAX31865 (PT100 RTD)

| Signal | GPIO | MAX31865 Pin |
|--------|------|-------------|
| MOSI (SDI) | GPIO16 | SDI |
| MISO (SDO) | GPIO19 | SDO |
| CLK (SCK) | GPIO18 | CLK |
| CS | GPIO17 | CS |

### SPI Bus 2 -- ILI9341 TFT Display

| Signal | GPIO | Display Pin |
|--------|------|------------|
| SCK (CLK) | GPIO14 | SCL |
| MOSI (DIN) | GPIO13 | SDA |
| DC | GPIO12 | DC |
| CS | GPIO15 | CS |
| Backlight | GPIO11 | BL |
| RST | -- | Not connected (software reset) |

### Rotary Encoders

| Encoder | A | B | Button (SW) |
|---------|---|---|-------------|
| Mode | GPIO39 | GPIO38 | GPIO40 |
| Temperature | GPIO42 | GPIO41 | GPIO47 |
| Timer | GPIO10 | GPIO9 | GPIO8 |

All encoder pins use internal pull-ups (`INPUT_PULLUP`).

### SSR Outputs

| Output | GPIO | Load |
|--------|------|------|
| Top element | GPIO1 | Heating element (1100 W) |
| Bottom element | GPIO2 | Heating element (1500 W) |
| Grill | GPIO3 | Grill element (1500 W) |
| Fan | GPIO4 | Convection fan motor |
| Light | GPIO5 | Oven light + internal cooling fan |

> **Note**: GPIO3 is a strapping pin on the ESP32-S3. It works fine for output but requires care -- avoid external pull-up/pull-down resistors on this pin.

### Other

| Function | GPIO |
|----------|------|
| Buzzer | GPIO6 (via NPN transistor) |
| Status LED | GPIO48 (on-board) |

---

## Temperature Sensor (MAX31865 + PT100)

### PT100 Probe Wiring (3-Wire)

A 3-wire PT100 typically has 2 blue wires and 1 red wire:

| Wire | Board Terminal | Notes |
|------|---------------|-------|
| Red | RTD+ | Signal wire |
| Blue 1 | RTD- | Return wire |
| Blue 2 | F+ | Compensation wire (3-wire bridge) |

### MAX31865 Board Setup

1. **Solder the 2/3-wire jumper** (bridge the 2/3 pads).
2. **Set the 3-4 config jumper** for 3-wire mode (bridge pads 3-4, leave pad 2 open).
3. Leave the 2-wire jumper unsoldered.

### Verification with Multimeter

Before powering on, verify these readings at the board terminals:

| Measurement | Expected |
|-------------|----------|
| F+ to RTD- | ~0 Ω (just wire resistance) |
| RTD+ to RTD- | ~108 Ω at room temperature |
| Reference resistor (board) | ~430 Ω |

### Configuration Values

| Parameter | Value |
|-----------|-------|
| Reference resistance | 430 Ω |
| RTD nominal resistance | 100 Ω |
| RTD wires | 3 |
| Mains filter | 50 Hz (Europe) |
| Update interval | 1 s |

---

## Buzzer Wiring

The buzzer is driven through an NPN transistor (low-side switch) to avoid drawing too much current from the GPIO:

```
ESP32 GPIO6 ── 1kΩ ── Base (NPN)
                       Emitter ── GND
                       Collector ── Buzzer (-)
                                   Buzzer (+) ── 3.3V (or 5V)
```

Use a 2N2222, BC547, or similar NPN transistor.

---

## 3D Printed Parts

Printable STL files and FreeCAD source files are in [`cad/`](cad/).

| File | Description |
|------|-------------|
| `lcd-box-Body.stl` | Enclosure for the 2.4" ILI9341 TFT display |
| `lcd-box.FCStd` | FreeCAD source for the display enclosure |
| `oven-rotery-holder-Body.stl` | Adapter to mount the new rotary encoders into the original oven knob holes |
| `oven-rotery-holder.FCStd` | FreeCAD source for the encoder adapter |

The **rotary encoder holder** adapts the smaller KY-040 rotary encoders to fit into the larger holes left by the original oven knobs. Print in a heat-resistant material (PETG or ABS recommended) since these are mounted on the oven front panel.

The **LCD box** is a simple enclosure that holds the TFT display and can be mounted on or near the oven front.

---

## Assembly Steps

### 1. Prepare the Oven

1. **Disconnect the oven from mains power.**
2. Remove the original control knobs and timer/selector mechanism.
3. Identify the wiring for each heating element, the fan, the light, and the cooling fan. Label each wire.
4. Keep the thermal safety cutouts (thermostat, thermal fuse) in the circuit.

### 2. Build the Controller Board

1. Get the PCB fabricated from the EasyEDA project in [`pcb/`](pcb/).
2. Solder all components to the PCB.
3. Mount the ESP32-S3-DevKitC-1 on the board.
4. Connect the SSRs to the PCB output headers.

### 3. Wire the SSRs

1. Mount the 5 SSRs in a ventilated location with heatsinks if needed.
2. Connect the SSR control inputs to the PCB outputs (3.3 V logic from ESP32).
3. Wire each SSR's load side in series with the corresponding oven element:
   - SSR 1 → Top element
   - SSR 2 → Bottom element
   - SSR 3 → Grill element
   - SSR 4 → Convection fan
   - SSR 5 → Oven light + internal cooling fan

### 4. Install the Temperature Sensor

1. Route the PT100 probe into the oven cavity (use an existing hole or drill one).
2. Connect the probe to the MAX31865 breakout board (see [PT100 wiring](#pt100-probe-wiring-3-wire)).
3. Verify readings with a multimeter before connecting to the ESP32.
4. Connect the MAX31865 to the ESP32 via SPI Bus 1.

### 5. Mount the Encoders and Display

1. Print the rotary encoder holders (`oven-rotery-holder-Body.stl`).
2. Mount 3 rotary encoders in the oven front panel using the printed adapters.
3. Print the LCD box (`lcd-box-Body.stl`) and mount the TFT display.
4. Connect encoders and display to the PCB.

### 6. Wire the Buzzer

1. Assemble the NPN transistor circuit (see [Buzzer wiring](#buzzer-wiring)).
2. Mount the buzzer where it can be heard from outside the oven.

### 7. Final Checks

1. Verify all connections with a multimeter (continuity, no shorts between mains and low-voltage).
2. Check that SSRs switch correctly with a test signal before connecting to mains.
3. Ensure the cooling fan circuit is wired to the light SSR output.

---

## Firmware Installation

1. Create a `secrets.yaml` in the `esp32/` folder with your Wi-Fi and API credentials (there's no example template -- just define `wifi_ssid`, `wifi_password`, `api_encryption_key`, and `ota_password`).
2. Open the **ESPHome Dashboard** (Home Assistant add-on or standalone).
3. Import `esp32/libre_oven_s3.yaml`.
4. First flash via USB (connect ESP32-S3 to your computer with a USB-C cable).
5. Subsequent updates can be done via OTA (Wi-Fi).

For PID tuning, autotune setup, state machine details, and Home Assistant entity reference, see [`esp32/README.md`](esp32/README.md).

---

## Safety

**This project involves 230 V AC mains voltage and high temperatures. Serious injury or death can result from improper wiring.**

- **Always** disconnect the oven from mains before working on any wiring.
- Ensure proper isolation between mains (230 V) and low-voltage (3.3 V) circuits.
- **Keep the original thermal safety cutouts** in the circuit -- they are your last line of defense.
- The software cooling fan safety (keeps the internal fan on until the oven drops below 50 °C) is a convenience feature, not a safety guarantee.
- Use SSRs rated for at least 10 A / 250 V AC with proper heatsinking.
- Test everything with dummy loads (light bulbs) before connecting real heating elements.
- If in doubt, consult a qualified electrician.

---

## Build Photos

![](docs/photos/PXL_20260202_151951195.jpg)
![](docs/photos/PXL_20260202_153252473.jpg)
![](docs/photos/PXL_20260202_154727560.MP.jpg)
![](docs/photos/PXL_20260202_161655128.jpg)
![](docs/photos/PXL_20260202_183729053.jpg)
![](docs/photos/PXL_20260202_184024820.jpg)
![](docs/photos/PXL_20260202_184401378.jpg)
![](docs/photos/PXL_20260202_190155286.PORTRAIT.ORIGINAL.jpg)
![](docs/photos/PXL_20260202_190522438.jpg)
![](docs/photos/PXL_20260203_112419428.jpg)
![](docs/photos/PXL_20260203_184312340.jpg)
![](docs/photos/PXL_20260203_184325044.jpg)
![](docs/photos/PXL_20260203_184329051.jpg)
![](docs/photos/PXL_20260204_192427574.jpg)
![](docs/photos/PXL_20260204_192440708.jpg)
![](docs/photos/PXL_20260204_192448583.jpg)
![](docs/photos/PXL_20260204_192452966.MP.jpg)
![](docs/photos/PXL_20260221_125709227.jpg)
![](docs/photos/PXL_20260221_125713332.jpg)
![](docs/photos/PXL_20260221_125715156.jpg)
![](docs/photos/PXL_20260221_150401391.jpg)
![](docs/photos/PXL_20260221_150403864.jpg)
![](docs/photos/PXL_20260222_132813010.MP.jpg)
![](docs/photos/PXL_20260222_132817371.jpg)
![](docs/photos/PXL_20260222_142158250.jpg)
![](docs/photos/PXL_20260223_000019038.jpg)
![](docs/photos/PXL_20260223_004424296.jpg)
![](docs/photos/PXL_20260226_140238040.jpg)
![](docs/photos/PXL_20260226_141757866.jpg)
![](docs/photos/PXL_20260226_162703229.jpg)
![](docs/photos/PXL_20260226_162710638.jpg)

---

## Folder Structure

```
project/
├── esp32/
│   ├── libre_oven_s3.yaml    # ESPHome firmware configuration
│   ├── main_screen.svg       # Display graphics source
│   └── README.md             # Firmware details (state machine, PID, entities)
├── cad/
│   ├── lcd-box-Body.stl      # Display enclosure (printable)
│   ├── lcd-box.FCStd         # Display enclosure (FreeCAD source)
│   ├── oven-rotery-holder-Body.stl  # Encoder adapter (printable)
│   └── oven-rotery-holder.FCStd     # Encoder adapter (FreeCAD source)
├── pcb/
│   ├── libre_oven_devkit.eprj       # PCB design (EasyEDA)
│   └── libre_oven_devkit_backup/    # PCB revision backups
├── docs/
│   ├── meireles_mf_7606_x_info.md  # Original oven specifications
│   └── photos/                      # Build reference photos
└── README.md                        # This file
```
