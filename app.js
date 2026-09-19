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
  source.groups = source.groups.map(group => ({
    id: group.id || makeId(),
    name: group.name || 'Untitled',
    bookmarks: Array.isArray(group.bookmarks) ? group.bookmarks : [],
    folders: Array.isArray(group.folders)
      ? group.folders.map(folder => ({
          id: folder.id || makeId(),
          name: folder.name || 'Untitled',
          collapsed: Boolean(folder.collapsed),
          bookmarks: Array.isArray(folder.bookmarks) ? folder.bookmarks : []
        }))
      : []
  }));
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

function render() {
  const q = searchInput.value.trim().toLowerCase();
  board.innerHTML = '';

  state.groups.forEach(group => {
    const groupMatch = Boolean(q && group.name.toLowerCase().includes(q));
    const rootBookmarks = group.bookmarks.filter(bookmark => !q || groupMatch || bookmarkMatches(bookmark, q));
    const folderViews = group.folders.map(folder => {
      const folderMatch = Boolean(q && folder.name.toLowerCase().includes(q));
      const bookmarks = folder.bookmarks.filter(bookmark => !q || groupMatch || folderMatch || bookmarkMatches(bookmark, q));
      return { folder, bookmarks, visible: !q || groupMatch || folderMatch || bookmarks.length > 0 };
    }).filter(view => view.visible);

    if (q && !groupMatch && rootBookmarks.length === 0 && folderViews.length === 0) return;

    const groupNode = groupTemplate.content.firstElementChild.cloneNode(true);
    groupNode.dataset.groupId = group.id;
    groupNode.querySelector('.group-title').textContent = group.name;
    groupNode.draggable = editing && !q;

    const rootList = groupNode.querySelector('.root-bookmarks');
    rootList.dataset.groupId = group.id;
    rootList.dataset.folderId = '';
    rootBookmarks.forEach(bookmark => renderBookmarkRow(bookmark, group.id, null, rootList));
    setupListDrop(rootList);

    const folderList = groupNode.querySelector('.subfolder-list');
    folderList.dataset.groupId = group.id;

    folderViews.forEach(({ folder, bookmarks }) => {
      const folderNode = subfolderTemplate.content.firstElementChild.cloneNode(true);
      folderNode.dataset.groupId = group.id;
      folderNode.dataset.folderId = folder.id;

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

      toggle?.addEventListener('click', () => {
        if (q) return;
        folder.collapsed = !folder.collapsed;
        saveState();
        render();
      });

      folderNode.querySelector('.subfolder-edit')?.addEventListener('click', () => openFolderDialog(group.id, folder.id));

      const folderBookmarks = folderNode.querySelector('.subfolder-bookmarks');
      folderBookmarks.dataset.groupId = group.id;
      folderBookmarks.dataset.folderId = folder.id;
      bookmarks.forEach(bookmark => renderBookmarkRow(bookmark, group.id, folder.id, folderBookmarks));
      setupListDrop(folderBookmarks);
      setupFolderBookmarkDrop(folderNode.querySelector('.subfolder-header'), group.id, folder.id);
      setupFolderDrag(folderNode);
      folderList.appendChild(folderNode);
    });

    setupFolderListDrop(folderList);

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
      targetGroup = { id: makeId(), name: newName, bookmarks: [], folders: [] };
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
    const sameLocation = found.group.id === destination.groupId && (found.folder?.id || null) === destination.folderId;
    if (!sameLocation) {
      const index = found.collection.findIndex(item => item.id === found.bookmark.id);
      if (index >= 0) found.collection.splice(index, 1);
      targetCollection.push(found.bookmark);
    }
  } else {
    targetCollection.push({ id: makeId(), title, url });
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
    group.folders.push({ id: makeId(), name, collapsed: false, bookmarks: [] });
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
    state.groups.push({ id: makeId(), name, bookmarks: [], folders: [] });
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
  group.bookmarks.push(...folder.bookmarks);
  group.folders = group.folders.filter(item => item.id !== folderId);
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
  document.querySelectorAll('.group-card.group-drop-target').forEach(element => element.classList.remove('group-drop-target'));
  board.classList.remove('group-drop-end');
}

function setupGroupDrag(node) {
  node.addEventListener('dragstart', event => {
    if (!editing || searchInput.value.trim()) return event.preventDefault();
    if (event.target.closest('.card-scroll, button, a, input, select')) return event.preventDefault();
    dragPayload = { type: 'group', groupId: node.dataset.groupId };
    node.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.dataset.groupId);
  });

  node.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    clearGroupDropIndicators();
    dragPayload = null;
  });

  node.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'group' || dragPayload.groupId === node.dataset.groupId) return;
    event.preventDefault();
    event.stopPropagation();
    clearGroupDropIndicators();
    node.classList.add('group-drop-target');
  });

  node.addEventListener('dragleave', event => {
    if (event.relatedTarget && node.contains(event.relatedTarget)) return;
    node.classList.remove('group-drop-target');
  });

  node.addEventListener('drop', event => {
    if (dragPayload?.type !== 'group') return;
    event.preventDefault();
    event.stopPropagation();
    node.classList.remove('group-drop-target');

    const fromIndex = state.groups.findIndex(group => group.id === dragPayload.groupId);
    const toIndex = state.groups.findIndex(group => group.id === node.dataset.groupId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const [moved] = state.groups.splice(fromIndex, 1);
    const adjustedIndex = state.groups.findIndex(group => group.id === node.dataset.groupId);
    state.groups.splice(adjustedIndex, 0, moved);
    saveState();
    render();
  });
}

function setupBoardGroupDrop() {
  board.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'group') return;
    if (event.target.closest('.group-card')) return;
    event.preventDefault();
    clearGroupDropIndicators();
    board.classList.add('group-drop-end');
  });

  board.addEventListener('dragleave', event => {
    if (event.relatedTarget && board.contains(event.relatedTarget)) return;
    board.classList.remove('group-drop-end');
  });

  board.addEventListener('drop', event => {
    if (dragPayload?.type !== 'group') return;
    if (event.target.closest('.group-card')) return;
    event.preventDefault();
    board.classList.remove('group-drop-end');

    const fromIndex = state.groups.findIndex(group => group.id === dragPayload.groupId);
    if (fromIndex < 0) return;
    const [moved] = state.groups.splice(fromIndex, 1);
    state.groups.push(moved);
    saveState();
    render();
  });
}

function clearBookmarkDropIndicators() {
  document.querySelectorAll('.bookmark-row.bookmark-drop-before, .bookmark-row.bookmark-drop-after').forEach(element => {
    element.classList.remove('bookmark-drop-before', 'bookmark-drop-after');
    delete element.dataset.dropPosition;
  });
  document.querySelectorAll('.bookmark-list.bookmark-drop-end').forEach(element => element.classList.remove('bookmark-drop-end'));
  document.querySelectorAll('.subfolder-header.bookmark-folder-drop-target').forEach(element => element.classList.remove('bookmark-folder-drop-target'));
}

function setupBookmarkDrag(row) {
  row.addEventListener('dragstart', event => {
    if (!editing || searchInput.value.trim() || !event.target.closest('.bookmark-drag-handle')) return event.preventDefault();
    event.stopPropagation();
    dragPayload = {
      type: 'bookmark',
      bookmarkId: row.dataset.bookmarkId,
      sourceGroupId: row.dataset.groupId,
      sourceFolderId: row.dataset.folderId || null
    };
    row.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', row.dataset.bookmarkId);
  });

  row.addEventListener('dragend', event => {
    event.stopPropagation();
    row.classList.remove('dragging');
    clearBookmarkDropIndicators();
    dragPayload = null;
  });

  row.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'bookmark' || dragPayload.bookmarkId === row.dataset.bookmarkId) return;
    event.preventDefault();
    event.stopPropagation();
    clearBookmarkDropIndicators();
    const rect = row.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    row.dataset.dropPosition = position;
    row.classList.add(position === 'before' ? 'bookmark-drop-before' : 'bookmark-drop-after');
  });

  row.addEventListener('dragleave', event => {
    if (event.relatedTarget && row.contains(event.relatedTarget)) return;
    row.classList.remove('bookmark-drop-before', 'bookmark-drop-after');
    delete row.dataset.dropPosition;
  });

  row.addEventListener('drop', event => {
    if (dragPayload?.type !== 'bookmark' || dragPayload.bookmarkId === row.dataset.bookmarkId) return;
    event.preventDefault();
    event.stopPropagation();
    const position = row.dataset.dropPosition || 'before';
    const payload = { ...dragPayload };
    clearBookmarkDropIndicators();
    moveBookmark(payload, row.dataset.groupId, row.dataset.folderId || null, row.dataset.bookmarkId, position);
  });
}

function setupListDrop(list) {
  list.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'bookmark') return;
    if (event.target.closest('.bookmark-row')) return;
    event.preventDefault();
    event.stopPropagation();
    clearBookmarkDropIndicators();
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
    clearBookmarkDropIndicators();
    moveBookmark(payload, list.dataset.groupId, list.dataset.folderId || null, null, 'end');
  });
}

function setupFolderBookmarkDrop(header, groupId, folderId) {
  if (!header) return;
  header.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'bookmark') return;
    event.preventDefault();
    event.stopPropagation();
    clearBookmarkDropIndicators();
    header.classList.add('bookmark-folder-drop-target');
  });
  header.addEventListener('dragleave', event => {
    if (event.relatedTarget && header.contains(event.relatedTarget)) return;
    header.classList.remove('bookmark-folder-drop-target');
  });
  header.addEventListener('drop', event => {
    if (dragPayload?.type !== 'bookmark') return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    clearBookmarkDropIndicators();
    moveBookmark(payload, groupId, folderId, null, 'end');
  });
}

function moveBookmark(payload, targetGroupId, targetFolderId = null, targetBookmarkId = null, position = 'end') {
  const sourceCollection = getCollection(payload.sourceGroupId, payload.sourceFolderId || null);
  const targetCollection = getCollection(targetGroupId, targetFolderId);
  if (!sourceCollection || !targetCollection) return;

  const sourceIndex = sourceCollection.findIndex(bookmark => bookmark.id === payload.bookmarkId);
  if (sourceIndex < 0) return;
  const [moved] = sourceCollection.splice(sourceIndex, 1);

  if (!targetBookmarkId || position === 'end') {
    targetCollection.push(moved);
  } else {
    let targetIndex = targetCollection.findIndex(bookmark => bookmark.id === targetBookmarkId);
    if (targetIndex < 0) targetCollection.push(moved);
    else {
      if (position === 'after') targetIndex += 1;
      targetCollection.splice(targetIndex, 0, moved);
    }
  }

  saveState();
  render();
}

function clearFolderDropIndicators() {
  document.querySelectorAll('.subfolder.folder-drop-before, .subfolder.folder-drop-after').forEach(element => {
    element.classList.remove('folder-drop-before', 'folder-drop-after');
    delete element.dataset.dropPosition;
  });
  document.querySelectorAll('.subfolder-list.folder-drop-end').forEach(element => element.classList.remove('folder-drop-end'));
}

function setupFolderDrag(folderNode) {
  const handle = folderNode.querySelector('.subfolder-drag-handle');
  if (!handle) return;
  handle.draggable = editing && !searchInput.value.trim();

  handle.addEventListener('dragstart', event => {
    if (!editing || searchInput.value.trim()) return event.preventDefault();
    event.stopPropagation();
    dragPayload = { type: 'folder', groupId: folderNode.dataset.groupId, folderId: folderNode.dataset.folderId };
    folderNode.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', folderNode.dataset.folderId);
  });

  handle.addEventListener('dragend', event => {
    event.stopPropagation();
    folderNode.classList.remove('dragging');
    clearFolderDropIndicators();
    dragPayload = null;
  });

  folderNode.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'folder' || dragPayload.groupId !== folderNode.dataset.groupId || dragPayload.folderId === folderNode.dataset.folderId) return;
    event.preventDefault();
    event.stopPropagation();
    clearFolderDropIndicators();
    const rect = folderNode.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    folderNode.dataset.dropPosition = position;
    folderNode.classList.add(position === 'before' ? 'folder-drop-before' : 'folder-drop-after');
  });

  folderNode.addEventListener('dragleave', event => {
    if (event.relatedTarget && folderNode.contains(event.relatedTarget)) return;
    folderNode.classList.remove('folder-drop-before', 'folder-drop-after');
    delete folderNode.dataset.dropPosition;
  });

  folderNode.addEventListener('drop', event => {
    if (dragPayload?.type !== 'folder' || dragPayload.groupId !== folderNode.dataset.groupId) return;
    event.preventDefault();
    event.stopPropagation();
    const position = folderNode.dataset.dropPosition || 'before';
    const payload = { ...dragPayload };
    clearFolderDropIndicators();
    moveFolder(payload.groupId, payload.folderId, folderNode.dataset.folderId, position);
  });
}

function setupFolderListDrop(list) {
  list.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'folder' || dragPayload.groupId !== list.dataset.groupId) return;
    if (event.target.closest('.subfolder')) return;
    event.preventDefault();
    event.stopPropagation();
    clearFolderDropIndicators();
    list.classList.add('folder-drop-end');
  });
  list.addEventListener('dragleave', event => {
    if (event.relatedTarget && list.contains(event.relatedTarget)) return;
    list.classList.remove('folder-drop-end');
  });
  list.addEventListener('drop', event => {
    if (dragPayload?.type !== 'folder' || dragPayload.groupId !== list.dataset.groupId) return;
    if (event.target.closest('.subfolder')) return;
    event.preventDefault();
    event.stopPropagation();
    const payload = { ...dragPayload };
    clearFolderDropIndicators();
    moveFolder(payload.groupId, payload.folderId, null, 'end');
  });
}

function moveFolder(groupId, folderId, targetFolderId = null, position = 'end') {
  const group = getGroup(groupId);
  if (!group) return;
  const sourceIndex = group.folders.findIndex(folder => folder.id === folderId);
  if (sourceIndex < 0) return;
  const [moved] = group.folders.splice(sourceIndex, 1);

  if (!targetFolderId || position === 'end') group.folders.push(moved);
  else {
    let targetIndex = group.folders.findIndex(folder => folder.id === targetFolderId);
    if (targetIndex < 0) group.folders.push(moved);
    else {
      if (position === 'after') targetIndex += 1;
      group.folders.splice(targetIndex, 0, moved);
    }
  }
  saveState();
  render();
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
        group = { id: makeId(), name: item.groupName, bookmarks: [], folders: [] };
        state.groups.push(group);
        groupsByName.set(groupKey, group);
      }

      if (item.folderName) {
        const folderKey = item.folderName.trim().toLocaleLowerCase();
        let folder = group.folders.find(existing => existing.name.trim().toLocaleLowerCase() === folderKey);
        if (!folder) {
          folder = { id: makeId(), name: item.folderName, collapsed: false, bookmarks: [] };
          group.folders.push(folder);
        }
        folder.bookmarks.push({ id: makeId(), title: item.title, url: item.url });
      } else {
        group.bookmarks.push({ id: makeId(), title: item.title, url: item.url });
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
