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
let pendingImport = null;

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
const bookmarkNewGroupWrap = document.querySelector('#bookmarkNewGroupWrap');
const bookmarkNewGroup = document.querySelector('#bookmarkNewGroup');
const groupDialog = document.querySelector('#groupDialog');
const groupForm = document.querySelector('#groupForm');
const groupDialogTitle = document.querySelector('#groupDialogTitle');
const groupName = document.querySelector('#groupName');
const groupTemplate = document.querySelector('#groupTemplate');
const bookmarkTemplate = document.querySelector('#bookmarkTemplate');

applyTheme(localStorage.getItem(THEME_KEY) || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
applyFont(localStorage.getItem(FONT_KEY) || 'system');
applyFontSize(localStorage.getItem(FONT_SIZE_KEY) || '17');
setupBoardGroupDrop();
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

function populateGroupSelect(selectedId) {
  bookmarkGroup.innerHTML = '';

  state.groups.forEach(group => {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    bookmarkGroup.appendChild(option);
  });

  const newOption = document.createElement('option');
  newOption.value = '__new__';
  newOption.textContent = '+ New group…';
  bookmarkGroup.appendChild(newOption);

  if (selectedId && state.groups.some(group => group.id === selectedId)) {
    bookmarkGroup.value = selectedId;
  } else if (state.groups.length) {
    bookmarkGroup.value = state.groups[0].id;
  } else {
    bookmarkGroup.value = '__new__';
  }

  updateNewGroupField();
}

function updateNewGroupField() {
  const creating = bookmarkGroup.value === '__new__';
  bookmarkNewGroupWrap.hidden = !creating;
  bookmarkNewGroup.required = creating;
  if (creating && !bookmarkNewGroup.value.trim()) bookmarkNewGroup.value = 'Bookmarks';
}

bookmarkGroup.addEventListener('change', updateNewGroupField);

function openBookmarkDialog(groupId, bookmarkId = null) {
  editBookmarkId = bookmarkId;
  const group = groupId ? state.groups.find(g => g.id === groupId) : null;
  const bookmark = bookmarkId ? group?.bookmarks.find(b => b.id === bookmarkId) : null;
  bookmarkDialogTitle.textContent = bookmark ? 'Edit bookmark' : 'Add bookmark';
  bookmarkTitle.value = bookmark?.title || '';
  bookmarkUrl.value = bookmark?.url || '';
  bookmarkNewGroup.value = '';
  populateGroupSelect(groupId);
  bookmarkDialog.showModal();
  setTimeout(() => bookmarkTitle.focus(), 0);
}

bookmarkForm.addEventListener('submit', event => {
  if (event.submitter?.value !== 'save') return;
  event.preventDefault();

  const title = bookmarkTitle.value.trim();
  const url = normalizedUrl(bookmarkUrl.value);
  if (!title || !url) return;

  let targetGroupId = bookmarkGroup.value;
  if (targetGroupId === '__new__') {
    const newName = bookmarkNewGroup.value.trim();
    if (!newName) {
      bookmarkNewGroup.focus();
      return;
    }
    let targetGroup = state.groups.find(group => group.name.trim().toLocaleLowerCase() === newName.toLocaleLowerCase());
    if (!targetGroup) {
      targetGroup = { id: makeId(), name: newName, bookmarks: [] };
      state.groups.push(targetGroup);
    }
    targetGroupId = targetGroup.id;
  }

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

function clearGroupDropIndicators() {
  document.querySelectorAll('.group-card.group-drop-target').forEach(el => {
    el.classList.remove('group-drop-target');
  });
  board.classList.remove('group-drop-end');
}

function setupGroupDrag(node) {
  node.addEventListener('dragstart', event => {
    if (!editing || searchInput.value.trim()) return event.preventDefault();
    if (event.target.closest('.bookmark-row, button, a, input, select')) return event.preventDefault();
    dragPayload = { type: 'group', groupId: node.dataset.groupId };
    node.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', node.dataset.groupId);
  });

  node.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    clearGroupDropIndicators();
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
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

    const fromIndex = state.groups.findIndex(g => g.id === dragPayload.groupId);
    const toIndex = state.groups.findIndex(g => g.id === node.dataset.groupId);
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

    const [moved] = state.groups.splice(fromIndex, 1);
    const adjustedIndex = state.groups.findIndex(g => g.id === node.dataset.groupId);
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

    const fromIndex = state.groups.findIndex(g => g.id === dragPayload.groupId);
    if (fromIndex < 0) return;
    const [moved] = state.groups.splice(fromIndex, 1);
    state.groups.push(moved);
    saveState();
    render();
  });
}

function clearBookmarkDropIndicators() {
  document.querySelectorAll('.bookmark-row.bookmark-drop-before, .bookmark-row.bookmark-drop-after').forEach(el => {
    el.classList.remove('bookmark-drop-before', 'bookmark-drop-after');
    delete el.dataset.dropPosition;
  });
  document.querySelectorAll('.bookmark-list.bookmark-drop-end').forEach(el => {
    el.classList.remove('bookmark-drop-end');
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
    moveBookmark(payload, row.dataset.groupId, row.dataset.bookmarkId, position);
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
    moveBookmark(payload, list.dataset.groupId, null, 'end');
  });
}

function moveBookmark(payload, targetGroupId, targetBookmarkId = null, position = 'end') {
  const source = state.groups.find(g => g.id === payload.sourceGroupId);
  const target = state.groups.find(g => g.id === targetGroupId);
  if (!source || !target) return;

  const sourceIndex = source.bookmarks.findIndex(b => b.id === payload.bookmarkId);
  if (sourceIndex < 0) return;
  const [moved] = source.bookmarks.splice(sourceIndex, 1);

  if (!targetBookmarkId || position === 'end') {
    target.bookmarks.push(moved);
  } else {
    let targetIndex = target.bookmarks.findIndex(b => b.id === targetBookmarkId);
    if (targetIndex < 0) {
      target.bookmarks.push(moved);
    } else {
      if (position === 'after') targetIndex += 1;
      target.bookmarks.splice(targetIndex, 0, moved);
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

    const groupsByName = new Map(
      state.groups.map(group => [group.name.trim().toLocaleLowerCase(), group])
    );

    plan.additions.forEach(item => {
      const key = item.groupName.trim().toLocaleLowerCase();
      let group = groupsByName.get(key);
      if (!group) {
        group = { id: makeId(), name: item.groupName, bookmarks: [] };
        state.groups.push(group);
        groupsByName.set(key, group);
      }
      group.bookmarks.push({ id: makeId(), title: item.title, url: item.url });
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
      const groupName = path.length ? path.join(' › ') : 'Imported';
      bookmarks.push({
        groupName,
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
  return {
    url: anchor.getAttribute('href')?.trim() || '',
    title: anchor.textContent?.trim() || ''
  };
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
