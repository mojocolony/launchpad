# Launchpad v0.2.5

A lightweight TinyPad-style bookmark start page built with plain HTML, CSS and JavaScript.

## Included in v0.2.5

- Responsive bookmark groups
- Add, edit and delete groups
- Add bookmarks manually from the top-bar **Add** menu or from inside a group
- Add, edit, move and delete bookmarks
- Drag-and-drop group ordering
- Drag-and-drop bookmark ordering and moving between groups
- Search by group, title or URL
- Automatic favicons
- Light/dark mode
- Font selector: System, Bookerly, IBM Plex Mono, iA Writer Duo
- Larger font-size range: 16–24 px
- Browser bookmark HTML import
- Duplicate URL protection during import
- LocalStorage persistence
- Visible version number
- No npm, build process or local development environment required

## What changed in v0.2.5

- Restored the reliable group-card drag behaviour from v0.2.2.
- Replaced whole-card drag highlighting with a simple insertion line.
- Dropping in empty space at the end of the board moves a group to the end.
- Desktop group cards show about 15 bookmarks at a time and scroll internally for additional links.

- Desktop groups are now **320 px wide**, giving bookmark titles substantially more room.
- Desktop groups stay in **one horizontal row** instead of wrapping to a second grid row.
- When there are more groups than fit on screen, the board scrolls horizontally.
- Mobile remains a normal single-column layout.
- Group reordering keeps the v0.2.3 before/after insertion-line feedback.
- Existing bookmarks and appearance settings remain under the same LocalStorage key.

## Bookmark import

Enter **Edit** mode and choose **Import**. The browser file picker opens immediately. Select a standard HTML bookmark export from Safari, Chrome, Firefox or Edge.

Launchpad merges imported bookmarks with existing content. Existing URLs are skipped rather than duplicated. Browser folders become Launchpad groups. Nested folders are flattened into readable group paths such as `Research › Architecture`. Only normal `http://` and `https://` links are imported.

A status message appears at the bottom after the import reports how many bookmarks were imported, skipped or ignored.

## Manual bookmark entry

Enter **Edit** mode and choose **Add → Bookmark**. Enter a title and URL, then choose an existing group or create a new one from the same dialog.

You can also use **+ Add bookmark** at the bottom of any existing group while in Edit mode.

## Deploy to GitHub Pages

Replace the existing `index.html`, `styles.css`, `app.js`, and `README.md` files in the `launchpad` repository with these files and commit the changes to `main`.

## Version history

### v0.2.4

- Widened desktop group cards to 320 px
- Prevented desktop groups from wrapping onto a second row
- Added horizontal board scrolling for additional groups
- Preserved single-column mobile layout
- Retained insertion-line group drag feedback

### v0.2.3

- Changed group reordering to a before/after insertion line instead of whole-card highlighting
- Increased content font-size range to 16–24 px
- Set a larger 17 px default
- Made group headings scale with the selected content size
- Updated visible version number

### v0.2.1

- Corrected top-bar control alignment
- Added an **Add** menu for manual bookmark/group creation
- Changed import to a direct file-picker workflow
- Added import status messages and a fallback parser

### v0.2.0

- Added standard browser bookmark HTML import
- Converts browser folders into Launchpad groups
- Preserves nested folder names as group paths
- Merges with existing groups when names match
- Skips duplicate URLs

### v0.1.2

- Simplified font choices to System, Bookerly, IBM Plex Mono and iA Writer Duo

### v0.1.1

- Added font selector
- Added font-size selector
- Added persistent appearance preferences
- Added visible version number
