# Launchpad v0.2.0

A lightweight TinyPad-style bookmark start page built with plain HTML, CSS and JavaScript.

## Included in v0.2.0

- Responsive bookmark groups
- Add, edit and delete groups
- Add, edit, move and delete bookmarks
- Drag-and-drop group ordering
- Drag-and-drop bookmark ordering and moving between groups
- Search by group, title or URL
- Automatic favicons
- Light/dark mode
- Font and font-size controls
- Browser bookmark HTML import
- Duplicate URL protection during import
- LocalStorage persistence
- No npm, build process or local development environment required

## Bookmark import

Enter **Edit** mode and choose **Import**. Select a standard HTML bookmark export from a browser such as Safari, Chrome, Firefox or Edge.

Launchpad merges imported bookmarks with existing content. Existing URLs are skipped rather than duplicated. Browser folders become Launchpad groups. Nested folders are flattened into readable group paths such as `Research › Architecture`. Only normal `http://` and `https://` links are imported.

## Run locally

Open `index.html` in a browser. Most features work directly from the file, although serving the folder through a simple local web server is more reliable for browser security features.

## Deploy to GitHub Pages

1. Upload `index.html`, `styles.css`, `app.js`, and this README to the existing `launchpad` repository.
2. Replace the older files with these v0.2.0 files.
3. Commit the changes to `main`.
4. GitHub Pages will update from the repository root.

## Next planned work

- Test importing real Safari and Chrome bookmark exports
- Add bookmark export
- Improve touch reordering
- Add Supabase sync after the interaction model is stable

## Version history

### v0.2.0

- Added standard browser bookmark HTML import
- Converts browser folders into Launchpad groups
- Preserves nested folder names as group paths
- Merges with existing groups when names match
- Skips duplicate URLs
- Reports imported, duplicate and ignored bookmark counts
- Bumped visible version number to v0.2.0

### v0.1.2

- Simplified font choices to System, Bookerly, IBM Plex Mono and iA Writer Duo
- Loads IBM Plex Mono as a web font
- Bookerly and iA Writer Duo use local installed copies when available

### v0.1.1

- Added font selector
- Added bookmark font-size selector
- Added persistent appearance preferences
- Added visible version number
