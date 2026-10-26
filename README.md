# SAHYOG — Field Team Coordination Platform
### *Connect • Coordinate • Stay Safe*
**Defense Technology Hackathon Prototype**

SAHYOG is an offline-first team communication, medical emergency alerting, and situational awareness platform designed for field teams operating in environments with intermittent or severed network connectivity.

---

## 🎖️ Core Features

1. **Interactive Live Map & Telemetry**:
   - High-fidelity satellite, street, and terrain mapping with Web Mercator coordinate projection.
   - Real-time teammate pins with battery status, condition indicator, and stale location detection (`Live` vs `Last Known`).
   - Threat Zone danger perimeters (high risk circular geofences with dashed warnings).
   - Checkpoints, Rally Points, and dynamic extraction route lines.

2. **Emergency Assist Dispatch**:
   - Rapid emergency broadcast with 1.5s hold-to-activate protection against accidental triggering.
   - Categorization: Medical Emergency, Distress Signal, or Threat Alert.
   - Instant acoustic siren (synthesized via Web Audio API, zero audio asset dependencies).
   - Map automatically flags coordinates with pulsing radar rings.
   - Teammate acknowledgment and resolution lifecycle tracking.

3. **Offline-First Synchronization (PWA + Dexie IndexedDB)**:
   - Client stores member states, messages, checkpoints, and emergencies locally in IndexedDB.
   - Operations performed offline are queued in `syncQueue` with unique IDs.
   - Instant multi-tab synchronization via `BroadcastChannel` API.
   - When network connectivity is restored, operations are automatically replayed and flushed.

4. **WebRTC Real Voice Calling**:
   - One-to-one encrypted peer audio communication using `RTCPeerConnection` and Google STUN servers (`stun.l.google.com:19302`).
   - Real microphone capture (`navigator.mediaDevices.getUserMedia`), live visual audio waveform, mute toggle, and call timer.

5. **Route Planning & Haversine Geodesic Math**:
   - Calculates field distance in meters/kilometers and estimated walking time at standard 4.5 km/h pacing.
   - Honest labeling of straight-line Haversine fallback when terrain routing is unavailable.

6. **Hardware Sensor Integrations**:
   - Real Battery Status API (`navigator.getBattery`) with charging indicators and honest fallback for unsupported browsers.
   - Geolocation API (`navigator.geolocation.watchPosition`) with live GPS accuracy radius.

---

## ⚡ 90-Second Demonstration Script (Judging Protocol)

1. **Launch App & Inspect UI**:
   - Observe the satellite map matching the field layout with Alpha-1 (You), Alpha-2, Alpha-3, and Alpha-4.
   - Notice the battery levels, team condition breakdown (2 All Clear, 1 Caution, 1 Emergency), and live clock.

2. **Simulate Field Movement**:
   - Click **Demo Drills** in the top header and click **Simulate Movement**.
   - Notice the teammate markers dynamically shift positions with updated GPS telemetry.

3. **Trigger Emergency Dispatch**:
   - On the right panel, click **Tap to Alert** under Emergency Assist, or click the **Medical** button.
   - Hear the synthesized emergency tone, observe the red pulsing radar beacon on the map, and see the automated urgent alert in Team Chat.

4. **Multi-Tab Real-Time Sync**:
   - Open SAHYOG in a second browser window or tab.
   - Send a chat message or change condition in Tab 1; observe it appear instantly in Tab 2 without refreshing!

5. **Test Offline-First Queue**:
   - Click the **Online & Synced** button in the header to toggle **Offline Mode On**.
   - Add a checkpoint or send a message; notice the badge indicates *"1 queued for sync"*.
   - Click the button again to reconnect; observe the sync queue automatically flush and log into the audit feed!

6. **WebRTC Audio Call**:
   - Click any teammate card and click **Call Voice**.
   - Test microphone activation, live audio waveform visualizer, and mute toggle.

---

## 🧪 Automated Unit Tests

Run the Vitest test suite covering Haversine distance, stale location logic, coordinate projection, and emergency lifecycle:
```bash
npm test
```
All 10 tests pass deterministically.
