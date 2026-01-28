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

// Render/別ドメインから叩けるように
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});

const FONT_PATH = path.join(__dirname, "NotoSansJP-Regular.ttf");

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    fontExists: fs.existsSync(FONT_PATH),
    time: new Date().toISOString()
  });
});

async function embedAnyImage(pdfDoc, buf) {
  try {
    return await pdfDoc.embedJpg(buf);
  } catch {
    return await pdfDoc.embedPng(buf);
  }
}

function safeName(s) {
  return String(s || "driver")
    .replace(/[^\wぁ-んァ-ヶ一-龠ー\s]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 40);
}

app.post(
  "/api/pdf",
  upload.fields([
    { name: "licFront", maxCount: 1 },
    { name: "licBack", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!fs.existsSync(FONT_PATH)) {
        return res.status(500).json({
          ok: false,
          message: "NotoSansJP-Regular.ttf がサーバにありません（リポジトリ直下に配置してください）"
        });
      }

      const data = JSON.parse(req.body?.data || "{}");
      const front = req.files?.licFront?.[0];
      const back = req.files?.licBack?.[0];

      if (!data?.name) return res.status(400).json({ ok: false, message: "name is required" });
      if (!front) return res.status(400).json({ ok: false, message: "licFront is required" });

      // ===== PDF作成（日本語フォント埋め込み）=====
      const pdfDoc = await PDFDocument.create();
      pdfDoc.registerFontkit(fontkit);

      const fontBytes = fs.readFileSync(FONT_PATH);
      const jp = await pdfDoc.embedFont(fontBytes, { subset: true });

      const page = pdfDoc.addPage([595.28, 841.89]); // A4
      const { width, height } = page.getSize();

      const M = 36;
      let y = height - M;

      // ヘッダ
      page.drawText("OFA GROUP ドライバー登録シート", {
        x: M, y, size: 16, font: jp, color: rgb(0, 0, 0)
      });
      y -= 18;

      page.drawText(`作成日時：${new Date().toLocaleString("ja-JP")}`, {
        x: M, y, size: 10, font: jp, color: rgb(0.35, 0.35, 0.35)
      });
      y -= 14;

      // オレンジのライン（ブランド感）
      page.drawRectangle({
        x: M, y, width: width - M * 2, height: 3,
        color: rgb(1, 0.48, 0)
      });
      y -= 18;

      const row = (label, value) => {
        page.drawText(label, { x: M, y, size: 10, font: jp, color: rgb(0.35,0.35,0.35) });
        page.drawText(String(value || "—"), { x: M + 140, y, size: 11, font: jp, color: rgb(0,0,0) });
        y -= 16;
      };

      // ===== 日本語で書き出し =====
      row("氏名", `${data.name || ""}${data.kana ? `（${data.kana}）` : ""}`);
      row("電話番号", data.phone);
      row("メールアドレス", data.email);
      row("生年月日", data.birth);

      y -= 6;
      const addr = `${data.zip || ""} ${data.pref || ""}${data.city || ""}${data.addr1 || ""} ${data.addr2 || ""}`.trim();
      row("住所", addr);

      y -= 6;
      row("所属区分", data.affType);
      row("所属会社名", data.company);

      y -= 6;
      row("車種", data.vehicleType);
      row("車両ナンバー", data.plate);
      row("黒ナンバー", data.blackPlate);

      y -= 6;
      row("銀行名", data.bank);
      row("支店名", data.branch);
      row("口座種別", data.acctType);
      row("口座番号", data.acctNo);
      row("口座名義（カナ）", data.acctName);

      // ===== 免許証画像（下部2枚）=====
      const boxW = 250;
      const boxH = 160;
      const gap = 20;

      const top = Math.max(200, y - 10);
      const imgY = top - boxH;

      page.drawText("運転免許証（画像）", {
        x: M, y: top + 22, size: 12, font: jp, color: rgb(0,0,0)
      });

      // 表面
      page.drawText("表面（必須）", {
        x: M, y: top + 6, size: 10, font: jp, color: rgb(0.35,0.35,0.35)
      });
      page.drawRectangle({
        x: M, y: imgY, width: boxW, height: boxH,
        borderColor: rgb(0.85,0.85,0.85), borderWidth: 1
      });
      const frontImg = await embedAnyImage(pdfDoc, front.buffer);
      page.drawImage(frontImg, { x: M + 6, y: imgY + 6, width: boxW - 12, height: boxH - 12 });

      // 裏面
      const rx = M + boxW + gap;
      page.drawText("裏面（任意）", {
        x: rx, y: top + 6, size: 10, font: jp, color: rgb(0.35,0.35,0.35)
      });
      page.drawRectangle({
        x: rx, y: imgY, width: boxW, height: boxH,
        borderColor: rgb(0.85,0.85,0.85), borderWidth: 1
      });

      if (back) {
        const backImg = await embedAnyImage(pdfDoc, back.buffer);
        page.drawImage(backImg, { x: rx + 6, y: imgY + 6, width: boxW - 12, height: boxH - 12 });
      } else {
        page.drawText("未提出", { x: rx + 95, y: imgY + 78, size: 11, font: jp, color: rgb(0.55,0.55,0.55) });
      }

      // フッター
      page.drawText("One for All, All for One", {
        x: width - M - 170, y: 22, size: 9, font: jp, color: rgb(0.55,0.55,0.55)
      });

      const pdfBytes = await pdfDoc.save();

      const ymd = new Date().toISOString().slice(0, 10);
      const filename = `OFA_登録_${safeName(data.name)}_${ymd}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      return res.status(200).send(Buffer.from(pdfBytes));
    } catch (e) {
      console.error(e);
      return res.status(500).json({ ok: false, message: e?.message || "server error" });
    }
  }
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ API running on ${PORT}`));
