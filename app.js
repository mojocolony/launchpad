const STORAGE_KEY = 'launchpad.v0.1.data';
const THEME_KEY = 'launchpad.theme';
const FONT_KEY = 'launchpad.font';
const FONT_SIZE_KEY = 'launchpad.fontSize';

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const seed = {
  groups: [
    {
      id: makeId(),
      name: 'My Apps',
      bookmarks: [
        { id: makeId(), title: 'Reader', url: 'https://mojocolony.github.io/reader/' },
        { id: makeId(), title: 'Fetch', url: 'https://mojocolony.github.io/fetch/' },
        { id: makeId(), title: 'Watching', url: 'https://mojocolony.github.io/watching/' }
      ],
      folders: []
    },
    {
      id: makeId(),
      name: 'Useful',
      bookmarks: [
        { id: makeId(), title: 'Wikipedia', url: 'https://www.wikipedia.org/' },
        { id: makeId(), title: 'Internet Archive', url: 'https://archive.org/' }
      ],
      folders: []
    }
  ]
};

let state = loadState();
let editing = false;
let editBookmarkId = null;
let editGroupId = null;
let editFolderId = null;
let editFolderGroupId = null;
let dragPayload = null;
let bookmarkDialogScopeGroupId = null;
let folderDialogScopeGroupId = null;
let pendingDragScrollState = null;

const board = document.querySelector('#board');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#searchInput');
const editBtn = document.querySelector('#editBtn');
const themeBtn = document.querySelector('#themeBtn');
const appearanceBtn = document.querySelector('#appearanceBtn');
const appearancePanel = document.querySelector('#appearancePanel');
const fontSelect = document.querySelector('#fontSelect');
const fontSizeSelect = document.querySelector('#fontSizeSelect');
const addBtn = document.querySelector('#addBtn');
const addMenu = document.querySelector('#addMenu');
const addBookmarkBtn = document.querySelector('#addBookmarkBtn');
const addFolderBtn = document.querySelector('#addFolderBtn');
const addGroupMenuBtn = document.querySelector('#addGroupMenuBtn');
const importBtn = document.querySelector('#importBtn');
const importFile = document.querySelector('#importFile');
const toast = document.querySelector('#toast');
const bookmarkDialog = document.querySelector('#bookmarkDialog');
const bookmarkForm = document.querySelector('#bookmarkForm');
const bookmarkDialogTitle = document.querySelector('#bookmarkDialogTitle');
const bookmarkTitle = document.querySelector('#bookmarkTitle');
const bookmarkUrl = document.querySelector('#bookmarkUrl');
const bookmarkGroup = document.querySelector('#bookmarkGroup');
const bookmarkGroupWrap = document.querySelector('#bookmarkGroupWrap');
const bookmarkNewGroupWrap = document.querySelector('#bookmarkNewGroupWrap');
const bookmarkNewGroup = document.querySelector('#bookmarkNewGroup');
const bookmarkDeleteBtn = document.querySelector('#bookmarkDeleteBtn');
const folderDialog = document.querySelector('#folderDialog');
const folderForm = document.querySelector('#folderForm');
const folderDialogTitle = document.querySelector('#folderDialogTitle');
const folderName = document.querySelector('#folderName');
const folderGroup = document.querySelector('#folderGroup');
const folderGroupWrap = document.querySelector('#folderGroupWrap');
const folderDeleteBtn = document.querySelector('#folderDeleteBtn');
const groupDialog = document.querySelector('#groupDialog');
const groupForm = document.querySelector('#groupForm');
const groupDialogTitle = document.querySelector('#groupDialogTitle');
const groupName = document.querySelector('#groupName');
const groupTemplate = document.querySelector('#groupTemplate');
const subfolderTemplate = document.querySelector('#subfolderTemplate');
const bookmarkTemplate = document.querySelector('#bookmarkTemplate');

applyTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
applyFont(localStorage.getItem(FONT_KEY) || 'system');
applyFontSize(localStorage.getItem(FONT_SIZE_KEY) || '17');
setupBoardGroupDrop();
render();

function normalizeState(input) {
  const source = input && Array.isArray(input.groups) ? input : structuredClone(seed);
  source.groups = source.groups.map(group => {
    const normalized = {
      id: group.id || makeId(),
      name: group.name || 'Untitled',
      bookmarks: Array.isArray(group.bookmarks)
        ? group.bookmarks.map(bookmark => ({ id: bookmark.id || makeId(), title: bookmark.title || 'Untitled', url: bookmark.url || '' }))
        : [],
      folders: Array.isArray(group.folders)
        ? group.folders.map(folder => ({
            id: folder.id || makeId(),
            name: folder.name || 'Untitled',
            collapsed: Boolean(folder.collapsed),
            bookmarks: Array.isArray(folder.bookmarks)
              ? folder.bookmarks.map(bookmark => ({ id: bookmark.id || makeId(), title: bookmark.title || 'Untitled', url: bookmark.url || '' }))
              : []
          }))
        : [],
      order: Array.isArray(group.order) ? group.order : []
    };
    ensureGroupOrder(normalized);
    return normalized;
  });
  return source;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeState(raw ? JSON.parse(raw) : structuredClone(seed));
  } catch {
    return normalizeState(structuredClone(seed));
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function faviconFor(url) {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return '';
  }
}

function normalizedUrl(url) {
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getGroup(groupId) {
  return state.groups.find(group => group.id === groupId) || null;
}

function getFolder(groupId, folderId) {
  return getGroup(groupId)?.folders.find(folder => folder.id === folderId) || null;
}

function getCollection(groupId, folderId = null) {
  const group = getGroup(groupId);
  if (!group) return null;
  if (!folderId) return group.bookmarks;
  return group.folders.find(folder => folder.id === folderId)?.bookmarks || null;
}

function ensureGroupOrder(group) {
  if (!group) return [];
  const bookmarkIds = new Set(group.bookmarks.map(bookmark => bookmark.id));
  const folderIds = new Set(group.folders.map(folder => folder.id));
  const seen = new Set();
  const order = [];
  (Array.isArray(group.order) ? group.order : []).forEach(item => {
    if (!item || !item.type || !item.id) return;
    const valid = item.type === 'bookmark' ? bookmarkIds.has(item.id) : item.type === 'folder' ? folderIds.has(item.id) : false;
    const key = `${item.type}:${item.id}`;
    if (valid && !seen.has(key)) {
      seen.add(key);
      order.push({ type: item.type, id: item.id });
    }
  });
  group.bookmarks.forEach(bookmark => {
    const key = `bookmark:${bookmark.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      order.push({ type: 'bookmark', id: bookmark.id });
    }
  });
  group.folders.forEach(folder => {
    const key = `folder:${folder.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      order.push({ type: 'folder', id: folder.id });
    }
  });
  group.order = order;
  return order;
}

function removeRootOrderRef(group, type, id) {
  ensureGroupOrder(group);
  const index = group.order.findIndex(item => item.type === type && item.id === id);
  if (index >= 0) group.order.splice(index, 1);
  return index;
}

function insertRootOrderRef(group, type, id, targetType = null, targetId = null, position = 'end') {
  ensureGroupOrder(group);
  removeRootOrderRef(group, type, id);
  const ref = { type, id };
  if (position === 'start') {
    group.order.unshift(ref);
    return;
  }
  if (!targetType || !targetId || position === 'end') {
    group.order.push(ref);
    return;
  }
  let index = group.order.findIndex(item => item.type === targetType && item.id === targetId);
  if (index < 0) {
    group.order.push(ref);
    return;
  }
  if (position === 'after') index += 1;
  group.order.splice(index, 0, ref);
}

function rootItem(group, item) {
  if (item.type === 'bookmark') return group.bookmarks.find(bookmark => bookmark.id === item.id) || null;
  if (item.type === 'folder') return group.folders.find(folder => folder.id === item.id) || null;
  return null;
}

function findBookmark(bookmarkId) {
  for (const group of state.groups) {
    const rootBookmark = group.bookmarks.find(bookmark => bookmark.id === bookmarkId);
    if (rootBookmark) return { group, folder: null, bookmark: rootBookmark, collection: group.bookmarks };
    for (const folder of group.folders) {
      const bookmark = folder.bookmarks.find(item => item.id === bookmarkId);
      if (bookmark) return { group, folder, bookmark, collection: folder.bookmarks };
    }
  }
  return null;
}

function countGroupBookmarks(group) {
  return group.bookmarks.length + group.folders.reduce((sum, folder) => sum + folder.bookmarks.length, 0);
}

function bookmarkMatches(bookmark, q) {
  return bookmark.title.toLowerCase().includes(q) || bookmark.url.toLowerCase().includes(q);
}

function destinationValue(groupId, folderId = null) {
  return folderId ? `folder:${groupId}:${folderId}` : `group:${groupId}`;
}

function parseDestination(value) {
  if (value === '__new__') return { newGroup: true, groupId: null, folderId: null };
  const parts = String(value).split(':');
  if (parts[0] === 'folder' && parts.length >= 3) return { newGroup: false, groupId: parts[1], folderId: parts.slice(2).join(':') };
  if (parts[0] === 'group' && parts[1]) return { newGroup: false, groupId: parts.slice(1).join(':'), folderId: null };
  return { newGroup: false, groupId: value, folderId: null };
}

function renderBookmarkRow(bookmark, groupId, folderId, list) {
  const row = bookmarkTemplate.content.firstElementChild.cloneNode(true);
  row.dataset.bookmarkId = bookmark.id;
  row.dataset.groupId = groupId;
  row.dataset.folderId = folderId || '';
  row.draggable = false;

  const dragHandle = row.querySelector('.bookmark-drag-handle');
  if (dragHandle) dragHandle.draggable = editing && !searchInput.value.trim();

  const link = row.querySelector('.bookmark-link');
  if (link) {
    link.href = bookmark.url;
    const titleNode = link.querySelector('.bookmark-title');
    if (titleNode) titleNode.textContent = bookmark.title;
    const favicon = link.querySelector('.favicon');
    if (favicon) {
      favicon.src = faviconFor(bookmark.url);
      favicon.addEventListener('error', () => { favicon.style.visibility = 'hidden'; });
    }
  }

  row.querySelector('.bookmark-edit')?.addEventListener('click', event => {
    event.preventDefault();
    openBookmarkDialog(groupId, bookmark.id);
  });

  setupBookmarkDrag(row);
  list.appendChild(row);
}

function captureScrollState() {
  const cards = new Map();
  board.querySelectorAll('.group-card[data-group-id]').forEach(card => {
    const scroller = card.querySelector('.card-scroll');
    if (scroller) cards.set(card.dataset.groupId, scroller.scrollTop);
  });
  return { boardLeft: board.scrollLeft, cards };
}

function restoreScrollState(scrollState) {
  if (!scrollState) return;
  board.scrollLeft = scrollState.boardLeft;
  board.querySelectorAll('.group-card[data-group-id]').forEach(card => {
    const scroller = card.querySelector('.card-scroll');
    const savedTop = scrollState.cards.get(card.dataset.groupId);
    if (scroller && typeof savedTop === 'number') scroller.scrollTop = savedTop;
  });
}

function render({ preserveScroll = false, restoreScroll = null } = {}) {
  const scrollState = restoreScroll || (preserveScroll ? captureScrollState() : null);
  const q = searchInput.value.trim().toLowerCase();
  board.innerHTML = '';

  state.groups.forEach(group => {
    ensureGroupOrder(group);
    const groupMatch = Boolean(q && group.name.toLowerCase().includes(q));
    const visibleRootBookmarks = new Set(
      group.bookmarks
        .filter(bookmark => !q || groupMatch || bookmarkMatches(bookmark, q))
        .map(bookmark => bookmark.id)
    );
    const visibleFolders = new Map();
    group.folders.forEach(folder => {
      const folderMatch = Boolean(q && folder.name.toLowerCase().includes(q));
      const bookmarks = folder.bookmarks.filter(bookmark => !q || groupMatch || folderMatch || bookmarkMatches(bookmark, q));
      if (!q || groupMatch || folderMatch || bookmarks.length > 0) visibleFolders.set(folder.id, bookmarks);
    });

    if (q && !groupMatch && visibleRootBookmarks.size === 0 && visibleFolders.size === 0) return;

    const groupNode = groupTemplate.content.firstElementChild.cloneNode(true);
    groupNode.dataset.groupId = group.id;
    groupNode.querySelector('.group-title').textContent = group.name;
    groupNode.draggable = editing && !q;

    const itemList = groupNode.querySelector('.card-items');
    itemList.dataset.groupId = group.id;

    group.order.forEach(item => {
      if (item.type === 'bookmark') {
        if (!visibleRootBookmarks.has(item.id)) return;
        const bookmark = group.bookmarks.find(entry => entry.id === item.id);
        if (!bookmark) return;
        const beforeCount = itemList.children.length;
        renderBookmarkRow(bookmark, group.id, null, itemList);
        const row = itemList.children[beforeCount];
        if (row) {
          row.classList.add('top-level-item', 'top-level-bookmark');
          row.dataset.rootType = 'bookmark';
          row.dataset.rootId = bookmark.id;
        }
        return;
      }

      if (item.type !== 'folder' || !visibleFolders.has(item.id)) return;
      const folder = group.folders.find(entry => entry.id === item.id);
      if (!folder) return;
      const bookmarks = visibleFolders.get(item.id) || [];
      const folderNode = subfolderTemplate.content.firstElementChild.cloneNode(true);
      folderNode.dataset.groupId = group.id;
      folderNode.dataset.folderId = folder.id;
      folderNode.dataset.rootType = 'folder';
      folderNode.dataset.rootId = folder.id;
      folderNode.classList.add('top-level-item');

      const nameNode = folderNode.querySelector('.subfolder-name');
      if (nameNode) nameNode.textContent = folder.name;
      const countNode = folderNode.querySelector('.subfolder-count');
      if (countNode) countNode.textContent = folder.bookmarks.length ? String(folder.bookmarks.length) : '';

      const forcedOpen = Boolean(q);
      const collapsed = forcedOpen ? false : folder.collapsed;
      folderNode.classList.toggle('collapsed', collapsed);
      const content = folderNode.querySelector('.subfolder-content');
      if (content) content.hidden = collapsed;
      const toggle = folderNode.querySelector('.subfolder-toggle');
      const chevron = folderNode.querySelector('.subfolder-chevron');
      if (toggle) toggle.setAttribute('aria-expanded', String(!collapsed));
      if (chevron) chevron.textContent = collapsed ? '▸' : '▾';

      toggle?.addEventListener('click', event => {
        if (editing && event.detail > 0 && event.target.closest('.subfolder-toggle')) {
          // A normal click still toggles; dragging the header is handled separately.
        }
        if (q) return;
        folder.collapsed = !folder.collapsed;
        saveState();
        render({ preserveScroll: true });
      });

      folderNode.querySelector('.subfolder-edit')?.addEventListener('click', event => {
        event.stopPropagation();
        openFolderDialog(group.id, folder.id);
      });

      const folderBookmarks = folderNode.querySelector('.subfolder-bookmarks');
      folderBookmarks.dataset.groupId = group.id;
      folderBookmarks.dataset.folderId = folder.id;
      bookmarks.forEach(bookmark => renderBookmarkRow(bookmark, group.id, folder.id, folderBookmarks));
      setupFolderBookmarkListDrop(folderBookmarks);
      setupFolderHeaderBookmarkDrop(folderNode, group.id, folder.id);
      setupFolderDrag(folderNode);
      itemList.appendChild(folderNode);
    });

    setupCardItemsDrop(itemList, group.id);
    setupCardHeaderItemDrop(groupNode, group.id);

    groupNode.querySelector('.add-bookmark')?.addEventListener('click', () => openBookmarkDialog(group.id, null, { local: true }));
    groupNode.querySelector('.add-subfolder')?.addEventListener('click', () => openFolderDialog(group.id, null, { local: true }));
    groupNode.querySelector('.rename-group')?.addEventListener('click', () => openGroupDialog(group.id));
    groupNode.querySelector('.delete-group')?.addEventListener('click', () => deleteGroup(group.id));

    setupGroupDrag(groupNode);
    board.appendChild(groupNode);
  });

  const hasVisibleGroups = board.childElementCount > 0;
  emptyState.hidden = hasVisibleGroups;
  if (!hasVisibleGroups) {
    const heading = emptyState.querySelector('h2');
    const copy = emptyState.querySelector('p');
    if (q) {
      heading.textContent = 'No matches';
      copy.textContent = 'Try a different search.';
    } else {
      heading.textContent = 'No bookmarks yet';
      copy.textContent = 'Choose Edit, then Add to create a bookmark or group.';
    }
  }

  restoreScrollState(scrollState);
}

function setEditing(value) {
  editing = value;
  document.body.classList.toggle('editing', editing);
  editBtn.classList.toggle('active', editing);
  editBtn.textContent = editing ? 'Done' : 'Edit';
  if (!editing) setAddMenu(false);
  render();
}

editBtn.addEventListener('click', () => setEditing(!editing));
searchInput.addEventListener('input', render);

addBtn.addEventListener('click', event => {
  event.stopPropagation();
  setAddMenu(addMenu.hidden);
});
addMenu.addEventListener('click', event => event.stopPropagation());
addBookmarkBtn.addEventListener('click', () => {
  setAddMenu(false);
  openBookmarkDialog(null);
});
addFolderBtn?.addEventListener('click', () => {
  setAddMenu(false);
  openFolderDialog();
});
addGroupMenuBtn.addEventListener('click', () => {
  setAddMenu(false);
  openGroupDialog();
});

importBtn.addEventListener('click', () => {
  importFile.value = '';
  importFile.click();
});
importFile.addEventListener('change', importSelectedFile);

themeBtn.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
});

appearanceBtn.addEventListener('click', event => {
  event.stopPropagation();
  setAppearancePanel(appearancePanel.hidden);
});

appearancePanel.addEventListener('click', event => event.stopPropagation());
fontSelect.addEventListener('change', () => applyFont(fontSelect.value));
fontSizeSelect.addEventListener('change', () => applyFontSize(fontSizeSelect.value));
document.addEventListener('click', () => {
  setAppearancePanel(false);
  setAddMenu(false);
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

function applyFont(font) {
  const fonts = {
    system: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    bookerly: '"Bookerly", ui-serif, Georgia, serif',
    'ibm-plex-mono': '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    'ia-writer-duo': '"iA Writer Duo", "iA Writer Duospace", ui-monospace, SFMono-Regular, Menlo, monospace'
  };
  const selected = fonts[font] ? font : 'system';
  document.documentElement.style.setProperty('--app-font', fonts[selected]);
  fontSelect.value = selected;
  localStorage.setItem(FONT_KEY, selected);
}

function applyFontSize(size) {
  const value = Math.min(24, Math.max(16, Number(size) || 17));
  document.documentElement.style.setProperty('--bookmark-font-size', `${value}px`);
  fontSizeSelect.value = String(value);
  localStorage.setItem(FONT_SIZE_KEY, String(value));
}

function setAppearancePanel(open) {
  appearancePanel.hidden = !open;
  appearanceBtn.setAttribute('aria-expanded', String(open));
}

function setAddMenu(open) {
  addMenu.hidden = !open;
  addBtn.setAttribute('aria-expanded', String(open));
}

function populateDestinationSelect(selectedValue, scopeGroupId = null, allowNewGroup = true) {
  bookmarkGroup.innerHTML = '';
  const groups = scopeGroupId ? state.groups.filter(group => group.id === scopeGroupId) : state.groups;

  groups.forEach(group => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = group.name;

    const rootOption = document.createElement('option');
    rootOption.value = destinationValue(group.id);
    rootOption.textContent = `${group.name} (main)`;
    optgroup.appendChild(rootOption);

    group.folders.forEach(folder => {
      const option = document.createElement('option');
      option.value = destinationValue(group.id, folder.id);
      option.textContent = `↳ ${folder.name}`;
      optgroup.appendChild(option);
    });

    bookmarkGroup.appendChild(optgroup);
  });

  if (allowNewGroup) {
    const newOption = document.createElement('option');
    newOption.value = '__new__';
    newOption.textContent = '+ New group…';
    bookmarkGroup.appendChild(newOption);
  }

  const available = Array.from(bookmarkGroup.querySelectorAll('option')).map(option => option.value);
  if (selectedValue && available.includes(selectedValue)) bookmarkGroup.value = selectedValue;
  else if (available.length) bookmarkGroup.value = available[0];
  else bookmarkGroup.value = '__new__';

  updateNewGroupField();
}

function updateNewGroupField() {
  const creating = bookmarkGroup.value === '__new__';
  bookmarkNewGroupWrap.hidden = !creating;
  bookmarkNewGroup.required = creating;
  if (creating && !bookmarkNewGroup.value.trim()) bookmarkNewGroup.value = 'Bookmarks';
}

bookmarkGroup.addEventListener('change', updateNewGroupField);

function openBookmarkDialog(groupId, bookmarkId = null, options = {}) {
  editBookmarkId = bookmarkId;
  const found = bookmarkId ? findBookmark(bookmarkId) : null;
  const group = found?.group || (groupId ? getGroup(groupId) : null);
  const bookmark = found?.bookmark || null;
  const localAdd = Boolean(options.local && !bookmark && group);

  bookmarkDialogScopeGroupId = localAdd ? group.id : null;
  bookmarkDialogTitle.textContent = bookmark
    ? 'Edit bookmark'
    : localAdd
      ? `Add bookmark to ${group.name}`
      : 'Add bookmark';

  bookmarkDeleteBtn.hidden = !bookmark;
  bookmarkTitle.value = bookmark?.title || '';
  bookmarkUrl.value = bookmark?.url || '';
  bookmarkNewGroup.value = '';

  const selectedDestination = found
    ? destinationValue(found.group.id, found.folder?.id || null)
    : group
      ? destinationValue(group.id)
      : null;

  populateDestinationSelect(selectedDestination, localAdd ? group.id : null, !localAdd);
  bookmarkGroupWrap.hidden = false;
  bookmarkDialog.showModal();
  setTimeout(() => bookmarkTitle.focus(), 0);
}

bookmarkForm.addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();

  const title = bookmarkTitle.value.trim();
  const url = normalizedUrl(bookmarkUrl.value);
  if (!title || !url) return;

  let destination = parseDestination(bookmarkGroup.value);
  if (destination.newGroup) {
    const newName = bookmarkNewGroup.value.trim();
    if (!newName) {
      bookmarkNewGroup.focus();
      return;
    }
    let targetGroup = state.groups.find(group => group.name.trim().toLocaleLowerCase() === newName.toLocaleLowerCase());
    if (!targetGroup) {
      targetGroup = { id: makeId(), name: newName, bookmarks: [], folders: [], order: [] };
      state.groups.push(targetGroup);
    }
    destination = { newGroup: false, groupId: targetGroup.id, folderId: null };
  }

  const targetCollection = getCollection(destination.groupId, destination.folderId);
  if (!targetCollection) return;

  if (editBookmarkId) {
    const found = findBookmark(editBookmarkId);
    if (!found) return;
    found.bookmark.title = title;
    found.bookmark.url = url;
    const sourceFolderId = found.folder?.id || null;
    const sameLocation = found.group.id === destination.groupId && sourceFolderId === destination.folderId;
    if (!sameLocation) {
      const index = found.collection.findIndex(item => item.id === found.bookmark.id);
      if (index >= 0) found.collection.splice(index, 1);
      if (!sourceFolderId) removeRootOrderRef(found.group, 'bookmark', found.bookmark.id);
      targetCollection.push(found.bookmark);
      if (!destination.folderId) insertRootOrderRef(getGroup(destination.groupId), 'bookmark', found.bookmark.id);
    }
  } else {
    const bookmark = { id: makeId(), title, url };
    targetCollection.push(bookmark);
    if (!destination.folderId) insertRootOrderRef(getGroup(destination.groupId), 'bookmark', bookmark.id);
  }

  saveState();
  bookmarkDialog.close();
  render();
});

bookmarkDeleteBtn?.addEventListener('click', () => {
  if (!editBookmarkId) return;
  const found = findBookmark(editBookmarkId);
  if (!found) return;
  deleteBookmark(editBookmarkId);
  if (!findBookmark(editBookmarkId)) bookmarkDialog.close();
});

function populateFolderGroupSelect(selectedId) {
  folderGroup.innerHTML = '';
  state.groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    folderGroup.appendChild(option);
  });
  if (selectedId && state.groups.some(group => group.id === selectedId)) folderGroup.value = selectedId;
  else if (state.groups.length) folderGroup.value = state.groups[0].id;
}

function openFolderDialog(groupId = null, folderId = null, options = {}) {
  if (!state.groups.length) {
    showToast('Create a group first.');
    return;
  }

  editFolderId = folderId;
  editFolderGroupId = groupId;
  const group = groupId ? getGroup(groupId) : null;
  const folder = folderId ? getFolder(groupId, folderId) : null;
  const localAdd = Boolean(options.local && group && !folder);
  folderDialogScopeGroupId = localAdd ? group.id : null;

  folderDialogTitle.textContent = folder ? 'Edit subfolder' : localAdd ? `Add subfolder to ${group.name}` : 'Add subfolder';
  folderName.value = folder?.name || '';
  folderDeleteBtn.hidden = !folder;
  populateFolderGroupSelect(group?.id || null);
  folderGroupWrap.hidden = Boolean(folder || localAdd);

  folderDialog.showModal();
  setTimeout(() => folderName.focus(), 0);
}

folderForm?.addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const name = folderName.value.trim();
  if (!name) return;

  if (editFolderId) {
    const folder = getFolder(editFolderGroupId, editFolderId);
    if (folder) folder.name = name;
  } else {
    const targetGroupId = folderDialogScopeGroupId || folderGroup.value;
    const group = getGroup(targetGroupId);
    if (!group) return;
    const folder = { id: makeId(), name, collapsed: false, bookmarks: [] };
    group.folders.push(folder);
    insertRootOrderRef(group, 'folder', folder.id);
  }

  saveState();
  folderDialog.close();
  render();
});

folderDeleteBtn?.addEventListener('click', () => {
  if (!editFolderId || !editFolderGroupId) return;
  deleteFolder(editFolderGroupId, editFolderId);
  if (!getFolder(editFolderGroupId, editFolderId)) folderDialog.close();
});

function openGroupDialog(groupId = null) {
  editGroupId = groupId;
  const group = groupId ? getGroup(groupId) : null;
  groupDialogTitle.textContent = group ? 'Rename group' : 'Add group';
  groupName.value = group?.name || '';
  groupDialog.showModal();
  setTimeout(() => groupName.focus(), 0);
}

groupForm.addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();
  const name = groupName.value.trim();
  if (!name) return;

  if (editGroupId) {
    const group = getGroup(editGroupId);
    if (group) group.name = name;
  } else {
    state.groups.push({ id: makeId(), name, bookmarks: [], folders: [], order: [] });
  }

  saveState();
  groupDialog.close();
  render();
});

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.close)?.close());
});

function deleteBookmark(bookmarkId) {
  const found = findBookmark(bookmarkId);
  if (!found) return;
  if (!confirm(`Delete “${found.bookmark.title}”?`)) return;
  const index = found.collection.findIndex(item => item.id === bookmarkId);
  if (index >= 0) found.collection.splice(index, 1);
  if (!found.folder) removeRootOrderRef(found.group, 'bookmark', bookmarkId);
  saveState();
  render();
}

function deleteFolder(groupId, folderId) {
  const group = getGroup(groupId);
  const folder = getFolder(groupId, folderId);
  if (!group || !folder) return;
  const count = folder.bookmarks.length;
  const detail = count ? ` Its ${count} bookmark${count === 1 ? '' : 's'} will move to ${group.name}.` : '';
  if (!confirm(`Delete subfolder “${folder.name}”?${detail}`)) return;

  ensureGroupOrder(group);
  const folderIndex = group.order.findIndex(item => item.type === 'folder' && item.id === folderId);
  removeRootOrderRef(group, 'folder', folderId);
  group.folders = group.folders.filter(item => item.id !== folderId);

  const movedBookmarks = [...folder.bookmarks];
  group.bookmarks.push(...movedBookmarks);
  let insertAt = folderIndex >= 0 ? folderIndex : group.order.length;
  movedBookmarks.forEach(bookmark => {
    group.order.splice(insertAt, 0, { type: 'bookmark', id: bookmark.id });
    insertAt += 1;
  });

  saveState();
  render();
}

function deleteGroup(groupId) {
  const group = getGroup(groupId);
  if (!group) return;
  const count = countGroupBookmarks(group);
  const folderCount = group.folders.length;
  const parts = [];
  if (count) parts.push(`${count} bookmark${count === 1 ? '' : 's'}`);
  if (folderCount) parts.push(`${folderCount} subfolder${folderCount === 1 ? '' : 's'}`);
  const suffix = parts.length ? ` and its ${parts.join(' and ')}` : '';
  if (!confirm(`Delete “${group.name}”${suffix}?`)) return;
  state.groups = state.groups.filter(group => group.id !== groupId);
  saveState();
  render();
}

function clearGroupDropIndicators() {
  document.querySelectorAll('.group-card.group-drop-before, .group-card.group-drop-after').forEach(element => {
    element.classList.remove('group-drop-before', 'group-drop-after');
    delete element.dataset.groupDropPosition;
  });
}

function setupGroupDrag(node) {
  node.addEventListener('pointerdown', event => {
    if (!editing || searchInput.value.trim()) return;
    if (event.target.closest('.card-scroll, button, a, input, select')) return;
    pendingDragScrollState = captureScrollState();
  });

  node.addEventListener('dragstart', event => {
    // Never cancel a nested bookmark/folder drag that bubbles through the draggable card.
    if (event.target !== node) return;
    if (!editing || searchInput.value.trim()) return event.preventDefault();
    dragPayload = { type: 'group', groupId: node.dataset.groupId, scrollState: pendingDragScrollState || captureScrollState() };
    node.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.dataset.groupId);
  });

  node.addEventListener('dragend', event => {
    if (event.target !== node) return;
    node.classList.remove('dragging');
    clearGroupDropIndicators();
    dragPayload = null;
    pendingDragScrollState = null;
  });

  node.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'group' || dragPayload.groupId === node.dataset.groupId) return;
    event.preventDefault();
    event.stopPropagation();
    clearGroupDropIndicators();
    const rect = node.getBoundingClientRect();
    const position = window.innerWidth <= 760
      ? (event.clientY < rect.top + rect.height / 2 ? 'before' : 'after')
      : (event.clientX < rect.left + rect.width / 2 ? 'before' : 'after');
    node.dataset.groupDropPosition = position;
    node.classList.add(position === 'before' ? 'group-drop-before' : 'group-drop-after');
  });

  node.addEventListener('dragleave', event => {
    if (event.relatedTarget && node.contains(event.relatedTarget)) return;
    node.classList.remove('group-drop-before', 'group-drop-after');
    delete node.dataset.groupDropPosition;
  });

  node.addEventListener('drop', event => {
    if (dragPayload?.type !== 'group' || dragPayload.groupId === node.dataset.groupId) return;
    event.preventDefault();
    event.stopPropagation();
    const position = node.dataset.groupDropPosition || 'before';
    const payload = { ...dragPayload };
    clearGroupDropIndicators();

    const fromIndex = state.groups.findIndex(group => group.id === payload.groupId);
    if (fromIndex < 0) return;
    const [moved] = state.groups.splice(fromIndex, 1);
    let targetIndex = state.groups.findIndex(group => group.id === node.dataset.groupId);
    if (targetIndex < 0) {
      state.groups.push(moved);
    } else {
      if (position === 'after') targetIndex += 1;
      state.groups.splice(targetIndex, 0, moved);
    }
    saveState();
    render({ restoreScroll: payload.scrollState || null });
  });
}

function setupBoardGroupDrop() {
  // Grid reordering is intentionally card-to-card. The last card's right/bottom half is the end target.
}

function clearItemDropIndicators() {
  document.querySelectorAll('.top-level-item.top-drop-before, .top-level-item.top-drop-after').forEach(element => {
    element.classList.remove('top-drop-before', 'top-drop-after');
    delete element.dataset.topDropPosition;
  });
  document.querySelectorAll('.card-items.top-drop-end, .card-items.top-drop-start').forEach(element => {
    element.classList.remove('top-drop-end', 'top-drop-start');
  });
  document.querySelectorAll('.bookmark-row.bookmark-drop-before, .bookmark-row.bookmark-drop-after').forEach(element => {
    element.classList.remove('bookmark-drop-before', 'bookmark-drop-after');
    delete element.dataset.dropPosition;
  });
  document.querySelectorAll('.bookmark-list.bookmark-drop-end').forEach(element => element.classList.remove('bookmark-drop-end'));
  document.querySelectorAll('.subfolder-header.bookmark-folder-drop-target').forEach(element => element.classList.remove('bookmark-folder-drop-target'));
}

function setupBookmarkDrag(row) {
  const handle = row.querySelector('.bookmark-drag-handle');
  handle?.addEventListener('pointerdown', () => {
    if (editing && !searchInput.value.trim()) pendingDragScrollState = captureScrollState();
  });

  row.addEventListener('dragstart', event => {
    if (!editing || searchInput.value.trim() || !event.target.closest('.bookmark-drag-handle')) return event.preventDefault();
    event.stopPropagation();
    dragPayload = {
      type: 'bookmark',
      bookmarkId: row.dataset.bookmarkId,
      sourceGroupId: row.dataset.groupId,
      sourceFolderId: row.dataset.folderId || null,
      scrollState: pendingDragScrollState || captureScrollState()
    };
    row.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.bookmarkId);
  });

  row.addEventListener('dragend', event => {
    event.stopPropagation();
    row.classList.remove('dragging');
    clearItemDropIndicators();
    dragPayload = null;
    pendingDragScrollState = null;
  });

  row.addEventListener('dragover', event => {
    if (!dragPayload || dragPayload.type === 'group') return;
    const targetIsRoot = !row.dataset.folderId;
    if (dragPayload.type === 'folder' && !targetIsRoot) return;
    if (dragPayload.type === 'bookmark' && dragPayload.bookmarkId === row.dataset.bookmarkId) return;
    event.preventDefault();
    event.stopPropagation();
    clearItemDropIndicators();
    const rect = row.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    if (targetIsRoot) {
      row.dataset.topDropPosition = position;
      row.classList.add(position === 'before' ? 'top-drop-before' : 'top-drop-after');
    } else {
      row.dataset.dropPosition = position;
      row.classList.add(position === 'before' ? 'bookmark-drop-before' : 'bookmark-drop-after');
    }
  });

  row.addEventListener('dragleave', event => {
    if (event.relatedTarget && row.contains(event.relatedTarget)) return;
    row.classList.remove('top-drop-before', 'top-drop-after', 'bookmark-drop-before', 'bookmark-drop-after');
    delete row.dataset.topDropPosition;
    delete row.dataset.dropPosition;
  });

  row.addEventListener('drop', event => {
    if (!dragPayload || dragPayload.type === 'group') return;
    const targetIsRoot = !row.dataset.folderId;
    if (dragPayload.type === 'folder' && !targetIsRoot) return;
    if (dragPayload.type === 'bookmark' && dragPayload.bookmarkId === row.dataset.bookmarkId) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    const position = targetIsRoot ? (row.dataset.topDropPosition || 'before') : (row.dataset.dropPosition || 'before');
    clearItemDropIndicators();

    if (payload.type === 'folder') {
      moveFolderToRoot(payload, row.dataset.groupId, 'bookmark', row.dataset.bookmarkId, position);
    } else if (targetIsRoot) {
      moveBookmarkToRoot(payload, row.dataset.groupId, 'bookmark', row.dataset.bookmarkId, position);
    } else {
      moveBookmarkToFolder(payload, row.dataset.groupId, row.dataset.folderId, row.dataset.bookmarkId, position);
    }
  });
}

function setupFolderBookmarkListDrop(list) {
  list.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'bookmark') return;
    if (event.target.closest('.bookmark-row')) return;
    event.preventDefault();
    event.stopPropagation();
    clearItemDropIndicators();
    list.classList.add('bookmark-drop-end');
  });

  list.addEventListener('dragleave', event => {
    if (event.relatedTarget && list.contains(event.relatedTarget)) return;
    list.classList.remove('bookmark-drop-end');
  });

  list.addEventListener('drop', event => {
    if (dragPayload?.type !== 'bookmark') return;
    if (event.target.closest('.bookmark-row')) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    clearItemDropIndicators();
    moveBookmarkToFolder(payload, list.dataset.groupId, list.dataset.folderId, null, 'end');
  });
}

function setupFolderHeaderBookmarkDrop(folderNode, groupId, folderId) {
  const header = folderNode.querySelector('.subfolder-header');
  if (!header) return;

  header.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'bookmark') return;
    event.preventDefault();
    event.stopPropagation();
    clearItemDropIndicators();
    const rect = header.getBoundingClientRect();
    const relative = (event.clientY - rect.top) / Math.max(rect.height, 1);
    if (relative < 0.25) {
      folderNode.dataset.topDropPosition = 'before';
      folderNode.classList.add('top-drop-before');
    } else if (relative > 0.75) {
      folderNode.dataset.topDropPosition = 'after';
      folderNode.classList.add('top-drop-after');
    } else {
      header.classList.add('bookmark-folder-drop-target');
    }
  });

  header.addEventListener('dragleave', event => {
    if (event.relatedTarget && header.contains(event.relatedTarget)) return;
    header.classList.remove('bookmark-folder-drop-target');
    folderNode.classList.remove('top-drop-before', 'top-drop-after');
    delete folderNode.dataset.topDropPosition;
  });

  header.addEventListener('drop', event => {
    if (dragPayload?.type !== 'bookmark') return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    const position = folderNode.dataset.topDropPosition;
    const intoFolder = header.classList.contains('bookmark-folder-drop-target') && !position;
    clearItemDropIndicators();
    if (intoFolder) moveBookmarkToFolder(payload, groupId, folderId, null, 'end');
    else moveBookmarkToRoot(payload, groupId, 'folder', folderId, position || 'before');
  });
}

function setupFolderDrag(folderNode) {
  const header = folderNode.querySelector('.subfolder-header');
  if (!header) return;
  header.draggable = editing && !searchInput.value.trim();

  header.addEventListener('pointerdown', event => {
    if (!editing || searchInput.value.trim() || event.target.closest('.subfolder-edit')) return;
    pendingDragScrollState = captureScrollState();
  });

  header.addEventListener('dragstart', event => {
    if (event.target !== header) return;
    if (!editing || searchInput.value.trim() || event.target.closest('.subfolder-edit')) return event.preventDefault();
    event.stopPropagation();
    dragPayload = {
      type: 'folder',
      sourceGroupId: folderNode.dataset.groupId,
      folderId: folderNode.dataset.folderId,
      scrollState: pendingDragScrollState || captureScrollState()
    };
    folderNode.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', folderNode.dataset.folderId);
  });

  header.addEventListener('dragend', event => {
    if (event.target !== header) return;
    event.stopPropagation();
    folderNode.classList.remove('dragging');
    clearItemDropIndicators();
    dragPayload = null;
    pendingDragScrollState = null;
  });

  folderNode.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'folder') return;
    const isSelf = dragPayload.sourceGroupId === folderNode.dataset.groupId && dragPayload.folderId === folderNode.dataset.folderId;
    if (isSelf) return;
    event.preventDefault();
    event.stopPropagation();
    clearItemDropIndicators();
    const rect = folderNode.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    folderNode.dataset.topDropPosition = position;
    folderNode.classList.add(position === 'before' ? 'top-drop-before' : 'top-drop-after');
  });

  folderNode.addEventListener('dragleave', event => {
    if (event.relatedTarget && folderNode.contains(event.relatedTarget)) return;
    folderNode.classList.remove('top-drop-before', 'top-drop-after');
    delete folderNode.dataset.topDropPosition;
  });

  folderNode.addEventListener('drop', event => {
    if (dragPayload?.type !== 'folder') return;
    const isSelf = dragPayload.sourceGroupId === folderNode.dataset.groupId && dragPayload.folderId === folderNode.dataset.folderId;
    if (isSelf) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    const position = folderNode.dataset.topDropPosition || 'before';
    clearItemDropIndicators();
    moveFolderToRoot(payload, folderNode.dataset.groupId, 'folder', folderNode.dataset.folderId, position);
  });
}

function setupCardItemsDrop(list, groupId) {
  list.addEventListener('dragover', event => {
    if (!dragPayload || dragPayload.type === 'group') return;
    if (event.target.closest('.top-level-item')) return;
    event.preventDefault();
    event.stopPropagation();
    clearItemDropIndicators();
    list.classList.add('top-drop-end');
  });

  list.addEventListener('dragleave', event => {
    if (event.relatedTarget && list.contains(event.relatedTarget)) return;
    list.classList.remove('top-drop-end');
  });

  list.addEventListener('drop', event => {
    if (!dragPayload || dragPayload.type === 'group') return;
    if (event.target.closest('.top-level-item')) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    clearItemDropIndicators();
    if (payload.type === 'folder') moveFolderToRoot(payload, groupId, null, null, 'end');
    else moveBookmarkToRoot(payload, groupId, null, null, 'end');
  });
}

function setupCardHeaderItemDrop(groupNode, groupId) {
  const header = groupNode.querySelector('.group-header');
  if (!header) return;
  header.addEventListener('dragover', event => {
    if (!dragPayload || dragPayload.type === 'group') return;
    event.preventDefault();
    event.stopPropagation();
    clearItemDropIndicators();
    groupNode.querySelector('.card-items')?.classList.add('top-drop-start');
  });
  header.addEventListener('dragleave', event => {
    if (event.relatedTarget && header.contains(event.relatedTarget)) return;
    groupNode.querySelector('.card-items')?.classList.remove('top-drop-start');
  });
  header.addEventListener('drop', event => {
    if (!dragPayload || dragPayload.type === 'group') return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    clearItemDropIndicators();
    if (payload.type === 'folder') moveFolderToRoot(payload, groupId, null, null, 'start');
    else moveBookmarkToRoot(payload, groupId, null, null, 'start');
  });
}

function detachBookmark(payload) {
  const sourceGroup = getGroup(payload.sourceGroupId);
  const sourceCollection = getCollection(payload.sourceGroupId, payload.sourceFolderId || null);
  if (!sourceGroup || !sourceCollection) return null;
  const index = sourceCollection.findIndex(bookmark => bookmark.id === payload.bookmarkId);
  if (index < 0) return null;
  const [bookmark] = sourceCollection.splice(index, 1);
  if (!payload.sourceFolderId) removeRootOrderRef(sourceGroup, 'bookmark', bookmark.id);
  return bookmark;
}

function moveBookmarkToFolder(payload, targetGroupId, targetFolderId, targetBookmarkId = null, position = 'end') {
  const bookmark = detachBookmark(payload);
  const targetCollection = getCollection(targetGroupId, targetFolderId);
  if (!bookmark || !targetCollection) return;

  if (!targetBookmarkId || position === 'end') targetCollection.push(bookmark);
  else {
    let index = targetCollection.findIndex(item => item.id === targetBookmarkId);
    if (index < 0) targetCollection.push(bookmark);
    else {
      if (position === 'after') index += 1;
      targetCollection.splice(index, 0, bookmark);
    }
  }
  saveState();
  render({ restoreScroll: payload.scrollState || null });
}

function moveBookmarkToRoot(payload, targetGroupId, targetType = null, targetId = null, position = 'end') {
  const bookmark = detachBookmark(payload);
  const targetGroup = getGroup(targetGroupId);
  if (!bookmark || !targetGroup) return;
  targetGroup.bookmarks.push(bookmark);
  insertRootOrderRef(targetGroup, 'bookmark', bookmark.id, targetType, targetId, position);
  saveState();
  render({ restoreScroll: payload.scrollState || null });
}

function moveFolderToRoot(payload, targetGroupId, targetType = null, targetId = null, position = 'end') {
  const sourceGroup = getGroup(payload.sourceGroupId);
  const targetGroup = getGroup(targetGroupId);
  if (!sourceGroup || !targetGroup) return;
  const index = sourceGroup.folders.findIndex(folder => folder.id === payload.folderId);
  if (index < 0) return;
  const [folder] = sourceGroup.folders.splice(index, 1);
  removeRootOrderRef(sourceGroup, 'folder', folder.id);
  targetGroup.folders.push(folder);
  insertRootOrderRef(targetGroup, 'folder', folder.id, targetType, targetId, position);
  saveState();
  render({ restoreScroll: payload.scrollState || null });
}

async function importSelectedFile() {
  const file = importFile.files?.[0];
  if (!file) return;

  const originalLabel = importBtn.textContent;
  importBtn.disabled = true;
  importBtn.textContent = 'Importing…';

  try {
    const text = await file.text();
    const parsed = parseBookmarkHtml(text);
    const plan = buildImportPlan(parsed);

    if (!plan.additions.length) {
      const details = [];
      if (plan.duplicates) details.push(`${plan.duplicates} duplicate${plan.duplicates === 1 ? '' : 's'} skipped`);
      if (plan.ignored) details.push(`${plan.ignored} unsupported or invalid link${plan.ignored === 1 ? '' : 's'} ignored`);
      showToast(details.length ? `No new bookmarks. ${details.join(', ')}.` : 'No bookmarks were found in that file.');
      return;
    }

    const groupsByName = new Map(state.groups.map(group => [group.name.trim().toLocaleLowerCase(), group]));

    plan.additions.forEach(item => {
      const groupKey = item.groupName.trim().toLocaleLowerCase();
      let group = groupsByName.get(groupKey);
      if (!group) {
        group = { id: makeId(), name: item.groupName, bookmarks: [], folders: [], order: [] };
        state.groups.push(group);
        groupsByName.set(groupKey, group);
      }

      if (item.folderName) {
        const folderKey = item.folderName.trim().toLocaleLowerCase();
        let folder = group.folders.find(existing => existing.name.trim().toLocaleLowerCase() === folderKey);
        if (!folder) {
          folder = { id: makeId(), name: item.folderName, collapsed: false, bookmarks: [] };
          group.folders.push(folder);
          insertRootOrderRef(group, 'folder', folder.id);
        }
        folder.bookmarks.push({ id: makeId(), title: item.title, url: item.url });
      } else {
        const bookmark = { id: makeId(), title: item.title, url: item.url };
        group.bookmarks.push(bookmark);
        insertRootOrderRef(group, 'bookmark', bookmark.id);
      }
    });

    saveState();
    render();

    const groupCount = new Set(plan.additions.map(item => item.groupName)).size;
    const summary = [`Imported ${plan.additions.length} bookmark${plan.additions.length === 1 ? '' : 's'} into ${groupCount} group${groupCount === 1 ? '' : 's'}.`];
    if (plan.duplicates) summary.push(`Skipped ${plan.duplicates} duplicate${plan.duplicates === 1 ? '' : 's'}.`);
    if (plan.ignored) summary.push(`Ignored ${plan.ignored} unsupported or invalid link${plan.ignored === 1 ? '' : 's'}.`);
    showToast(summary.join(' '));
  } catch (error) {
    console.error(error);
    showToast('Launchpad could not read that bookmark file.');
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = originalLabel;
    importFile.value = '';
  }
}

let toastTimer = null;
function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
}

function parseBookmarkHtml(html) {
  const tokenPattern = /<DL\b[^>]*>|<\/DL\s*>|<H3\b[^>]*>[\s\S]*?<\/H3\s*>|<A\b[^>]*>[\s\S]*?<\/A\s*>/gi;
  const tokens = html.match(tokenPattern) || [];
  const stack = [];
  const bookmarks = [];
  let pendingFolder = null;
  let ignored = 0;

  for (const token of tokens) {
    if (/^<H3\b/i.test(token)) {
      pendingFolder = textFromHtmlToken(token, 'h3') || 'Untitled';
      continue;
    }
    if (/^<DL\b/i.test(token)) {
      stack.push(pendingFolder);
      pendingFolder = null;
      continue;
    }
    if (/^<\/DL/i.test(token)) {
      stack.pop();
      continue;
    }
    if (/^<A\b/i.test(token)) {
      const parsed = anchorFromHtmlToken(token);
      if (!parsed) {
        ignored += 1;
        continue;
      }
      const url = canonicalHttpUrl(parsed.url);
      if (!url) {
        ignored += 1;
        continue;
      }
      const path = stack.filter(Boolean);
      bookmarks.push({
        groupName: path[0] || 'Imported',
        folderName: path.length > 1 ? path.slice(1).join(' › ') : null,
        title: parsed.title || titleFromUrl(url),
        url
      });
    }
  }

  if (bookmarks.length === 0) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('a[href]').forEach(anchor => {
      const url = canonicalHttpUrl(anchor.getAttribute('href') || '');
      if (!url) {
        ignored += 1;
        return;
      }
      bookmarks.push({
        groupName: 'Imported',
        folderName: null,
        title: anchor.textContent?.trim() || titleFromUrl(url),
        url
      });
    });
  }

  return { bookmarks, ignored };
}

function buildImportPlan(parsed) {
  const seen = new Set();
  state.groups.forEach(group => {
    group.bookmarks.forEach(bookmark => {
      const canonical = canonicalHttpUrl(bookmark.url);
      if (canonical) seen.add(canonical);
    });
    group.folders.forEach(folder => {
      folder.bookmarks.forEach(bookmark => {
        const canonical = canonicalHttpUrl(bookmark.url);
        if (canonical) seen.add(canonical);
      });
    });
  });

  const additions = [];
  let duplicates = 0;
  parsed.bookmarks.forEach(bookmark => {
    if (seen.has(bookmark.url)) {
      duplicates += 1;
      return;
    }
    seen.add(bookmark.url);
    additions.push(bookmark);
  });
  return { additions, duplicates, ignored: parsed.ignored };
}

function textFromHtmlToken(token, selector) {
  const doc = new DOMParser().parseFromString(token, 'text/html');
  return doc.querySelector(selector)?.textContent?.trim() || '';
}

function anchorFromHtmlToken(token) {
  const doc = new DOMParser().parseFromString(token, 'text/html');
  const anchor = doc.querySelector('a[href]');
  if (!anchor) return null;
  return { url: anchor.getAttribute('href')?.trim() || '', title: anchor.textContent?.trim() || '' };
}

function canonicalHttpUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

function titleFromUrl(value) {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, '') || value;
  } catch {
    return value;
  }
}

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === 'Escape' && editing && !document.querySelector('dialog[open]')) setEditing(false);
});
