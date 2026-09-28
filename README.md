# Cadence

A client-side teleprompter web app. Paste or import a script, then read it back
with word- or line-level highlighting while recording yourself on camera.
Everything runs in the browser — no backend, no accounts, free to host on Vercel.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui (Button, Slider, Textarea, Dialog, Tabs, Label, ToggleGroup)
- Lucide React icons

## Features

- **Script Editor** — paste a script or **Import** a `.txt`, `.md` or `.pdf`
  file from one button. PDFs open a visual page picker (click thumbnails to
  choose pages; text is extracted client-side with pdf.js). Live word count and
  estimated read time based on the current WPM.
- **Prompter** — movie-credit scrolling: the script scrolls upward at a steady
  speed (sized to your WPM) past a fixed amber reading guide at center. Tune the
  **WPM** and **words-per-line** (3–8) sliders to taste.
  - WPM slider, progress bar, and a "Done" state when you reach the end.
  - Switching modes resets progress to the top.
- **Camera & Recording** — toggle camera / mic, mirror or normal view, record to
  a `.webm` blob with a live REC timer.
- **Session Gallery** — inline playback, download, and delete. In-memory only;
  clears on refresh (by design).

## Keyboard shortcuts (Prompter tab)

- **Space** — play / pause
- **R** — reset to the top

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

Push to a Git repo and import into Vercel — the included `vercel.json` sets the
Vite framework preset. No environment variables required.

> Camera and microphone require a secure context (HTTPS or `localhost`).
