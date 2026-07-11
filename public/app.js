const grid = document.querySelector('#project-grid');
let projects = [], filter = 'all', queuedFiles = [];
const escapeHtml = s => String(s || '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));

function render() {
  const shown = projects.filter(p => filter === 'all' || p.type === filter);
  grid.innerHTML = shown.map(p => `<article class="card"><div class="card-art ${p.color || 'purple'}"><span>${escapeHtml(p.icon)}</span><small>${p.type === 'game' ? 'GAME' : p.type === 'code' ? 'CODE' : 'TÀI LIỆU'}</small></div><div class="card-body"><div class="meta">${escapeHtml(p.school)}</div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.desc)}</p><div class="card-bottom"><div class="tags">${(p.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>${p.fileUrl ? `<a class="download" href="${p.fileUrl}" download>↓ Tải xuống</a>` : `<button class="like">♡ Lưu</button>`}</div><div class="author">by ${escapeHtml(p.author)}</div></div></article>`).join('') || '<p>Chưa có dự án trong mục này.</p>';
}

function updateFileSummary() {
  const total = queuedFiles.reduce((sum, file) => sum + file.size, 0);
  document.querySelector('#file-name').textContent = queuedFiles.length
    ? `${queuedFiles.length} tệp đã chọn · ${(total / 1024 / 1024).toFixed(1)} MB`
    : 'Chọn tệp hoặc thư mục · tối đa 100 MB/tệp';
}

function addFiles(files) {
  for (const file of files) {
    if (file.size > 100 * 1024 * 1024) { alert(`“${file.name}” lớn hơn giới hạn 100 MB.`); continue; }
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!queuedFiles.some(f => `${f.name}-${f.size}-${f.lastModified}` === key)) queuedFiles.push(file);
  }
  updateFileSummary();
}

async function filesFromDrop(items) {
  const readEntry = entry => new Promise(resolve => {
    if (entry.isFile) return entry.file(file => resolve([file]));
    if (!entry.isDirectory) return resolve([]);
    const reader = entry.createReader(), files = [];
    const readBatch = () => reader.readEntries(async entries => {
      if (!entries.length) return resolve(files);
      for (const child of entries) files.push(...await readEntry(child));
      readBatch();
    });
    readBatch();
  });
  const all = await Promise.all([...items].map(item => item.webkitGetAsEntry ? readEntry(item.webkitGetAsEntry()) : []));
  return all.flat();
}

fetch('/api/projects').then(r => r.json()).then(data => { projects = data; render(); }).catch(() => grid.innerHTML = '<p>Không thể tải dự án. Vui lòng thử lại.</p>');
document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => { document.querySelector('.filters .active').classList.remove('active'); btn.classList.add('active'); filter = btn.dataset.filter; render(); }));
const dialog = document.querySelector('#upload-dialog');
document.querySelectorAll('.open-upload').forEach(b => b.addEventListener('click', () => dialog.showModal()));
document.querySelector('.close').addEventListener('click', () => dialog.close());
document.querySelectorAll('.file-input').forEach(input => input.addEventListener('change', event => addFiles(event.target.files)));
const dropZone = document.querySelector('#drop-zone');
['dragenter', 'dragover'].forEach(event => dropZone.addEventListener(event, e => { e.preventDefault(); dropZone.classList.add('dragging'); }));
['dragleave', 'drop'].forEach(event => dropZone.addEventListener(event, e => { e.preventDefault(); dropZone.classList.remove('dragging'); }));
dropZone.addEventListener('drop', async event => addFiles(event.dataTransfer.items?.length ? await filesFromDrop(event.dataTransfer.items) : event.dataTransfer.files));
document.querySelector('#upload-form').addEventListener('submit', async e => {
  e.preventDefault(); const message = document.querySelector('#form-message'); const button = e.target.querySelector('.submit');
  if (!queuedFiles.length) { message.textContent = 'Hãy chọn ít nhất một tệp hoặc thư mục.'; return; }
  const payload = new FormData(e.target); queuedFiles.forEach(file => payload.append('files', file, file.webkitRelativePath || file.name));
  button.disabled = true; message.textContent = 'Đang tải lên...';
  try { const res = await fetch('/api/projects', { method: 'POST', body: payload }); const item = await res.json(); if (!res.ok) throw new Error(item.error); projects.unshift(item); render(); e.target.reset(); queuedFiles = []; updateFileSummary(); message.textContent = 'Đã đăng dự án!'; setTimeout(() => dialog.close(), 800); }
  catch (err) { message.textContent = err.message || 'Có lỗi xảy ra.'; }
  finally { button.disabled = false; }
});
