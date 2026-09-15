# Sadık Can Çeşka — Portfolio

Personal portfolio at **https://ceskasc.github.io/**.

The homepage uses spacious typography, a copper WebGL light field, an expandable project index, professional experience, and direct contact links. It is a static site, published by the existing GitHub Pages workflow.

## Local development

```sh
python -m http.server 4173
```

Open `http://localhost:4173`. No installation or build step is required.

## Main files

- `index.html`: portfolio content, semantic structure, metadata.
- `portfolio.html`: equivalent legacy entry point; keep in sync with `index.html`.
- `style.css`: layout, typography, responsive breakpoints, and motion preferences.
- `script.js`: navigation, scroll reveals, motion control, clock, email copy, and optional repository snapshot.
- `assets/field.js`: procedural WebGL line geometry; adapts to mobile, pauses off screen, and uses Canvas 2D when WebGL is unavailable (with a static CSS fallback).
- `data/github.json`: repository metadata maintained by the existing scheduled workflow.
- `Sadik_Can_Ceska_Portfolio_CV_PrivacySafe.pdf`: linked résumé.

## Behavior and accessibility

All portfolio content and links are available without JavaScript. Project descriptions use native `details` elements. The mobile navigation uses a modal dialog with native focus containment and Escape support. Reduced motion settings are respected, and a manual motion control is provided. Copying an email address displays a status message; when the clipboard is unavailable the address remains available as text and as a mail link.

The optional repository snapshot only updates repository counts and languages. It does not supply essential content or redirect links. Existing independent applications in subdirectories retain their own assets and behavior.

## Checks

```sh
node --check script.js
node --check assets/field.js
```

The existing `Site quality` GitHub Actions workflow validates HTML structure, local links, accessibility hooks, and JavaScript syntax on pushes to `main`.
