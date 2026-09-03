# Teachers' Day Fun Game

Pure HTML/CSS/Vanilla JavaScript live game-show website.

## Files

- `index.html` — entry point
- `css/style.css` — all styling
- `js/app.js` — game logic, state, rounds, timers, admin, storage and presentation mode

## How to connect the files

Inside `index.html`:

```html
<link rel="stylesheet" href="css/style.css">
<script src="js/app.js"></script>
```

Keep the folders exactly like this:

```text
teachers-day-game/
├── index.html
├── css/
│   └── style.css
└── js/
    └── app.js
```

## Run

Open `index.html` in Chrome/Edge.

For the best two-screen experience, use a simple local server:

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000`

Use one tab/window for Control Mode and another for Presentation Mode.

## Persistence

- `localStorage` stores game configuration and state.
- IndexedDB stores uploaded student photo blobs.
- BroadcastChannel synchronizes control/presentation tabs on the same browser.

## Notes

This is a frontend-only implementation. It does not need an internet connection or external API during gameplay.
