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
      ]
    },
    {
      id: makeId(),
      name: 'Useful',
      bookmarks: [
        { id: makeId(), title: 'Wikipedia', url: 'https://www.wikipedia.org/' },
        { id: makeId(), title: 'Internet Archive', url: 'https://archive.org/' }
      ]
    }
  ]
};

let state = loadState();
let editing = false;
let editBookmarkId = null;
let editGroupId = null;
let dragPayload = null;

const board = document.querySelector('#board');
const emptyState = document.querySelector('#emptyState');
const searchInput = document.querySelector('#searchInput');
const editBtn = document.querySelector('#editBtn');
const themeBtn = document.querySelector('#themeBtn');
const appearanceBtn = document.querySelector('#appearanceBtn');
const appearancePanel = document.querySelector('#appearancePanel');
const fontSelect = document.querySelector('#fontSelect');
const fontSizeSelect = document.querySelector('#fontSizeSelect');
const addGroupBtn = document.querySelector('#addGroupBtn');
const bookmarkDialog = document.querySelector('#bookmarkDialog');
const bookmarkForm = document.querySelector('#bookmarkForm');
const bookmarkDialogTitle = document.querySelector('#bookmarkDialogTitle');
const bookmarkTitle = document.querySelector('#bookmarkTitle');
const bookmarkUrl = document.querySelector('#bookmarkUrl');
const bookmarkGroup = document.querySelector('#bookmarkGroup');
const groupDialog = document.querySelector('#groupDialog');
const groupForm = document.querySelector('#groupForm');
const groupDialogTitle = document.querySelector('#groupDialogTitle');
const groupName = document.querySelector('#groupName');
const groupTemplate = document.querySelector('#groupTemplate');
const bookmarkTemplate = document.querySelector('#bookmarkTemplate');

applyTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
applyFont(localStorage.getItem(FONT_KEY) || 'system');
applyFontSize(localStorage.getItem(FONT_SIZE_KEY) || '14');
render();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : structuredClone(seed);
  } catch {
    return structuredClone(seed);
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

function render() {
  const q = searchInput.value.trim().toLowerCase();
  board.innerHTML = '';

  state.groups.forEach(group => {
    const matchingBookmarks = group.bookmarks.filter(bookmark => {
      if (!q) return true;
      return bookmark.title.toLowerCase().includes(q) || bookmark.url.toLowerCase().includes(q) || group.name.toLowerCase().includes(q);
    });

    if (q && matchingBookmarks.length === 0 && !group.name.toLowerCase().includes(q)) return;

    const groupNode = groupTemplate.content.firstElementChild.cloneNode(true);
    groupNode.dataset.groupId = group.id;
    groupNode.querySelector('.group-title').textContent = group.name;
    groupNode.draggable = editing && !q;

    const list = groupNode.querySelector('.bookmark-list');
    list.dataset.groupId = group.id;

    matchingBookmarks.forEach(bookmark => {
      const row = bookmarkTemplate.content.firstElementChild.cloneNode(true);
      row.dataset.bookmarkId = bookmark.id;
      row.dataset.groupId = group.id;
      row.draggable = editing && !q;

      const link = row.querySelector('.bookmark-link');
      link.href = bookmark.url;
      link.querySelector('.bookmark-title').textContent = bookmark.title;
      const favicon = link.querySelector('.favicon');
      favicon.src = faviconFor(bookmark.url);
      favicon.addEventListener('error', () => { favicon.style.visibility = 'hidden'; });

      row.querySelector('.bookmark-edit').addEventListener('click', e => {
        e.preventDefault();
        openBookmarkDialog(group.id, bookmark.id);
      });
      row.querySelector('.bookmark-delete').addEventListener('click', e => {
        e.preventDefault();
        deleteBookmark(group.id, bookmark.id);
      });

      setupBookmarkDrag(row);
      list.appendChild(row);
    });

    groupNode.querySelector('.add-bookmark').addEventListener('click', () => openBookmarkDialog(group.id));
    groupNode.querySelector('.rename-group').addEventListener('click', () => openGroupDialog(group.id));
    groupNode.querySelector('.delete-group').addEventListener('click', () => deleteGroup(group.id));

    setupGroupDrag(groupNode);
    setupListDrop(list);
    board.appendChild(groupNode);
  });

  emptyState.hidden = state.groups.length > 0;
}

function setEditing(value) {
  editing = value;
  document.body.classList.toggle('editing', editing);
  editBtn.classList.toggle('active', editing);
  editBtn.textContent = editing ? 'Done' : 'Edit';
  addGroupBtn.hidden = !editing;
  render();
}

editBtn.addEventListener('click', () => setEditing(!editing));
searchInput.addEventListener('input', render);
addGroupBtn.addEventListener('click', () => openGroupDialog());

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
document.addEventListener('click', () => setAppearancePanel(false));

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

function applyFont(font) {
  const fonts = {
    system: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif',
    bookerly: '\"Bookerly\", ui-serif, Georgia, serif',
    'ibm-plex-mono': '\"IBM Plex Mono\", ui-monospace, SFMono-Regular, Menlo, monospace',
    'ia-writer-duo': '\"iA Writer Duo\", \"iA Writer Duospace\", ui-monospace, SFMono-Regular, Menlo, monospace'
  };
  const selected = fonts[font] ? font : 'system';
  document.documentElement.style.setProperty('--app-font', fonts[selected]);
  fontSelect.value = selected;
  localStorage.setItem(FONT_KEY, selected);
}

function applyFontSize(size) {
  const value = Math.min(18, Math.max(13, Number(size) || 14));
  document.documentElement.style.setProperty('--bookmark-font-size', `${value}px`);
  fontSizeSelect.value = String(value);
  localStorage.setItem(FONT_SIZE_KEY, String(value));
}

function setAppearancePanel(open) {
  appearancePanel.hidden = !open;
  appearanceBtn.setAttribute('aria-expanded', String(open));
}

function populateGroupSelect(selectedId) {
  bookmarkGroup.innerHTML = '';
  state.groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    option.selected = group.id === selectedId;
    bookmarkGroup.appendChild(option);
  });
}

function openBookmarkDialog(groupId, bookmarkId = null) {
  editBookmarkId = bookmarkId;
  const group = state.groups.find(g => g.id === groupId);
  const bookmark = bookmarkId ? group?.bookmarks.find(b => b.id === bookmarkId) : null;
  bookmarkDialogTitle.textContent = bookmark ? 'Edit bookmark' : 'Add bookmark';
  bookmarkTitle.value = bookmark?.title || '';
  bookmarkUrl.value = bookmark?.url || '';
  populateGroupSelect(groupId);
  bookmarkDialog.showModal();
  setTimeout(() => bookmarkTitle.focus(), 0);
}

bookmarkForm.addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();

  const title = bookmarkTitle.value.trim();
  const url = normalizedUrl(bookmarkUrl.value);
  const targetGroupId = bookmarkGroup.value;
  if (!title || !url) return;

  if (editBookmarkId) {
    let currentGroup = null;
    let item = null;
    for (const group of state.groups) {
      const found = group.bookmarks.find(b => b.id === editBookmarkId);
      if (found) { currentGroup = group; item = found; break; }
    }
    if (!item) return;
    item.title = title;
    item.url = url;
    if (currentGroup.id !== targetGroupId) {
      currentGroup.bookmarks = currentGroup.bookmarks.filter(b => b.id !== item.id);
      state.groups.find(g => g.id === targetGroupId)?.bookmarks.push(item);
    }
  } else {
    state.groups.find(g => g.id === targetGroupId)?.bookmarks.push({ id: makeId(), title, url });
  }

  saveState();
  bookmarkDialog.close();
  render();
});

function openGroupDialog(groupId = null) {
  editGroupId = groupId;
  const group = groupId ? state.groups.find(g => g.id === groupId) : null;
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
    const group = state.groups.find(g => g.id === editGroupId);
    if (group) group.name = name;
  } else {
    state.groups.push({ id: makeId(), name, bookmarks: [] });
  }

  saveState();
  groupDialog.close();
  render();
});

document.querySelectorAll('[data-close]').forEach(button => {
  button.addEventListener('click', () => document.getElementById(button.dataset.close)?.close());
});

function deleteBookmark(groupId, bookmarkId) {
  const group = state.groups.find(g => g.id === groupId);
  const bookmark = group?.bookmarks.find(b => b.id === bookmarkId);
  if (!group || !bookmark) return;
  if (!confirm(`Delete “${bookmark.title}”?`)) return;
  group.bookmarks = group.bookmarks.filter(b => b.id !== bookmarkId);
  saveState();
  render();
}

function deleteGroup(groupId) {
  const group = state.groups.find(g => g.id === groupId);
  if (!group) return;
  const suffix = group.bookmarks.length ? ` and its ${group.bookmarks.length} bookmark${group.bookmarks.length === 1 ? '' : 's'}` : '';
  if (!confirm(`Delete “${group.name}”${suffix}?`)) return;
  state.groups = state.groups.filter(g => g.id !== groupId);
  saveState();
  render();
}

function setupGroupDrag(node) {
  node.addEventListener('dragstart', event => {
    if (!editing || searchInput.value.trim()) return event.preventDefault();
    if (event.target.closest('.bookmark-row')) return event.preventDefault();
    dragPayload = { type: 'group', groupId: node.dataset.groupId };
    node.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  });

  node.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragPayload = null;
  });

  node.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'group' || dragPayload.groupId === node.dataset.groupId) return;
    event.preventDefault();
    node.classList.add('drag-over');
  });

  node.addEventListener('dragleave', () => node.classList.remove('drag-over'));

  node.addEventListener('drop', event => {
    if (dragPayload?.type !== 'group') return;
    event.preventDefault();
    node.classList.remove('drag-over');
    const fromIndex = state.groups.findIndex(g => g.id === dragPayload.groupId);
    const toIndex = state.groups.findIndex(g => g.id === node.dataset.groupId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    const [moved] = state.groups.splice(fromIndex, 1);
    state.groups.splice(toIndex, 0, moved);
    saveState();
    render();
  });
}

function setupBookmarkDrag(row) {
  row.addEventListener('dragstart', event => {
    if (!editing || searchInput.value.trim()) return event.preventDefault();
    event.stopPropagation();
    dragPayload = {
      type: 'bookmark',
      bookmarkId: row.dataset.bookmarkId,
      sourceGroupId: row.dataset.groupId
    };
    row.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
  });

  row.addEventListener('dragend', event => {
    event.stopPropagation();
    row.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragPayload = null;
  });

  row.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'bookmark' || dragPayload.bookmarkId === row.dataset.bookmarkId) return;
    event.preventDefault();
  });

  row.addEventListener('drop', event => {
    if (dragPayload?.type !== 'bookmark') return;
    event.preventDefault();
    event.stopPropagation();
    moveBookmark(dragPayload, row.dataset.groupId, row.dataset.bookmarkId);
  });
}

function setupListDrop(list) {
  list.addEventListener('dragover', event => {
    if (dragPayload?.type !== 'bookmark') return;
    event.preventDefault();
    list.classList.add('drag-over');
  });

  list.addEventListener('dragleave', event => {
    if (!list.contains(event.relatedTarget)) list.classList.remove('drag-over');
  });

  list.addEventListener('drop', event => {
    if (dragPayload?.type !== 'bookmark') return;
    event.preventDefault();
    list.classList.remove('drag-over');
    if (event.target.closest('.bookmark-row')) return;
    moveBookmark(dragPayload, list.dataset.groupId, null);
  });
}

function moveBookmark(payload, targetGroupId, beforeBookmarkId) {
  const source = state.groups.find(g => g.id === payload.sourceGroupId);
  const target = state.groups.find(g => g.id === targetGroupId);
  if (!source || !target) return;

  const sourceIndex = source.bookmarks.findIndex(b => b.id === payload.bookmarkId);
  if (sourceIndex < 0) return;
  const [moved] = source.bookmarks.splice(sourceIndex, 1);

  if (beforeBookmarkId) {
    let targetIndex = target.bookmarks.findIndex(b => b.id === beforeBookmarkId);
    if (targetIndex < 0) targetIndex = target.bookmarks.length;
    target.bookmarks.splice(targetIndex, 0, moved);
  } else {
    target.bookmarks.push(moved);
  }

  saveState();
  render();
}

window.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === 'Escape' && editing && !document.querySelector('dialog[open]')) setEditing(false);
});
