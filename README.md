# ForgeFit Strength Planner

A static strength-training planner for full gym environments. The app generates workouts based on:

- Training split (`full body`, `upper/lower`, `push/pull/legs`)
- Session focus (`upper`, `lower`, `push`, `pull`, `legs`)
- Difficulty and workout duration
- Target muscle groups
- Available equipment (barbell, dumbbell, cable, machine, smith machine, bodyweight, kettlebell, etc.)

The app runs fully in-browser with no backend and stores recent workout history in `localStorage`.

## Run locally

Open `index.html` in your browser.

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
