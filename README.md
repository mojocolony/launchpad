# Launchpad v0.2.3

A lightweight TinyPad-style bookmark start page built with plain HTML, CSS and JavaScript.

## Included in v0.2.3

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

## What changed in v0.2.3

- Increased the font-size range from 13–18 px to **16–24 px**.
- Increased the default content size to **17 px**.
- Group headings now scale with the selected font size.
- Retains the v0.2.1 toolbar alignment fixes.
- Retains the v0.2.1 **Add** menu for manually creating bookmarks or groups.
- Retains the v0.2.1 direct import flow: clicking **Import** opens the browser file picker and imports the selected bookmark HTML file immediately.
- Existing stored bookmarks remain under the same LocalStorage key.

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

### v0.2.3

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


### v0.2.3
- Group reordering now uses a before/after insertion line instead of highlighting the whole destination card.
