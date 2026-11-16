# Peptide Calculator & Planner

A small, offline-capable web app for peptide reconstitution and dose math, a dose/titration planner, a daily log and a supplies inventory.

**Math tool only, not medical advice.** It never suggests doses or protocols: every number comes from what you enter. Check your own calculations and follow the advice of your prescriber or pharmacist.

## What it does
- **Calculator:** vial size, bacteriostatic water and dose give concentration and syringe units to draw, with a syringe diagram. Supports blends.
- **Planner:** protocols with dose steps (titrate dose and/or frequency per step) and a calendar.
- **Today:** log doses, skips and undo.
- **Inventory:** vials, BAC water, syringes, swabs, with projected run-out and reorder warnings.
- **Notifications (optional):** Settings → Notifications switches on dose reminders and reorder alerts (off by default; your browser asks permission only then). There is also a calendar export (.ics with alarms for every planned dose). Browser notifications only fire while the app is open or recently used, so use the calendar export for reminders that must always arrive.

## Privacy
Everything stays in your browser (localStorage). There is no server, no account and no tracking. Use Settings → Export/Import to back up or move data between devices. Data is per device and per URL.

## Install
Open the site on your phone, then use "Add to Home Screen" (iOS Safari: Share → Add to Home Screen; Android Chrome: menu → Install app). After the first visit it works offline.

## Files
`index.html` (the whole app), `manifest.webmanifest`, `sw.js` (offline cache; bump `CACHE_VERSION` when you change files), and icons.
