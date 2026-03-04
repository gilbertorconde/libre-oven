# Libre Oven Card for Home Assistant

`libre-oven-card` is a custom Lovelace card that provides full control and monitoring of the **Libre Oven** — an open-source ESP32-S3 smart oven controller running ESPHome.

> **Required firmware:** This card is designed for the [**Libre Oven**](https://github.com/gilbertorconde/libre-oven) ESPHome firmware. Flash the ESP32-S3 firmware from [`project/esp32/`](project/esp32/) before using this card.

Key features at a glance:

- **Live oven status** — state label with color coding (Idle / Waiting / Preheating / Ready / Cooking), current temperature, target temperature, and countdown timer.
- **SVG oven visualization** — real-time element states: gray (off), white (selected), yellow (armed/active), red (heating).
- **Temperature control** — slider/input for target temperature.
- **Timer controls** — cook duration and start delay inputs.
- **Element toggles** — independently control Top, Bottom, Grill, and Fan elements beyond the original 6-mode limitation.
- **Program actions** — Apply Program (start/update) and Cancel Program buttons.
- **Device auto-discovery** — pass any entity from the oven device and the card discovers all others automatically.
- **Zero external dependencies** — single vanilla-JS file.

## Credits

Author: [gil](https://github.com/gilbertorconde) — 2026

---

## Installation

### Option A — HACS (recommended)

1. In Home Assistant, open **HACS → Frontend**.
2. Click the three-dot menu (⋮) in the top-right and choose **Custom repositories**.
3. Paste `https://github.com/gilbertorconde/libre-oven` and select **Dashboard** as the category.
4. Click **Add**, then search for **Libre Oven Card** and install it.
5. Reload your browser / clear the cache.

[![Add to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=gilbertorconde&repository=libre-oven&category=dashboard)

### Option B — Manual

1. Download `libre-oven-card.js` from the [latest release](https://github.com/gilbertorconde/libre-oven/releases/latest).
2. Copy it to `/config/www/libre-oven/libre-oven-card.js`.
3. Add the following under **Settings → Dashboards → Resources**:

```yaml
resources:
  - url: /local/libre-oven/libre-oven-card.js
    type: module
```

### Add the card to your dashboard

**Device-based (recommended):** Pass any entity from the oven device; the card discovers the rest automatically:

```yaml
type: custom:libre-oven-card
device: sensor.libre_oven_oven_temperature
```

**Explicit entities:** For custom setups, paste the full entity map:

```yaml
type: custom:libre-oven-card
title: Libre Oven
entities:
  oven_temperature: sensor.libre_oven_oven_temperature
  active_temperature: sensor.libre_oven_active_temperature
  timer_state: sensor.libre_oven_timer_state
  timer_state_code: sensor.libre_oven_timer_state_code
  active_countdown: sensor.libre_oven_active_countdown
  delay_remaining: sensor.libre_oven_delay_remaining
  cook_remaining: sensor.libre_oven_cook_remaining
  active_cook_total: sensor.libre_oven_active_cook_total
  active_delay_total: sensor.libre_oven_active_delay_total
  set_temperature: number.libre_oven_set_temperature
  cook_duration: number.libre_oven_cook_duration
  start_delay: number.libre_oven_start_delay
  top_element_selected: switch.libre_oven_top_element_selected
  bottom_element_selected: switch.libre_oven_bottom_element_selected
  grill_element_selected: switch.libre_oven_grill_element_selected
  fan_selected: switch.libre_oven_fan_selected
  apply_program: button.libre_oven_apply_program
  cancel_program: button.libre_oven_cancel_program
  # Element visual-state sensors (0=off, 1=selected, 2=armed/active, 3=heating)
  top_element_state: sensor.libre_oven_top_element_state
  bottom_element_state: sensor.libre_oven_bottom_element_state
  grill_element_state: sensor.libre_oven_grill_element_state
  fan_element_state: sensor.libre_oven_fan_element_state
  frame_state: sensor.libre_oven_oven_frame_state
```

If your device name differs from `libre_oven`, update the entity IDs accordingly.

---

## Card Layout

The card is divided into three sections:

### Top Section — Live Status (read-only from ESP32)

Mirrors the physical oven display:

- **State label** with color coding:
  - Idle: white
  - Waiting: yellow (#e5c000)
  - Preheating: red (#e01e00)
  - Ready: green (#4caf50)
  - Cooking: green (#4caf50)
- **Current oven temperature**
- **Target temperature** (active when program running, draft when idle)
- **Oven graphic** with SVG element visualization:
  - Gray: off
  - White: selected in draft
  - Yellow: armed/active (program running, SSR cycling)
  - Red: actively heating (SSR on)

### Middle Section — Tiles & Controls

Four tiles in a 2×2 grid, each opening a bottom-sheet for editing:

- **Timer tile**: Cook remaining countdown during COOKING, "Preheating"/"Oven ready" during those states, set cook total when WAITING. Shows the applied set value beneath.
- **Start Delay tile**: Delay remaining countdown during WAITING, "Done" once delay has passed. Shows the applied set value beneath.
- **Elements tile**: Active element summary (Top + Bottom + Grill + Fan).
- **Temperature tile**: Current temperature and set temperature side by side.

Controls in the sheets:
- **Temperature**: draggable arc thermostat with +/− 5°C buttons
- **Cook duration**: +/−1 and +/−10 minute buttons with numeric input
- **Start delay**: +/−1 and +/−10 minute buttons with numeric input
- **Element toggles**: Top, Bottom, Grill, Fan pill buttons

### Draft-Change Feedback

When a program is running, any change to draft values (temperature, duration, delay, or elements) is shown inline on the tiles:

- **Temperature**: old value with strikethrough → new value in accent color
- **Timer / Delay**: old set time with strikethrough → new time in accent color
- **Elements**: added elements in green, removed elements in red with strikethrough
- A pulsing **"DRAFT CHANGES — Press Update to apply"** hint appears above the action buttons

### Bottom Section — Actions

- **Apply Program**: Starts or updates the active program (equivalent to pressing the timer encoder button on the physical interface).
- **Cancel Program**: Stops the current program and clears the ESP32 draft.

---

## Timer State Codes

The card reads the `timer_state_code` sensor (numeric) for logic and the `timer_state` sensor (text) for display:

| Code | Text        | Card Display  | Color  |
|------|-------------|---------------|--------|
| 0    | IDLE        | Idle          | White  |
| 1    | WAITING     | Waiting       | Yellow |
| 2    | PREHEATING  | Preheating    | Red    |
| 3    | READY       | Ready         | Green  |
| 4    | COOKING     | Cooking       | Green  |

---

## Required Entities

| Entity Key              | Type    | Description                     |
|------------------------|---------|---------------------------------|
| `oven_temperature`     | sensor  | Current oven temperature        |
| `active_temperature`   | sensor  | Active target temperature       |
| `timer_state`          | sensor  | Timer state text                |
| `timer_state_code`     | sensor  | Timer state numeric code (0-4)  |
| `active_countdown`     | sensor  | Formatted countdown (HH:MM:SS) |
| `delay_remaining`      | sensor  | Delay remaining countdown       |
| `cook_remaining`       | sensor  | Cook remaining countdown        |
| `active_cook_total`    | sensor  | Active program cook total (min) |
| `active_delay_total`   | sensor  | Active program delay total (min)|
| `set_temperature`      | number  | Draft temperature control       |
| `cook_duration`        | number  | Draft cook duration (minutes)   |
| `start_delay`          | number  | Draft start delay (minutes)     |
| `top_element_selected` | switch  | Top element toggle              |
| `bottom_element_selected` | switch | Bottom element toggle        |
| `grill_element_selected` | switch | Grill element toggle           |
| `fan_selected`         | switch  | Fan toggle                      |
| `apply_program`        | button  | Apply/start program             |
| `cancel_program`       | button  | Cancel program                  |

### Optional state sensors (for visual element feedback)

| Entity Key              | Type   | Description                              |
|------------------------|--------|------------------------------------------|
| `top_element_state`    | sensor | 0=off, 1=selected, 2=armed, 3=heating   |
| `bottom_element_state` | sensor | 0=off, 1=selected, 2=armed, 3=heating   |
| `grill_element_state`  | sensor | 0=off, 1=selected, 2=armed, 3=heating   |
| `fan_element_state`    | sensor | 0=off, 1=selected, 2=active             |
| `frame_state`          | sensor | 0=off, 1=selected, 2=active             |

---

## Requirements

- Home Assistant 2023.4 or newer
- The [**Libre Oven**](https://github.com/gilbertorconde/libre-oven) ESPHome firmware flashed and connected
- No additional HACS frontend cards required

---

## Hardware Build Guide

For the full hardware build guide (ESP32-S3 wiring, PCB, 3D-printed parts, oven reference), see [`project/README.md`](project/README.md).

For firmware details (state machine, PID tuning, ESPHome configuration), see [`project/esp32/README.md`](project/esp32/README.md).
