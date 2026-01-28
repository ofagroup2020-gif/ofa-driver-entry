import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ===== CORS（必要なら制限してもOK）=====
app.use(cors());

// ====== 環境変数 ======
const BASE_URL = process.env.BASE_URL; // 例: https://xxx.onrender.com
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_TARGET_ID = process.env.LINE_TARGET_ID;

// ====== ディレクトリ ======
const UPLOAD_DIR = path.join(__dirname, "uploads");
const TMP_DIR = path.join(__dirname, "tmp");
const FONT_PATH = path.join(__dirname, "NotoSansJP-Regular.ttf");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR);

// PDF公開
app.use("/uploads", express.static(UPLOAD_DIR));

// ====== multer（画像は一旦tmpへ）======
const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 12 * 1024 * 1024 } // 12MB
});

// ====== util ======
function safeName(str) {
  return String(str || "")
    .replace(/[^\wぁ-んァ-ヶ一-龠ー\s]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

async function linePush(text) {
  if (!LINE_TOKEN || !LINE_TARGET_ID) return;

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LINE_TOKEN}`
    },
    body: JSON.stringify({
      to: LINE_TARGET_ID,
      messages: [{ type: "text", text }]
    })
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("❌ LINE push error:", t);
  }
}

function cleanup(paths = []) {
  for (const p of paths) {
    try { fs.unlinkSync(p); } catch {}
  }
}

async function embedImage(pdfDoc, filePath) {
  const bytes = fs.readFileSync(filePath);
  try {
    return await pdfDoc.embedJpg(bytes);
  } catch {
    return await pdfDoc.embedPng(bytes);
  }
}

// ====== health ======
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    base_url: !!BASE_URL,
    line_token: !!LINE_TOKEN,
    line_target: !!LINE_TARGET_ID
  });
});

// ====== メイン：送信 → PDF生成 → URL → LINE Push ======
app.post(
  "/api/submit",
  upload.fields([
    { name: "licFront", maxCount: 1 },
    { name: "licBack", maxCount: 1 }
  ]),
  async (req, res) => {
    const tempPaths = [];
    try {
      if (!BASE_URL) {
        return res.status(500).json({ ok: false, message: "BASE_URL is not set" });
      }
      if (!fs.existsSync(FONT_PATH)) {
        return res.status(500).json({ ok: false, message: "NotoSansJP-Regular.ttf がサーバにありません" });
      }

      const data = JSON.parse(req.body?.data || "{}");
      const front = req.files?.licFront?.[0];
      const back = req.files?.licBack?.[0];

      if (front?.path) tempPaths.push(front.path);
      if (back?.path) tempPaths.push(back.path);

      // 必須チェック
      if (!data?.name) return res.status(400).json({ ok: false, message: "name is required" });
      if (!front) return res.status(400).json({ ok: false, message: "licFront is required" });

      // PDF作成
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      const fontBytes = fs.readFileSync(FONT_PATH);
      const jpFont = await pdfDoc.embedFont(fontBytes);

      const page = pdfDoc.addPage([595.28, 841.89]); // A4(pt)
      const { width, height } = page.getSize();

      const M = 40;
      let y = height - M;

      // ヘッダー
      page.drawText("OFA GROUP Driver Entry Sheet", {
        x: M, y, size: 16, font: jpFont, color: rgb(0, 0, 0)
      });
      y -= 24;

      page.drawText(`作成日: ${new Date().toLocaleString("ja-JP")}`, {
        x: M, y, size: 10, font: jpFont, color: rgb(0.2, 0.2, 0.2)
      });
      y -= 24;

      const line = (label, value) => {
        page.drawText(label, { x: M, y, size: 10, font: jpFont, color: rgb(0.35, 0.35, 0.35) });
        page.drawText(String(value || "—"), { x: M + 125, y, size: 11, font: jpFont, color: rgb(0, 0, 0) });
        y -= 18;
      };

      // 本文
      line("氏名", `${data.name}（${data.kana || ""}）`);
      line("電話", data.phone);
      line("メール", data.email);
      line("生年月日", data.birth);

      y -= 6;
      line("住所", `${data.zip || ""} ${data.pref || ""}${data.city || ""}${data.addr1 || ""} ${data.addr2 || ""}`.trim());

      y -= 6;
      line("所属区分", data.affType);
      line("所属会社", data.company);

      y -= 6;
      line("車種", data.vehicleType);
      line("ナンバー", data.plate);
      line("黒ナンバー", data.blackPlate);

      y -= 6;
      line("銀行", data.bank);
      line("支店", data.branch);
      line("口座種別", data.acctType);
      line("口座番号", data.acctNo);
      line("名義(カナ)", data.acctName);

      // 免許画像エリア
      const boxW = 240;
      const boxH = 140;
      const gap = 25;
      const leftX = M;
      const rightX = M + boxW + gap;

      // yを画像ゾーンに調整
      let imgTop = y - 12;
      const minTop = 130; // 下に落ちすぎないように
      if (imgTop < minTop) imgTop = minTop;

      const imgY = imgTop - boxH;

      page.drawText("運転免許証", { x: M, y: imgTop + 22, size: 12, font: jpFont, color: rgb(0,0,0) });

      // 枠（表）
      page.drawRectangle({ x: leftX, y: imgY, width: boxW, height: boxH, borderColor: rgb(0.85,0.85,0.85), borderWidth: 1 });
      page.drawText("表面", { x: leftX, y: imgY + boxH + 6, size: 10, font: jpFont, color: rgb(0.35,0.35,0.35) });

      const frontImg = await embedImage(pdfDoc, front.path);
      page.drawImage(frontImg, { x: leftX + 5, y: imgY + 5, width: boxW - 10, height: boxH - 10 });

      // 枠（裏）
      page.drawRectangle({ x: rightX, y: imgY, width: boxW, height: boxH, borderColor: rgb(0.85,0.85,0.85), borderWidth: 1 });
      page.drawText("裏面(任意)", { x: rightX, y: imgY + boxH + 6, size: 10, font: jpFont, color: rgb(0.35,0.35,0.35) });

      if (back) {
        const backImg = await embedImage(pdfDoc, back.path);
        page.drawImage(backImg, { x: rightX + 5, y: imgY + 5, width: boxW - 10, height: boxH - 10 });
      } else {
        page.drawText("未提出", { x: rightX + 95, y: imgY + 65, size: 11, font: jpFont, color: rgb(0.55,0.55,0.55) });
      }

      const pdfBytes = await pdfDoc.save();

      const ymd = new Date().toISOString().slice(0, 10);
      const filename = `OFA_エントリー_${safeName(data.name)}_${ymd}.pdf`;
      const savedName = `${Date.now()}_${filename}`;
      const outPath = path.join(UPLOAD_DIR, savedName);

      fs.writeFileSync(outPath, pdfBytes);

      const url = `${BASE_URL}/uploads/${savedName}`;

      // LINE自動通知（PDFそのものは送れないのでURL送信が最強）
      const text =
`【OFA GROUP エントリー】
新規登録がありました。

氏名：${data.name}
エリア：${data.pref || "—"}
所属：${data.affType || "—"}
車両：${data.vehicleType || "—"} / ${data.plate || "—"}

▼エントリーPDF（免許画像付き）
${url}
`;

      await linePush(text);

      cleanup(tempPaths);
      res.json({ ok: true, url });
    } catch (e) {
      console.error(e);
      cleanup(tempPaths);
      res.status(500).json({ ok: false, message: e?.message || "server error" });
    }
  }
);

// ====== start ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running: http://localhost:${PORT}`);
});
