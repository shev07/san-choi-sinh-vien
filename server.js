import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'uploads');
const dataFile = path.join(__dirname, 'data', 'submissions.json');
const usersFile = path.join(__dirname, 'data', 'users.json');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(path.dirname(dataFile), { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`)
});
const upload = multer({ storage, limits: { fileSize: 100 * 1024 * 1024, files: 500 } });

const examples = [
  { id: 1, type: 'game', title: 'Thành phố xanh', author: 'Nhóm Pixel', school: 'ĐH Bách Khoa Hà Nội', desc: 'Game mô phỏng xây dựng thành phố bền vững bằng Unity.', tags: ['Unity', 'Môi trường'], icon: '🌿', color: 'mint' },
  { id: 2, type: 'document', title: 'Nhập môn trí tuệ nhân tạo', author: 'Minh Anh', school: 'ĐH Công nghệ - ĐHQGHN', desc: 'Bộ ghi chú trực quan, dễ ôn tập trước kỳ thi.', tags: ['AI', 'PDF'], icon: '✦', color: 'purple' },
  { id: 3, type: 'game', title: 'Săn kho báu Sài Gòn', author: 'Lập trình vui', school: 'ĐH FPT TP.HCM', desc: 'Phiêu lưu giải đố với các địa danh quen thuộc.', tags: ['Web game', 'Puzzle'], icon: '⌘', color: 'orange' },
  { id: 4, type: 'code', title: 'Vietnamese NLP Starter', author: 'Trần Duy', school: 'ĐH Khoa học Tự nhiên', desc: 'Mã nguồn khởi đầu cho phân loại văn bản tiếng Việt.', tags: ['Python', 'NLP'], icon: '</>', color: 'blue' }
];

function savedItems() {
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { return []; }
}
function writeItems(items) { fs.writeFileSync(dataFile, JSON.stringify(items, null, 2)); }
function users() { try { return JSON.parse(fs.readFileSync(usersFile, 'utf8')); } catch { return []; } }
function writeUsers(data) { fs.writeFileSync(usersFile, JSON.stringify(data, null, 2)); }
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) { return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve(`${salt}:${key.toString('hex')}`))); }
function verifyPassword(password, value) {
  const [salt, stored] = value.split(':');
  const storedKey = Buffer.from(stored || '', 'hex');
  return new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, key) => {
    if (error) return reject(error);
    resolve(storedKey.length === key.length && crypto.timingSafeEqual(storedKey, key));
  }));
}
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
function createToken(user) { const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url'); const sig = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url'); return `${payload}.${sig}`; }
function currentUser(req) { const token = req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) return null; const [payload, signature] = token.split('.'); if (!payload || !signature) return null; const expected = crypto.createHmac('sha256', sessionSecret).update(payload).digest('base64url'); if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; try { const data = JSON.parse(Buffer.from(payload, 'base64url')); return data.exp > Date.now() ? users().find(user => user.id === data.id) || null : null; } catch { return null; } }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role }; }
function requireUser(req, res, next) { const user = currentUser(req); if (!user) return res.status(401).json({ error: 'Vui lòng đăng nhập để thực hiện thao tác này.' }); req.user = user; next(); }
function requireAdmin(req, res, next) { requireUser(req, res, () => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Chỉ quản trị viên có quyền này.' })); }
async function seedAdmin() { const email = process.env.ADMIN_EMAIL?.trim().toLowerCase(), password = process.env.ADMIN_PASSWORD; if (!email || !password || users().some(user => user.email === email)) return; const data = users(); data.push({ id: crypto.randomUUID(), name: 'Quản trị viên', email, password: await hashPassword(password), role: 'admin', createdAt: new Date().toISOString() }); writeUsers(data); console.log(`Admin account ready: ${email}`); }

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));
app.get('/api/projects', (_, res) => res.json([...savedItems(), ...examples]));
app.get('/api/auth/me', (req, res) => { const user = currentUser(req); res.json({ user: user ? publicUser(user) : null }); });
app.post('/api/auth/register', express.json(), async (req, res) => {
  const name = req.body.name?.trim(), email = req.body.email?.trim().toLowerCase(), password = req.body.password;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Nhập họ tên, email hợp lệ và mật khẩu ít nhất 8 ký tự.' });
  const data = users(); if (data.some(user => user.email === email)) return res.status(409).json({ error: 'Email này đã được đăng ký.' });
  const user = { id: crypto.randomUUID(), name, email, password: await hashPassword(password), role: 'user', createdAt: new Date().toISOString() }; data.push(user); writeUsers(data); res.status(201).json({ token: createToken(user), user: publicUser(user) });
});
app.post('/api/auth/login', express.json(), async (req, res) => {
  const email = req.body.email?.trim().toLowerCase(), password = req.body.password || '', user = users().find(item => item.email === email);
  if (!user || !(await verifyPassword(password, user.password))) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
  res.json({ token: createToken(user), user: publicUser(user) });
});
app.post('/api/projects', requireUser, upload.array('files', 500), (req, res) => {
  const { title, author, school, type, description, tags } = req.body;
  if (!title || !author || !description || !req.files?.length) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin và chọn ít nhất một tệp.' });
  const attachments = req.files.map(file => ({ url: `/uploads/${file.filename}`, name: file.originalname }));
  const item = {
    id: Date.now(), title, author: req.user.name, ownerId: req.user.id, school: school || 'Sinh viên Việt Nam', type: type || 'document',
    desc: description, tags: (tags || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 4),
    icon: type === 'game' ? '🎮' : type === 'code' ? '</>' : '▤', color: 'purple', fileUrl: attachments[0].url, fileName: attachments[0].name, attachments
  };
  const items = savedItems(); items.unshift(item); writeItems(items);
  res.status(201).json(item);
});
app.delete('/api/projects/:id', requireAdmin, (req, res) => {
  const items = savedItems(), index = items.findIndex(item => String(item.id) === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Không tìm thấy bài đăng hoặc đây là bài mẫu.' });
  const [item] = items.splice(index, 1); writeItems(items);
  (item.attachments || []).forEach(file => { const safePath = path.join(uploadDir, path.basename(file.url)); if (fs.existsSync(safePath)) fs.unlinkSync(safePath); });
  res.json({ ok: true });
});
app.get('*splat', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
seedAdmin().then(() => app.listen(port, () => console.log(`Server listening on ${port}`)));
