# Launchpad v0.2.6

A lightweight TinyPad-style bookmark start page built with plain HTML, CSS and JavaScript.

## Included in v0.2.6

- Responsive bookmark groups
- Add, edit and delete groups
- Add bookmarks manually from the top-bar **Add** menu or from inside a group
- Add, edit, move and delete bookmarks
- Drag-and-drop group ordering
- Drag-and-drop bookmark ordering and moving between groups
- Clear bookmark insertion markers while dragging
- Search by group, title or URL
- Automatic favicons
- Light/dark mode
- Font selector: System, Bookerly, IBM Plex Mono, iA Writer Duo
- Font-size range: 16–24 px
- Browser bookmark HTML import
- Duplicate URL protection during import
- LocalStorage persistence
- Visible version number
- No npm, build process or local development environment required

## What changed in v0.2.6

- Bookmark dragging now shows an explicit horizontal insertion line **above or below** the row under the pointer.
- The insertion position follows the upper or lower half of the hovered bookmark row.
- Moving bookmarks between groups uses the same insertion feedback.
- Dropping in the empty area at the bottom of a group shows an end-of-list insertion line.
- The existing v0.2.5 group dragging, 320 px desktop cards, single horizontal group row, and approximately 15-link internal card scrolling are retained.
- Existing bookmarks and appearance settings remain under the same LocalStorage key.

## Bookmark import

Enter **Edit** mode and choose **Import**. Select a standard HTML bookmark export from Safari, Chrome, Firefox or Edge. Launchpad merges it with existing content and skips duplicate URLs.

## Manual bookmark entry

Enter **Edit** mode and choose **Add → Bookmark**, or use **+ Add bookmark** at the bottom of an existing group.

## Deploy to GitHub Pages

Replace the existing `index.html`, `styles.css`, `app.js`, and `README.md` files in the `launchpad` repository with these files and commit the changes to `main`.

## Version history

### v0.2.5

- Restored group-card dragging
- Added 15-link internal card scrolling on desktop
- Kept desktop groups in one wider horizontal row

### v0.2.4

- Widened desktop group cards to 320 px
- Prevented desktop groups from wrapping onto a second row
- Added horizontal board scrolling

### v0.2.3

- Added insertion-line feedback for group reordering

### v0.2.2

- Added larger 16–24 px font-size range
- Improved top-bar alignment
- Added manual bookmark creation and direct bookmark import
