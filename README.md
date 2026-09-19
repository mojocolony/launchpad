# Launchpad v0.3.1


## v0.3.1

- Fixed subfolder reordering: drag a subfolder by its header in Edit mode.
- Preserves each card’s internal scroll position after bookmark, subfolder, or card drag-and-drop operations.
- Preserves the board’s horizontal scroll position during drag-and-drop reordering.

A lightweight TinyPad-style bookmark start page built with plain HTML, CSS and JavaScript.

## New in v0.3.0

- One level of collapsible subfolders inside each card
- Bookmarks can live either in the card's main/root area or inside a subfolder
- Subfolder open/closed state persists between visits
- Search automatically reveals matches inside collapsed subfolders
- Edit mode can add, rename, delete and reorder subfolders
- Deleting a subfolder moves its bookmarks back to the card root rather than deleting them
- Bookmarks can be dragged between a card root, its subfolders, and other cards
- The card-level **+ Add bookmark** chooser offers the card root plus only that card's subfolders
- The main **Add → Bookmark** chooser can target any card or subfolder
- The main **Add → Subfolder** command can create a subfolder in any card
- Browser bookmark import now maps deeper folders into one Launchpad subfolder level

## Existing features retained

- Wider single-row desktop cards
- Approximately 15-link card viewport with subtle internal scrolling on desktop
- Drag-and-drop group and bookmark ordering with insertion markers
- Search by group, subfolder, title or URL
- Automatic favicons
- Light/dark mode
- Font selector: System, Bookerly, IBM Plex Mono, iA Writer Duo
- Font-size range: 16–24 px
- Browser bookmark HTML import with duplicate URL protection
- LocalStorage persistence
- Versioned CSS/JS URLs to reduce GitHub Pages cache mismatches
- No npm or build process required

## Adding a subfolder

Enter **Edit** mode. Either choose **Add → Subfolder** in the top bar to add one anywhere, or use **+ Subfolder** at the bottom of a card to add it directly to that card.

## Adding bookmarks locally

The **+ Add bookmark** button at the bottom of a card offers that card's main area and its subfolders only. The top-bar **Add → Bookmark** command remains global.

## Deploy to GitHub Pages

Replace the existing `index.html`, `styles.css`, `app.js`, and `README.md` files in the `launchpad` repository with these files and commit the changes to `main`.

Existing bookmarks and settings remain compatible with v0.2.10. The data model is upgraded in place by adding an empty `folders` array to existing cards when needed.
