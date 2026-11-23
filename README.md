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
- **Food probe support** — optional NTC 100K probe for food temperature monitoring with auto-stop when target reached. UI elements only appear when probe is connected.
- **Child lock** — lock/unlock the oven's physical knobs from the card; a padlock toggle in the header reflects the current state (also settable on the device by holding the Mode + Temperature knobs).
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

**Base name (recommended):** Pass the device base name; the card auto-discovers all entities:

```yaml
type: custom:libre-oven-card
base_name: libre_oven
```

The base name is the ESPHome device name with hyphens replaced by underscores (e.g. `libre-oven` → `libre_oven`). All sensors, numbers, switches, and buttons are derived automatically. Override specific entities if needed:

```yaml
type: custom:libre-oven-card
base_name: libre_oven
entities:
  set_temperature: number.custom_temp_entity  # override just this one
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
  start_cooking: button.libre_oven_start_cooking
  # Element visual-state sensors (0=off, 1=selected, 2=armed/active, 3=heating)
  top_element_state: sensor.libre_oven_top_element_state
  bottom_element_state: sensor.libre_oven_bottom_element_state
  grill_element_state: sensor.libre_oven_grill_element_state
  fan_element_state: sensor.libre_oven_fan_element_state
  frame_state: sensor.libre_oven_oven_frame_state
  # Active element flags (for draft-change detection)
  active_top_element: binary_sensor.libre_oven_active_top_element
  active_bottom_element: binary_sensor.libre_oven_active_bottom_element
  active_grill_element: binary_sensor.libre_oven_active_grill_element
  active_fan_element: binary_sensor.libre_oven_active_fan_element
  # Food probe (optional — only active when probe is physically connected)
  food_probe_temperature: sensor.libre_oven_food_probe_temperature
  food_probe_connected: binary_sensor.libre_oven_food_probe_connected
  food_target_temperature: number.libre_oven_food_target_temperature
  cook_mode: number.libre_oven_cook_mode
  # Child lock (optional)
  kids_lock: switch.libre_oven_kids_lock
  # Temperature fault (optional)
  temperature_fault: binary_sensor.libre_oven_temperature_fault
```

If your device name differs from `libre_oven`, use `base_name: your_device_name` or update the entity IDs in the explicit config.

---

## Card Layout

Version 3 is a dark, app-style card. Every control is visible at once; there are no bottom sheets.

- **Wide (700 px and up, e.g. a dialog or a wide column):** two columns. On the left are the oven drawing, the oven and target temperatures, and the food probe. On the right are the controls.
- **Narrow (a phone):** one column. While a program runs, its timer comes first.

### Header

- Title and a one-line summary (elements and temperature of the running program, or the draft when idle).
- **State badge**: Idle (grey), Waiting (yellow), Preheating (red), Ready (green), Cooking (green), **Fault** (red), **Offline** (grey).
- **Child lock**: padlock button, amber when locked. Tap to lock or unlock the physical knobs. Shown only when the `kids_lock` entity exists.

### Offline and fault

- **Offline** (the oven's entities are unavailable: power loss or Wi-Fi):
  - a grey banner;
  - every control is dimmed and disabled;
  - Start and Cancel can't be pressed.
- **Fault** (`temperature_fault` is on):
  - a red banner says heating is blocked and how to clear it (check the sensor, then press a knob on the oven);
  - Start and Start cooking are disabled;
  - the draft can still be edited.

Failed actions, for example when the oven drops off the network, show a Home Assistant notification instead of failing silently.

### Oven drawing

The top and bottom elements, the grill and a full-size convection fan on the back wall:

- grey: off
- white: selected in the draft
- amber: armed or active (program running, SSR cycling); the fan spins while active
- red with a glow: heating (SSR on)

The cavity glows while the oven frame is active.

### Temperature history

Tap the **Oven** temperature tile:
- **During a program:** opens Home Assistant's History page starting at the program's preheat (found from the recorder).
- **Otherwise:** opens the entity's more-info dialog.

From the compact variant's dialog, the dialog closes first.

### Controls

- **Program timer** (only while a program runs), a ring plus text:
  - Waiting: the delay countdown and when it starts.
  - Preheating: oven temperature against the target.
  - Ready: a **Start cooking** button.
  - Cooking: time left and the finish time, or food against target temperature in probe mode.
- **Recipes** (optional, idle only): one tap fills in the elements, temperature, time and probe target. It never starts the oven.
- **Temperature**: a drag slider in 5 °C steps, plus −/+ buttons that snap to the nearest 5 °C.
- **Elements**: Top, Bottom, Grill and Fan toggles, in any combination.
- **Finish by**:
  - The cook mode is shown, not chosen: the oven picks probe mode while a probe is plugged in and keeps it for the run.
  - In timer mode, cook time in minutes (−10/−1/+1/+10 or type it in); 0 minutes means until stopped.
  - In probe mode, the food target temperature. If the probe stops reading mid-cook, it says so.
- **Start** (idle): Now, in 30 min, in 1 h, or **At…** a clock time. These set `start_delay`, clamped to the entity's min, max and step. While waiting, the delay becomes a stepper.
- **Actions**: **Start** when idle (needs at least one element), **Cancel program** while running.

### Draft-change feedback

When a program is running, a draft value that differs from the running program shows:

- **Temperature**: old value struck through → new value in amber, on the tile and in the slider header.
- **Cook time / delay**: old → new in the block header.
- **Elements**: a `+ add` or `− off` flag on the element button.
- An amber bar, "N changes not applied yet", lists them, with an **Update** button that applies the program.

Changes are hidden for 5 s after a program starts, while the device's sensors catch up.

### Compact variant

`variant: compact` shows a glance card for a room view or a narrow column:

- state badge;
- oven temperature (→ target while running);
- a small oven drawing;
- a progress bar (delay, preheat, cook time or probe);
- **Full controls**, which opens the full card in a dialog over the page (close with ✕, Esc or a tap outside).

When idle, **Set up** opens the same dialog.

```yaml
type: custom:libre-oven-card
base_name: libre_oven
variant: compact
```

### Recipes

```yaml
type: custom:libre-oven-card
base_name: libre_oven
recipes:
  - { name: Bread, icon: mdi:bread-slice-outline, elements: [top, bottom], temperature: 220, duration: 35 }
  - { name: Pizza, icon: mdi:pizza, elements: [bottom, fan], temperature: 250, duration: 12 }
  - { name: Roast, icon: mdi:food-drumstick-outline, elements: [top, bottom, fan], temperature: 190, probe_target: 65 }
```

| Key | Description |
|---|---|
| `name` | Label on the chip |
| `icon` | Optional `mdi:` icon |
| `elements` | Any of `top`, `bottom`, `grill`, `fan`; the others are switched off |
| `temperature` | Oven temperature (°C) |
| `duration` | Cook time (minutes), used in timer mode |
| `probe_target` | Food target (°C), used in probe mode (the oven picks the mode from probe presence) |

A recipe chip is highlighted while the draft matches it.

### Options

| Option | Default | Description |
|---|---|---|
| `base_name` / `entities` | — | Device base name for auto-discovery, and/or explicit entity overrides (see above) |
| `title` | `Libre Oven` | Card title |
| `variant` | `full` | `full` or `compact` |
| `recipes` | none | List of recipes (see above) |

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
| `start_cooking`        | button  | Resume from READY to COOKING    |

### Optional food probe entities (only active when NTC probe connected)

| Entity Key                | Type          | Description                                    |
|--------------------------|---------------|------------------------------------------------|
| `food_probe_temperature` | sensor        | Current food probe temperature (NTC 100K)      |
| `food_probe_connected`   | binary_sensor | Whether the food probe jack is plugged in       |
| `food_target_temperature`| number        | Target food temperature for probe-mode auto-stop|
| `cook_mode`              | number        | 0 = timer mode, 1 = probe mode (read-only, set by the oven) |

### Optional child lock entity

| Entity Key  | Type   | Description                                          |
|-------------|--------|------------------------------------------------------|
| `kids_lock` | switch | Locks/unlocks the oven's physical knobs (HA stays usable) |

### Optional temperature fault entity

| Entity Key          | Type          | Description                                              |
|---------------------|---------------|----------------------------------------------------------|
| `temperature_fault` | binary_sensor | Oven sensor fault: the card shows a red **Fault** chip and banner, and disables Start |

### Optional state sensors (for visual element feedback)

| Entity Key              | Type   | Description                              |
|------------------------|--------|------------------------------------------|
| `top_element_state`    | sensor | 0=off, 1=selected, 2=armed, 3=heating   |
| `bottom_element_state` | sensor | 0=off, 1=selected, 2=armed, 3=heating   |
| `grill_element_state`  | sensor | 0=off, 1=selected, 2=armed, 3=heating   |
| `fan_element_state`    | sensor | 0=off, 1=selected, 2=active             |
| `frame_state`          | sensor | 0=off, 1=selected, 2=active             |

---

## Changelog

**3.0.1**
- Fixed: the convection fan now spins around its hub instead of wobbling.
- On a narrow card the state badge moves into the subtitle, so the header buttons keep their size and the title keeps its room.

**3.0.0**
- New dark, app-style design. All controls are visible at once and the bottom sheets are gone. The layout is two columns when wide and one column on a phone.
- The oven drawing has a full-size convection fan.
- Temperature is now a drag slider.
- New: quick start-delay chips and an "At…" clock time.
- New: optional `recipes`.
- New: `variant: compact` glance card with a Full controls dialog.
- Keeps 2.4.0's offline and fault states, notifications on failed actions, the temperature history tap and display-only cook mode.
- Fixed: the draft-change hint no longer hides for 5 s when the card is opened while a program is already running.
- Number limits now come from the entities' min, max and step.

---

## Requirements

- Home Assistant 2023.4 or newer
- The [**Libre Oven**](https://github.com/gilbertorconde/libre-oven) ESPHome firmware flashed and connected
- No additional HACS frontend cards required

---

## Hardware Build Guide

For the full hardware build guide (ESP32-S3 wiring, PCB, 3D-printed parts, oven reference), see [`project/README.md`](project/README.md).

For firmware details (state machine, PID tuning, ESPHome configuration), see [`project/esp32/README.md`](project/esp32/README.md).
