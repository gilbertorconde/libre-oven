# ESPHome Configuration for Libre Oven (ESP32-S3)

This folder contains the ESPHome configuration for the Libre Oven Controller using an **ESP32-S3-DevKitC-1** with an **ESP32-S3-WROOM-1-N16R8** module (16 MB Flash, 8 MB PSRAM).

The firmware implements:

- A **multi-page UI** on a 2.4" ST7789V TFT.
- 3x rotary encoders with push buttons (Timer, Temperature, Mode).
- **PID temperature control** with slow PWM output for SSR-driven heating.
- Full **timer + preheat + ready + cook** state machine with resume-after-power-loss.
- **Cooling fan safety**: internal cooling fan stays on until oven temperature drops below a configurable threshold (default 50 °C).
- Safety gating so **heating only runs when timer, temperature and elements are correctly set**.
- **Fan-only mode**: fan can run without a temperature target or heating elements.
- Visual oven mimic, element status, Wi-Fi and light indicators.
- Optional **LED indicators** for elements and **buzzer** alerts.
- Optional **food probe** (NTC 100K) with timer/probe cook modes and auto-stop at target.
- **Child lock**: disable the physical knobs by holding Mode + Temperature; Home Assistant stays fully usable.
- **Home Assistant integration** via ESPHome API with PID tuning sensors and autotune button.

---

> **Hardware details** (GPIO pinout, wiring, PT100 setup, buzzer circuit, 3D parts, PCB) are in the [project build guide](../README.md).

---

## Temperature Sensor Filters

The raw PT100 readings pass through two filters before reaching the PID controller and display:

1. **Lambda filter**: Rejects NaN values and readings outside the 1-350 °C range. Invalid readings are discarded (not clamped to 0).
2. **Median filter**: Window size 5, publishes every reading. Smooths out occasional noise spikes from electrical interference.

---

## PID Temperature Control

Temperature regulation uses ESPHome's **PID climate** component instead of simple hysteresis, providing smoother and more accurate control.

### Architecture

```
PID Climate ──> Slow PWM Output ──> SSR Relays (Top/Bottom/Grill)
     ↑                                    │
     │                                    ↓
PT100 Sensor ◄──────────── Oven Temperature
```

- **PID climate** (`pid_climate`): Calculates 0-100% heat output based on current vs target temperature.
- **Slow PWM** (`pid_heat_output`): Converts the continuous PID output to time-proportioned ON/OFF cycles for the SSRs. Period: **10 s** (e.g., 60% output = 6 s ON, 4 s OFF).
- The state machine controls **when** heating is allowed; the PID controls **how much** power is applied.

### PID Parameters

Current tuned values (via autotune with "Some Overshoot PID" rule):

- Kp: `0.03614`
- Ki: `0.00018`
- Kd: `2.80257`
- Output averaging samples: `5`
- Derivative averaging samples: `5`

### PID Autotune

A **PID Autotune** button is exposed to Home Assistant. To run autotune:

1. Set a program with heating elements and a target temperature (e.g., 200 °C).
2. Apply the program so the oven is heating.
3. Press the "PID Autotune" button in Home Assistant (found under Developer Tools > Actions > Button press, or in the device page).
4. The autotune will deliberately oscillate the temperature above and below the setpoint. This can take 30-60+ minutes depending on the oven.
5. When complete, the optimal Kp/Ki/Kd values are printed to the device logs and can also be read from the PID sensor entities in Home Assistant.
6. Update the `control_parameters` in the YAML with the new values.

Autotune parameters:

- `positive_output: 0.7` (70% maximum heat output during autotune)
- `noiseband: 0.05` (tight noise band for accurate oscillation detection)

### PID Sensor Entities

The following sensors are exposed to Home Assistant for monitoring PID behavior:

- PID Heat Output (0-100%)
- PID Proportional term
- PID Integral term
- PID Derivative term
- PID Error (target - actual)
- PID Kp, Ki, Kd (current parameters)

---

## UI & Encoder Behaviour

The UI uses multiple pages controlled by the encoder buttons:

- **Page 0 -- Main Screen**
  - Left column:
    - State label with color: Idle (white), Waiting (yellow), Preheating (red), Ready (green), Cooking (green).
    - Timer display: countdown (`HH:MM:SS`), `PREHEATING` during preheat, `OVEN READY` / `Press to start` during ready state, `NO TIMER` when duration=0.
    - Below: total programmed cook time.
    - Current and target temperature labels.
  - Right side: oven graphic with elements, fan, light, and Wi-Fi indicator.
  - Bottom labels: `TIME` (left), `MODE` (center), `TEMPERATURE` (right) to show knob roles.

- **Page 1 -- Timer Screen**
  - `DURATION` (top):
    - Shows `NO TIMER` when `working_timer == 0`.
    - Otherwise HH:MM value.
  - `WHEN TO START` (bottom):
    - Shows `NOW` when `working_start_delay == 0`.
    - Otherwise HH:MM delay.
  - First press on timer button: edit `DURATION`.
  - Second press: switch to editing `WHEN TO START`.
  - Third press: confirm and return to main.

- **Page 2 -- Temperature Screen**
  - Big `SET TEMPERATURE` title.
  - Large `°C` value and horizontal bar from 0-280 °C.
  - Fine/coarse/coarser adjustments from the three knobs.

- **Page 3 -- Mode Screen**
  - List: `Top Element`, `Bottom Element`, `Grill`, `Fan`, `Back`.
  - Mode knob moves the arrow; press toggles the **desired** element flags.

- **Page 4 -- Apply Confirmation**
  - Confirms starting/updating a program.

- **Page 5 -- Cancel Confirmation**
  - Confirms canceling the current program.

- **Page 6 -- Child Lock Popup**
  - Shown when a knob is used while the child lock is active (`LOCKED` + unlock hint), or briefly as `UNLOCKED` feedback after unlocking.
  - Auto-dismisses back to the main screen ~5 s after the last knob touch.
  - See [Child Lock](#child-lock).

---

## Display (ST7789V)

The 2.4" TFT uses an **ST7789V** controller (240×320 native). The UI is drawn for **320×240 landscape**.

### Firmware configuration

```yaml
display:
  - platform: mipi_spi
    model: ST7789V
    spi_id: spi_display
    cs_pin: GPIO15
    dc_pin: GPIO12
    rotation: 270
    update_interval: 125ms
```

- Driver: ESPHome **`mipi_spi`**.
- **`rotation: 270`** — required for correct landscape orientation on this hardware; `rotation: 90` appears upside-down.
- No manual `dimensions` or `invert_colors` — defaults match this panel.
- UI accent colors are defined in the `color:` block (`on_element`, `hot_element`, etc.) as standard RGB hex values.

### Optional alignment tuning

`UI Offset X` / `UI Offset Y` number entities (±40 px) nudge the whole UI if needed; values persist across reboots.

### Encoder Step Patterns

On each page, the three encoders behave as:

- **Temperature page**:
  - Temp knob: ±1 °C.
  - Timer knob: ±10 °C.
  - Mode knob: ±5 °C.

- **Timer page**:
  - Temp knob: ±30 min (duration or start delay).
  - Mode knob: ±10 min.
  - Timer knob: ±1 min.

- **Mode page**:
  - Mode knob: navigate items.
  - Buttons toggle `desired_*` flags.

---

## Timer & Heating State Machine

Heating is **safety-gated** so elements only energize when:

- A **target temperature** is set (`active_temperature > 0`),
- At least one **heating element** (top/bottom/grill) is selected, and
- A program is in **preheat, ready, or cook** phase (`timer_state` 2, 3, or 4).

The **fan** can run independently without temperature or heating elements, only requiring an active program (`timer_state` 2, 3, or 4).

### High-level timer states

```mermaid
stateDiagram-v2
    [*] --> Idle

    Idle --> WaitingDelay: start_delay > 0
    Idle --> Preheating: needs_preheat && start_delay == 0
    Idle --> Cooking: !needs_preheat && start_delay == 0 (fan-only)

    WaitingDelay --> Preheating: delay reaches 0 && needs_preheat
    WaitingDelay --> Cooking: delay reaches 0 && !needs_preheat

    Preheating --> Ready: temp reached or timeout (immediate start)
    Preheating --> Cooking: temp reached or timeout (delayed start)

    Ready --> Cooking: any button press

    Cooking --> Idle: cook_remaining reaches 0 (timed program)
    note right of Cooking: If duration=0 (no timer), cooking runs until user cancels
```

### Timer state values

| Code | Name       | Description                                          |
| ---- | ---------- | ---------------------------------------------------- |
| 0    | Idle       | No program running                                   |
| 1    | Waiting    | Delay countdown before cook                          |
| 2    | Preheating | Heating to target temperature                        |
| 3    | Ready      | At temperature, waiting for user to press any button |
| 4    | Cooking    | Active cooking, timer counting down                  |

### "Ready" state behavior

After preheating completes, the oven enters a **ready** state that:

- Keeps the PID heating at the target temperature.
- Keeps the fan running if selected.
- Keeps the cooling fan (light relay) on.
- Displays **"OVEN READY"** and **"Press to start"** on the screen.
- Keeps the screen always on (no sleep timeout).
- Waits for **any button press** (temperature, timer, or mode) to transition to cooking.
- **Auto-skip**: If the program was started with a delay (`working_start_delay > 0`), the ready state is skipped and cooking starts immediately (the user may not be present).

### Fan-only mode

If a program is started with only the fan selected (no heating elements or temperature = 0), the preheating phase is skipped entirely and the program goes directly to cooking. This allows using the oven fan for cooling or air circulation without heating.

### Preheating timeout

A configurable timeout (`preheat_timeout_minutes`, default **20 minutes**) prevents the oven from being stuck in preheating indefinitely. When the timeout expires, the system transitions to ready/cooking regardless of whether the target temperature was reached. Set to 0 to disable.

### Live program updates

When Apply Program is pressed while a program is already running:

- **Temperature and elements**: updated immediately.
- **Cook duration**: uses a delta approach — the difference between the new and previous total is added to `timer_cook_remaining`. This preserves elapsed cooking time rather than resetting the countdown.
- **Start delay**: also uses a delta approach via `delay_total_seconds`. If the program is currently in the Waiting state and the new delay is shorter than the time already elapsed, the program advances immediately to Preheating (or Cooking for fan-only). If the program is already past the Waiting phase, the delay change is recorded but has no effect on the current phase.

### Implementation variables

- `timer_state`:
  - `0` -- Idle
  - `1` -- Waiting (delay before cook)
  - `2` -- Preheating
  - `3` -- Ready (at temperature, waiting for user)
  - `4` -- Cooking
- `working_timer` -- user-editable duration (minutes). 0 = no timer, run until cancel.
- `working_start_delay` -- user-editable start delay (minutes).
- `timer_delay_remaining` -- delay countdown (seconds, not restored).
- `timer_cook_remaining` -- cook countdown (seconds, **restored** across reboots). 0 = no timer.
- `cook_total_seconds` -- frozen total cook time for display (seconds, restored).
- `delay_total_seconds` -- frozen total delay time for delta updates (seconds, restored).
- `desired_top_element`, `desired_bottom_element`, `desired_grill_element`, `desired_fan_element` -- logical element selection from Mode page.

### Heating gate

On the main page, each 1 s tick:

- Runs the timer state machine (temperature from MAX31865 PT100).
- Computes:

```cpp
bool any_heating_active =
  id(active_top_element) ||
  id(active_bottom_element) ||
  id(active_grill_element);

bool allow_heat =
  (target > 0.0f && any_heating_active) &&
  (id(timer_state) == 2 || id(timer_state) == 3 || id(timer_state) == 4);
```

- If `allow_heat`: PID climate is set to HEAT mode with the target temperature. The slow PWM output drives the SSRs.
- If `!allow_heat`: PID climate is set to OFF, all heating relays are forced off.
- Fan control is independent: `allow_fan = active_fan_element && program_active` (states 2, 3, or 4).

### Cooling fan safety

The light relay (which also controls the internal cooling fan) stays on whenever:

- Heating is active (`allow_heat`), OR
- The oven fan is running (`allow_fan`), OR
- The oven temperature is above the **cooldown threshold** (default 50 °C, configurable via `cooldown_temp_threshold`).

This ensures the internal cooling fan keeps running after a program ends until the oven is at a safe temperature, preventing heat damage to components.

### Resume after power loss

- `timer_cook_remaining` and `cook_total_seconds` are stored (`restore_value: yes`), so:
  - If there is remaining cook time at boot and `timer_state == 0`, the firmware resumes:
    - State 1 if still in delay,
    - Or state 4 (cooking) directly.
- Once delay finishes, `working_start_delay` is cleared so the delay is **one-shot** and will not re-run after a power cycle.

---

## Buzzer Behaviour

- **End of preheat / ready notification**:
  - Script `buzzer_preheat_finished` runs:
    - 2 fast beeps on `buzzer_output` (GPIO6).
- **End of cook**:
  - Script `buzzer_cook_finished` runs:
    - 3 slower beeps.
- Buzzer is only an indicator; main safety remains with SSRs and the oven's thermal cutouts.

---

## Food Probe (optional)

An optional NTC thermistor meat probe (2.5 mm jack) enables food-temperature monitoring and probe-based auto-stop.

### Hardware & wiring

- Voltage divider on **GPIO7**: `3.3V → 10K fixed resistor → GPIO7 → NTC probe → GND`.
- The fixed divider resistor is **10K** (on the PCB); the probe nominal is **100K NTC @ 25 °C**.
- The ADC reads the divider voltage; a `resistance` sensor back-calculates the probe resistance.

### Temperature conversion

Resistance is converted to temperature with the simplified Steinhart-Hart (B-parameter) equation:

```
T = 1 / (1/T0 + (1/B) * ln(R/R0))
```

- `R0 = food_probe_r0` — probe nominal at 25 °C, default **100000** Ω, adjustable from Home Assistant (`Food Probe R0 (25C)`).
- `T0 = 298.15` K (25 °C)
- `B = food_probe_b_constant` — default **3950** (typical for 100K meat probes), adjustable from Home Assistant (`Food Probe B-Constant`).

> Using a different probe? A **10K** probe needs `R0 = 10000` and usually `B ≈ 3435`. As a sanity check, a 100K NTC reads ~100 kΩ at 25 °C (~330 kΩ in ice water, ~7 kΩ in boiling water); a 10K NTC reads ~10 kΩ at 25 °C.

### Calibration

Both `R0` and `B` are live-tunable from Home Assistant, and two **debug** sensors publish the ungated raw readings (`Food Probe Resistance (Debug)` and `Food Probe Temperature (Debug)`) so you can dial them in even when the probe reads as "disconnected":

- **Single-point (recommended):** hold the probe at a known 25 °C, read `Food Probe Resistance (Debug)`, and set `Food Probe R0 (25C)` to that value. The reading at 25 °C will then be exact.
- **Slope:** if the error grows away from 25 °C, adjust `B` to match the probe datasheet.

### Probe detection

There is no dedicated detect pin — detection is "did we get a believable reading":

- If the computed resistance is out of range (`< 1 Ω` or `> 160 kΩ`) **or** the resulting temperature is outside `-10…300 °C`, `current_food_temp` is set to `NaN`.
- With the 10K fixed divider, an **unplugged** 100K probe floats the node high and computes to ~300 kΩ+ (~1-2 °C). A connected probe at usable temperatures stays well under 160 kΩ (~100-130 kΩ at room temp, far less when hot), so the `> 160 kΩ` cutoff distinguishes "disconnected" from "in use". (Trade-off: food colder than ~16 °C is treated as no-probe. A proper fix is a ~100K fixed divider resistor in hardware.)
- `Food Probe Connected` (binary sensor) is simply `!isnan(current_food_temp)`, and the UI only shows probe info when a valid reading exists. The debug sensors are **not** gated and keep publishing regardless.

### Cook modes

The cook mode is **selected automatically from probe presence** — there is no manual toggle:

- **Timer mode** (`cook_mode = 0`): active whenever no probe is connected. Cooking counts down the duration and auto-stops at 0. Behaves exactly as before.
- **Probe mode** (`cook_mode = 1`): active whenever a probe is connected. Cooking ignores the duration and auto-stops (with the finish buzzer) when the food reaches `food_target_temperature`.

The mode is derived every second while the oven is idle and then **latched** when a program starts, so unplugging the probe mid-cook cannot switch modes underneath a running program. In Home Assistant, `Cook Mode` is now read-only and just reflects the current mode; `Food Target Temperature` stays editable.

### Setting the food target from the knobs

In probe mode the **Timer knob and Timer screen are repurposed to set the food target temperature** instead of a cook duration (time is irrelevant when cooking to core temperature):

- On the Timer screen the first field shows **FOOD TARGET** (in °C) instead of DURATION. Rotate any knob to adjust it: Timer knob ±1 °C, Mode knob ±5 °C, Temperature knob ±10 °C (clamped 0–300 °C).
- The **delayed-start** field (second phase, toggled with the Timer button) still works in probe mode.

Typical probe workflow:

1. Plug the probe cable into the oven jack (this enables probe mode).
2. Set the oven **temperature** (Temperature knob), **elements** (Mode knob), and **food target** (Timer knob).
3. Start the program (Timer button → confirm). The oven **preheats**, then holds at **OVEN READY**.
4. Put the food in, insert the probe tip, and **press any knob** to begin cooking.
5. The program stops automatically (with the buzzer) once the food reaches the target.

---

## Child Lock

A child/kids lock disables the **physical knobs** while leaving Home Assistant fully functional.

### Gesture

- **Toggle**: press and hold both the **Mode** and **Temperature** knob buttons together for **5 seconds** (a buzzer confirms). The same gesture locks and unlocks.
- Detection runs in a dedicated 250 ms interval reading the button states directly, so it works even while locked.

### Behaviour when locked

- Rotating or pressing any knob performs no action; instead the screen wakes and shows the **child lock popup** (page 6), which auto-dismisses ~5 s after the last interaction (like other transient screens).
- Home Assistant controls (numbers, switches, buttons, the custom card) keep working normally — only the knobs are gated.
- The lock state is stored (`restore_value: yes`) and **persists across reboots/power loss**.

### Home Assistant

- Exposed as the **`Kids Lock`** switch (`switch.<device>_kids_lock`). It two-way syncs: toggling the switch locks/unlocks the device, and the knob gesture updates the switch state.

---

## Logging Configuration

The logger is configured to minimize noise while keeping PID autotune output visible:

- Global level: `DEBUG`
- Most components (sensor, display, wifi, api, etc.): `ERROR`
- PID components (`pid`, `pid.autotune`, `pid.climate`): `DEBUG`
- MAX31865: `NONE` (errors handled by sensor filters)
- Generic component messages: `NONE`

The logger uses `deassert_rts_dtr: true` to prevent DTR/RTS signals from holding the ESP32-S3 in download mode when a serial monitor connects.

---

## Home Assistant Entities

The following entities are exposed to Home Assistant:

### Sensors

- Oven Temperature (current reading from PT100)
- Active Temperature (target when program is running)
- Timer State (text: IDLE/WAITING/PREHEATING/READY/COOKING)
- Timer State Code (numeric: 0-4)
- Active Countdown Seconds
- Active Countdown Formatted (HH:MM:SS)
- Delay Remaining (HH:MM:SS countdown for start delay)
- Cook Remaining (HH:MM:SS countdown for cook duration)
- Active Cook Total (minutes, what was applied)
- Active Delay Total (minutes, what was applied)
- Food Probe Temperature (NTC 100K; only valid when a probe is connected)
- Food Probe Temperature (Debug) and Food Probe Resistance (Debug) — ungated raw readings for calibration (diagnostic)

### Binary sensors

- Active Top/Bottom/Grill/Fan Element — whether each element is in the running program (for draft-change detection)
- Top/Bottom/Grill Element State (0=off, 1=selected, 2=armed, 3=heating)
- Fan Element State (0=off, 1=selected, 2=active)
- Oven Frame State (0=off, 1=selected, 2=active)
- Food Probe Connected (binary: probe jack plugged in)
- System ON (binary: any SSR active or program running)
- PID Heat Output, Proportional, Integral, Derivative, Error, Kp, Ki, Kd

### Controls

- Set Temperature (number, 0-280 °C)
- Cook Duration (number, minutes)
- Start Delay (number, minutes)
- Food Target Temperature (number, °C — probe-mode auto-stop target)
- Cook Mode (number, read-only, 0 = timer / 1 = probe — auto-selected from probe presence)
- Food Probe B-Constant (number — tune to match your probe; default 3950)
- Food Probe R0 (25C) (number — probe nominal resistance for single-point calibration; default 100000)
- UI Offset X / UI Offset Y (number, px — optional display alignment fine-tuning)
- Top/Bottom/Grill/Fan Element Selected (switches)
- Kids Lock (switch — locks the physical knobs; HA stays usable)
- Apply Program (button)
- Cancel Program (button)
- PID Autotune (button)
- Restart ESP32-S3 (button)

---

## Build & Flash

Build and flash through the **ESPHome Dashboard** (Home Assistant add-on or standalone):

1. Create a `secrets.yaml` in this folder with your Wi-Fi and API credentials.
2. Import `libre_oven_s3.yaml` into the ESPHome Dashboard.
3. Install to the device via USB (first flash) or OTA (subsequent updates).

For the full hardware build guide, GPIO pinout, and wiring instructions, see the [project README](../README.md).

---

## Safety

See the [project build guide](../README.md#safety) for important safety information regarding high voltage and high temperatures.
