import express from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;
const uploadDir = path.join(__dirname, 'uploads');
const dataFile = path.join(__dirname, 'data', 'submissions.json');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(path.dirname(dataFile), { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-')}`)
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

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

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));
app.get('/api/projects', (_, res) => res.json([...savedItems(), ...examples]));
app.post('/api/projects', upload.single('file'), (req, res) => {
  const { title, author, school, type, description, tags } = req.body;
  if (!title || !author || !description || !req.file) return res.status(400).json({ error: 'Vui lòng nhập đủ thông tin và chọn tệp.' });
  const item = {
    id: Date.now(), title, author, school: school || 'Sinh viên Việt Nam', type: type || 'document',
    desc: description, tags: (tags || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 4),
    icon: type === 'game' ? '🎮' : type === 'code' ? '</>' : '▤', color: 'purple', fileUrl: `/uploads/${req.file.filename}`, fileName: req.file.originalname
  };
  const items = savedItems(); items.unshift(item); writeItems(items);
  res.status(201).json(item);
});
app.get('*splat', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(port, () => console.log(`Server listening on ${port}`));
