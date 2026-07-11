const grid = document.querySelector('#project-grid');
let projects = [], filter = 'all';
const escapeHtml = s => String(s || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
function render() {
  const shown = projects.filter(p => filter === 'all' || p.type === filter);
  grid.innerHTML = shown.map(p => `<article class="card"><div class="card-art ${p.color || 'purple'}"><span>${escapeHtml(p.icon)}</span><small>${p.type === 'game' ? 'GAME' : p.type === 'code' ? 'CODE' : 'TÀI LIỆU'}</small></div><div class="card-body"><div class="meta">${escapeHtml(p.school)}</div><h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.desc)}</p><div class="card-bottom"><div class="tags">${(p.tags || []).map(t => `<span>${escapeHtml(t)}</span>`).join('')}</div>${p.fileUrl ? `<a class="download" href="${p.fileUrl}" download>↓ Tải xuống</a>` : `<button class="like">♡ Lưu</button>`}</div><div class="author">by ${escapeHtml(p.author)}</div></div></article>`).join('') || '<p>Chưa có dự án trong mục này.</p>';
}
fetch('/api/projects').then(r => r.json()).then(data => { projects = data; render(); }).catch(() => grid.innerHTML = '<p>Không thể tải dự án. Vui lòng thử lại.</p>');
document.querySelectorAll('[data-filter]').forEach(btn => btn.addEventListener('click', () => { document.querySelector('.filters .active').classList.remove('active'); btn.classList.add('active'); filter = btn.dataset.filter; render(); }));
const dialog = document.querySelector('#upload-dialog');
document.querySelectorAll('.open-upload').forEach(b => b.addEventListener('click', () => dialog.showModal()));
document.querySelector('.close').addEventListener('click', () => dialog.close());
document.querySelector('input[type=file]').addEventListener('change', e => document.querySelector('#file-name').textContent = e.target.files[0]?.name || 'Chọn tệp (tối đa 25 MB)');
document.querySelector('#upload-form').addEventListener('submit', async e => { e.preventDefault(); const message = document.querySelector('#form-message'); const button = e.target.querySelector('.submit'); button.disabled = true; message.textContent = 'Đang tải lên...'; try { const res = await fetch('/api/projects', { method: 'POST', body: new FormData(e.target) }); const item = await res.json(); if (!res.ok) throw new Error(item.error); projects.unshift(item); render(); e.target.reset(); document.querySelector('#file-name').textContent = 'Chọn tệp (tối đa 25 MB)'; message.textContent = 'Đã đăng dự án!'; setTimeout(() => dialog.close(), 800); } catch (err) { message.textContent = err.message || 'Có lỗi xảy ra.'; } finally { button.disabled = false; } });
