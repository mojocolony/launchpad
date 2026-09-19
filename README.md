# Launchpad v0.1.2

A lightweight TinyPad-style bookmark start page built with plain HTML, CSS and JavaScript.

## Included in v0.1.2

- Responsive bookmark groups
- Add, edit and delete groups
- Add, edit, move and delete bookmarks
- Drag-and-drop group ordering
- Drag-and-drop bookmark ordering and moving between groups
- Search by group, title or URL
- Automatic favicons
- Light/dark mode
- LocalStorage persistence
- No npm, build process or local development environment required

## Run locally

Open `index.html` in a browser. Most features work directly from the file, although serving the folder through a simple local web server is more reliable for browser security features.

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and this README.
3. In **Settings → Pages**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`.
5. Save.

## Next planned version

v0.2.0 should add browser bookmark import/export and better touch reordering. Supabase sync should come after the interaction model is stable.


## v0.1.2

- Simplified font choices to System, Bookerly, IBM Plex Mono and iA Writer Duo
- Loads IBM Plex Mono as a web font
- Bookerly and iA Writer Duo use local installed copies when available
- Bumped visible version number to v0.1.2

## v0.1.1

- Added font selector
- Added bookmark font-size selector
- Added persistent appearance preferences
- Added visible version number
