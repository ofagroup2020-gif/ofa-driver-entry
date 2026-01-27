// server.js
// npm i express multer cors
// node server.js

import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// 公開フォルダ（フロント）
app.use(express.static(path.join(__dirname, "public")));

// アップロード保存先
const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

app.use("/uploads", express.static(UPLOAD_DIR));

/**
 * PDFアップロード
 * - フロントで生成したPDF(Blob)をmultipartで送る
 * - 返り値：公開URL
 */
app.post("/api/upload-pdf", upload.single("pdf"), (req, res) => {
  if (!req.file) return res.status(400).json({ ok: false, message: "no file" });

  // 本番は必ずHTTPSドメインにする
  const baseUrl = `${req.protocol}://${req.get("host")}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;

  res.json({ ok: true, url });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ OFA Entry server running: http://localhost:${PORT}`);
});
