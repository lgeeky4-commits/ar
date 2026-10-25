# SKYLOCK — PC + Mobile Sky AR Arcade (Version 1.0)

A separate fictional aviation arcade game for a browser on a phone or computer.

**Everything is simulated.** All planes are rendered game objects; ranges, headings, and targets are invented for the game. The app cannot detect real aircraft or control missiles, weapons, drones, or radio equipment. The “terminal” is a local code puzzle, not real hacking.

## Included (six files)

- `server.js` — Node.js server with no third-party packages
- `package.json` — start command
- `README.md` — this guide
- `public/index.html` — role selection and game layouts
- `public/style.css` — game styling, HUD, radar, and animations
- `public/app.js` — AR overlay, simulated controls, radar, pairing, optional camera streaming

## Game modes

**Phone / Mobile**

- Tap **START MOBILE** on the opening screen.
- Tap **START SKY CAMERA** to grant camera access. Fake aircraft will be layered over the camera feed. A simulated sky background is provided when the camera is off or unavailable.
- Tap **FLIP FRONT / REAR** to change the camera.
- Tap **ENABLE TILT** if available, then grant device-orientation permission. Tilt indicators are decorative only. They are not validated flight instruments.
- Select a fictional aircraft by tapping its silhouette or choosing its name from the contact list.
- **VIRTUAL INTERCEPT** plays a game animation on the chosen fictional contact. Use **RADAR SWEEP** to restore contacts.
- **PRACTICE TERMINAL** is a fake code puzzle that unlocks local visual effects.
- **SHARE TO PC** is *off by default*. It enables a PC in the same game room to request a WebRTC video stream. Stop sharing or camera use whenever you choose.

**Computer / PC**

- Tap **START PC** to open the radar/command dashboard.
- Find the six-character pairing code at the left.
- Control simulated aircraft from the radar dots or contact list.
- Use the additional **PC-only simulation tools**: Add Fake Plane, Advance Sim, Reset Contacts.
- Use Normal, Night, Thermal, and Wire *visual filters* (the thermal display does not measure heat).
- Open the Terminal puzzle and trigger simulation effects.
- See phone tilt/heading telemetry and, with permission, the phone's camera feed.

## Pair a phone with a computer

1. On your computer, open the hosted website, choose **PC**, and note its six-character room code.
2. Open **the same website URL** on your phone (Chrome or Safari), type the code in the **PAIR TO AN EXISTING DEVICE** field, and choose **MOBILE**.
3. Radar positions, selected fictional targets, and HUD telemetry now sync between the devices.
4. For live phone video, tap **START SKY CAMERA** on the phone, grant permission, then tap **SHARE TO PC: OFF** to turn it on.
5. On the computer, press **CONNECT PHONE VIDEO**. The browser attempts a direct WebRTC connection.
6. On some cellular or restrictive networks, direct WebRTC connections cannot complete without a TURN relay. Radar telemetry still works in this case. This demo does not ship a TURN server.

## Install / run

### Run locally on a computer

Install Node.js version 18 or newer, then in the extracted project folder run:

```sh
npm start
```

Open `http://localhost:3000` on that same computer. **The phone needs the public HTTPS website** unless you configure your own trusted secure development environment. The phone camera is generally unavailable to insecure `http://` sites on other devices.

### Host on Render with GitHub

1. Create a new GitHub repository.
2. Upload all six files, with `server.js` and `package.json` at the repository root and the `public` folder intact.
3. Create a Render **Web Service** linked to that repository.
4. Choose **Node** as the runtime, build command `npm install`, and start command `npm start`.
5. Deploy. Share the resulting `https://...onrender.com` URL between your devices.
6. Check `https://your-domain/health` to see whether the server is running.

No third-party Node packages are required.

## Important limitations

- **No real AR object detection.** The live phone camera is only used as a background for fictional graphics. Aim responsibly; never assume the game knows what is in front of you.
- **No real weapons or hacking.** The virtual intercepts and signal puzzle affect this game only.
- **No GPS, no stored camera videos or photos.** Video is streamed to the paired browser only when the phone explicitly enables sharing.
- **Not a secured pairing service.** The six-character code is for a casual game, not account verification or end-to-end encrypted communication.
- **No persistent database.** Rooms and progress reset when the Node process restarts. One PC and one phone can occupy each room.
- **Device sensors and camera controls vary.** Tilt sensors may not be available; camera selection depends on the actual device/browser.
- **WebRTC can fail across some networks** without a relay server. This release includes STUN only.
- Host in **HTTPS** for mobile camera access, especially Safari and Chrome on phones.

This is a hobby/game website and is not suitable for real aviation, safety-critical or emergency tasks.
