# ForgeFit Strength Planner

A static strength-training planner for full gym environments. The app generates workouts based on:

- Training split (`full body`, `upper/lower`, `push/pull/legs`)
- Session focus (`upper`, `lower`, `push`, `pull`, `legs`)
- Difficulty and workout duration
- Target muscle groups
- Available equipment (barbell, dumbbell, cable, machine, smith machine, bodyweight, kettlebell, etc.)
- Easy exercise demonstrations:
  - Quick form cues under each generated movement
  - Direct "Watch video demo" links (YouTube search per exercise)
- Guided gym schedule runner:
  - `Start Exercise` button from setup generates and opens the dashboard in one step
  - `Start Workout Dashboard` opens a fullscreen dashboard that replaces the planner view
  - Workout timer counts continuously during the active session
  - Set counter and exercise timer are shown for the current movement
  - Rest timer between exercises
  - `Next` button moves through sets/exercises and can skip rest while resting
  - `Stop` button discontinues workout and resets the active session

The app runs fully in-browser with no backend and stores recent workout history in `localStorage`.

## Run locally

Open `index.html` in your browser.

## Mobile App (Capacitor)

This project is now configured as a Capacitor mobile app.

### Prerequisites

- Node.js + npm
- Android Studio (for Android builds)
- Xcode (for iOS builds, macOS only)

### Commands

- `npm run cap:sync` - Copy latest web files into native projects and sync plugins.
- `npm run android:open` - Sync and open the Android project in Android Studio.
- `npm run ios:open` - Sync and open the iOS project in Xcode.

### Native project folders

- `android/`
- `ios/`

Web assets for native builds are generated into `www/` from:

- `index.html`
- `styles.css`
- `app.js`
- `exercises.js`

## Deploy to GitHub Pages

This repo includes `.github/workflows/deploy-pages.yml` to deploy automatically.

1. Push the `main` branch.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set **Source** to `GitHub Actions`.
4. Wait for the workflow **Deploy static app to GitHub Pages** to finish.
5. Your site URL will be:
   `https://birkneh.github.io/excercise/`

## Project files

- `index.html` - app layout
- `styles.css` - visual design and responsive layout
- `exercises.js` - exercise dataset
- `app.js` - workout generation and history logic
