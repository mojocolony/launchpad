# Launchpad

A simple, customizable bookmark launchpad for organizing and opening frequently used links.

## Version 0.4.0

This release rebuilds the board around a centered responsive grid and a mixed card item model.

### Highlights

- Responsive centered grid instead of an endless horizontal strip
- Equal-height cards sized for roughly 10 bookmark rows, with subtle internal scrolling
- Larger Launchpad wordmark with a Lucide Rocket icon
- Root bookmarks and subfolders now share one ordered list inside each card
- Subfolders can be positioned above, below, or between ordinary bookmarks
- Bookmarks can move between a card root and its subfolders
- Subfolders can move within a card or to another card while keeping their contents
- Card and item drag/drop uses clear insertion markers
- Existing v0.3.x data is migrated automatically; no reset is required
- Existing appearance settings, import, search, themes, and font controls are retained

## Deployment

Upload `index.html`, `styles.css`, `app.js`, and `README.md` to the repository root. GitHub Pages can continue to deploy from the `main` branch and `/ (root)`.
