# Launchpad v0.2.9

A lightweight TinyPad-style bookmark start page built with plain HTML, CSS and JavaScript.

## Included in v0.2.9

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

## What changed in v0.2.9

- The **+ Add bookmark** control at the bottom of a card is now scoped to that card
- Card-level bookmark creation no longer offers unrelated groups or new-group creation
- The main **Add → Bookmark** command remains global and can target any group or create a new group
- This prepares the interaction model for future foldable subfolders, where a card-level Add can offer only folders within that card

## Bookmark import

Enter **Edit** mode and choose **Import**. Select a standard HTML bookmark export from Safari, Chrome, Firefox or Edge. Launchpad merges it with existing content and skips duplicate URLs.

## Manual bookmark entry

Enter **Edit** mode and choose **Add → Bookmark** to add anywhere, or use **+ Add bookmark** at the bottom of a group to add directly to that group.

## Deploy to GitHub Pages

Replace the existing `index.html`, `styles.css`, `app.js`, and `README.md` files in the `launchpad` repository with these files and commit the changes to `main`.

## Version history

### v0.2.8

- Added discrete Edit-mode bookmark rows with six-dot drag handles
- Moved bookmark deletion into the Edit dialog

### v0.2.7

- Added thinner, low-contrast scrollbars

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
