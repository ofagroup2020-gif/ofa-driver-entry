/* =========================================================
   OFA GROUP Driver Registration App - app.js (FULL REPLACE)
   - STEP4: 車種 + 黒ナンバー状況(あり/なし/申請中/リース希望)のみ
   - LINE: OFAメンバーシップLINE https://lin.ee/8x437Vt
   - 導線: LINE追加(開く) → PDF作成
   - 免許証画像: 上下の余白を自動カットしてPDF出力を見やすく
   ========================================================= */

/* -------------------------
   0) 設定
------------------------- */
const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt";

// STEP4 options
const VEHICLE_TYPES = ["軽バン", "軽トラ", "幌車", "クール車", "その他"];
const BLACK_STATUS = ["あり", "なし", "申請中", "リース希望"];

/* -------------------------
   1) ユーティリティ
------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function showToast(msg, ms = 2200) {
  const t = $("#toast");
  if (!t) {
    alert(msg);
    return;
  }
  t.textContent = msg;
  t.classList.add("show");
  window.clearTimeout(showToast._tm);
  showToast._tm = window.setTimeout(() => t.classList.remove("show"), ms);
}

function normalizePhone(v) {
  if (!v) return "";
  // 全角→半角の簡易
  const s = String(v).replace(/[０-９＋－ー]/g, (c) => {
    const map = { "＋": "+", "－": "-", "ー": "-" };
    if (map[c]) return map[c];
    return String.fromCharCode(c.charCodeAt(0) - 65248);
  });
  // 数字 + + -
  return s.replace(/[^\d+\-]/g, "");
}

function isValidEmail(v) {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
    d.getHours()
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/* -------------------------
   2) 状態管理 (localStorage)
------------------------- */
const LS_KEY = "ofa_driver_entry_v1";

const state = {
  step: 1,
  // STEP1
  nameKanji: "",
  nameKana: "",
  phone: "",
  email: "",
  birth: "",
  // STEP2
  address: "",
  // STEP3 所属（協力会社/FC/個人 など。UIがある場合だけ拾う）
  affiliationType: "",
  affiliationCompany: "",
  // STEP4 車両（あなたの仕様）
  vehicleType: "",
  blackStatus: "",
  carNumber: "", // 任意（UIがあれば）
  // STEP5 口座
  bankName: "",
  accountType: "",
  accountNumber: "",
  accountNameKana: "",
  // STEP6 画像
  licenseFront: "", // オリジナルDataURL
  licenseBack: "",
  licenseFrontCropped: "", // 上下余白カット後DataURL（PDF用）
  licenseBackCropped: "",
  // STEP7 同意
  agree: false,
  // LINE導線
  lineOpened: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    Object.assign(state, obj || {});
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch (_) {}
}

function resetAll() {
  localStorage.removeItem(LS_KEY);
  location.reload();
}

/* -------------------------
   3) DOM紐付け（柔軟）
   ※ index.html の id/name が多少違っても拾えるように
------------------------- */
const bindMap = [
  // STEP1
  ["nameKanji", ["#nameKanji", "#fullName", "input[name='nameKanji']", "input[name='fullName']"]],
  ["nameKana", ["#nameKana", "#furigana", "input[name='nameKana']", "input[name='furigana']"]],
  ["phone", ["#phone", "#tel", "input[name='phone']", "input[name='tel']"]],
  ["email", ["#email", "input[name='email']"]],
  ["birth", ["#birth", "#dob", "input[name='birth']", "input[name='dob']"]],
  // STEP2
  ["address", ["#address", "input[name='address']", "textarea[name='address']"]],
  // STEP3
  ["affiliationType", ["#affiliationType", "select[name='affiliationType']"]],
  ["affiliationCompany", ["#affiliationCompany", "input[name='affiliationCompany']"]],
  // STEP4（必須2つ）
  ["vehicleType", ["#vehicleType", "select[name='vehicleType']"]],
  ["blackStatus", ["#blackStatus", "select[name='blackStatus']"]],
  ["carNumber", ["#carNumber", "input[name='carNumber']"]],
  // STEP5
  ["bankName", ["#bankName", "input[name='bankName']"]],
  ["accountType", ["#accountType", "select[name='accountType']"]],
  ["accountNumber", ["#accountNumber", "input[name='accountNumber']"]],
  ["accountNameKana", ["#accountNameKana", "input[name='accountNameKana']"]],
  // STEP7
  ["agree", ["#agree", "input[name='agree']"]],
];

function findEl(selectors) {
  for (const sel of selectors) {
    const el = $(sel);
    if (el) return el;
  }
  return null;
}

const els = {}; // stateKey -> element
function bindElements() {
  for (const [key, selectors] of bindMap) {
    els[key] = findEl(selectors);
  }
}

/* -------------------------
   4) STEP表示・進行
------------------------- */
function setStep(n) {
  const steps = $$(".step");
  if (!steps.length) {
    state.step = n;
    saveState();
    return;
  }
  const max = steps.length;
  const next = Math.max(1, Math.min(max, n));
  state.step = next;
  steps.forEach((s, i) => s.classList.toggle("active", i === next - 1));

  updateProgressUI(next, max);
  saveState();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateProgressUI(step, max) {
  // bar
  const fill = $(".barFill");
  if (fill) fill.style.width = `${(step / max) * 100}%`;

  // dots
  const dots = $$(".dots .d");
  if (dots.length) {
    dots.forEach((d, i) => d.classList.toggle("on", i === step - 1));
  }

  // STEP label (top right)
  const stepLabel = $("#stepLabel");
  if (stepLabel) stepLabel.textContent = `STEP ${step} / ${max}`;
}

function nextStep() {
  if (!validateStep(state.step)) return;
  setStep(state.step + 1);
}
function prevStep() {
  setStep(state.step - 1);
}

/* -------------------------
   5) バリデーション（次へ進めないバグ潰し）
------------------------- */
function validateStep(step) {
  // 画面に存在する要素だけを必須チェック（UI差異で詰まない）
  if (step === 1) {
    const n1 = (state.nameKanji || "").trim();
    const n2 = (state.nameKana || "").trim();
    const p = normalizePhone(state.phone);
    const e = (state.email || "").trim();
    const b = (state.birth || "").trim();

    if (!n1) return showToast("氏名（漢字）を入力してください"), false;
    if (!n2) return showToast("フリガナを入力してください"), false;
    if (!p || p.length < 8) return showToast("電話番号を正しく入力してください"), false;
    if (!isValidEmail(e)) return showToast("メールアドレスを正しく入力してください"), false;
    if (!b) return showToast("生年月日を入力してください"), false;

    // 反映（正規化）
    state.phone = p;
    return true;
  }

  if (step === 2) {
    if (els.address && !(state.address || "").trim()) {
      showToast("住所を入力してください");
      return false;
    }
    return true;
  }

  // STEP3 所属（UIがある場合だけ）
  if (step === 3) {
    if (els.affiliationType && !(state.affiliationType || "").trim()) {
      showToast("所属区分を選択してください");
      return false;
    }
    // 会社名は任意（協力会社の時だけ必要にしたいなら、ここで分岐可）
    return true;
  }

  // STEP4（あなたの最終仕様）
  if (step === 4) {
    if (!state.vehicleType) {
      showToast("車種を選択してください");
      return false;
    }
    if (!state.blackStatus) {
      showToast("黒ナンバー状況を選択してください");
      return false;
    }
    return true;
  }

  // STEP5 口座（UIがある場合だけ）
  if (step === 5) {
    if (els.bankName && !(state.bankName || "").trim()) return showToast("銀行名を入力してください"), false;
    if (els.accountType && !(state.accountType || "").trim()) return showToast("口座種別を選択してください"), false;
    if (els.accountNumber && !(state.accountNumber || "").trim()) return showToast("口座番号を入力してください"), false;
    if (els.accountNameKana && !(state.accountNameKana || "").trim()) return showToast("口座名義（カナ）を入力してください"), false;
    return true;
  }

  // STEP6 免許証（フロント必須、バック任意）
  if (step === 6) {
    if (!state.licenseFront) return showToast("免許証（表）をアップロードしてください"), false;
    return true;
  }

  // STEP7 同意
  if (step === 7) {
    if (els.agree && !state.agree) return showToast("同意にチェックしてください"), false;
    return true;
  }

  return true;
}

/* -------------------------
   6) UI初期化：select の選択肢を注入
------------------------- */
function ensureOptions(selectEl, options, placeholder = "選択してください") {
  if (!selectEl) return;

  // すでに options が入っているなら壊さない（ただしSTEP4は上書き）
  const isVehicle = selectEl === els.vehicleType;
  const isBlack = selectEl === els.blackStatus;
  if (!isVehicle && !isBlack && selectEl.options && selectEl.options.length > 1) return;

  // 上書き
  selectEl.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = placeholder;
  selectEl.appendChild(opt0);

  options.forEach((v) => {
    const o = document.createElement("option");
    o.value = v;
    o.textContent = v;
    selectEl.appendChild(o);
  });
}

/* -------------------------
   7) 入力イベント
------------------------- */
function syncStateToUI() {
  for (const [key, el] of Object.entries(els)) {
    if (!el) continue;
    if (el.type === "checkbox") {
      el.checked = !!state[key];
    } else {
      el.value = state[key] ?? "";
    }
  }

  // 免許証プレビュー
  const p1 = $("#previewLicenseFront");
  const p2 = $("#previewLicenseBack");
  if (p1 && state.licenseFront) {
    p1.src = state.licenseFront;
    p1.style.display = "block";
  }
  if (p2 && state.licenseBack) {
    p2.src = state.licenseBack;
    p2.style.display = "block";
  }

  // DONE画面：LINEボタン注入
  const lineBtn = $("#btnOpenLine");
  if (lineBtn) {
    lineBtn.textContent = state.lineOpened ? "OFAメンバーシップLINEを開く（追加済み）" : "OFAメンバーシップLINEを追加/開く";
  }
}

function wireInputs() {
  for (const [key, el] of Object.entries(els)) {
    if (!el) continue;

    const handler = () => {
      if (el.type === "checkbox") {
        state[key] = !!el.checked;
      } else {
        state[key] = el.value;
      }
      if (key === "phone") state.phone = normalizePhone(state.phone);
      saveState();
    };

    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  }

  // Next/Prev
  const btnNext = $("#btnNext");
  const btnPrev = $("#btnPrev");
  if (btnNext) btnNext.addEventListener("click", nextStep);
  if (btnPrev) btnPrev.addEventListener("click", prevStep);

  // DONE画面のボタン
  const btnOpenLine = $("#btnOpenLine");
  if (btnOpenLine) btnOpenLine.addEventListener("click", openMembershipLine);

  const btnMakePdf = $("#btnMakePdf");
  if (btnMakePdf) btnMakePdf.addEventListener("click", createPdfAndDownload);

  const btnRestart = $("#btnRestart");
  if (btnRestart) btnRestart.addEventListener("click", resetAll);

  // 免許証アップロード
  const fileFront = $("#fileLicenseFront");
  const fileBack = $("#fileLicenseBack");
  if (fileFront) fileFront.addEventListener("change", (e) => handleImageUpload(e, "front"));
  if (fileBack) fileBack.addEventListener("change", (e) => handleImageUpload(e, "back"));
}

/* -------------------------
   8) 免許証画像：上下余白カット（PDF見やすく）
   - “余白カットだけ”を狙うため、画像の上下を自動検出しトリミング
   - ざっくりでも「黒い背景」「大きい余白」に強い
------------------------- */
async function handleImageUpload(e, side) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("画像ファイルを選択してください");
    e.target.value = "";
    return;
  }

  const dataUrl = await fileToDataURL(file);

  if (side === "front") {
    state.licenseFront = dataUrl;
    state.licenseFrontCropped = await autoCropVerticalPadding(dataUrl);
  } else {
    state.licenseBack = dataUrl;
    state.licenseBackCropped = await autoCropVerticalPadding(dataUrl);
  }

  saveState();
  syncStateToUI();
  showToast("画像を保存しました");
}

function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/**
 * 自動縦トリム（上下余白を削る）
 * - 画像を縮小して走査 → 上下の“内容がある範囲”を推定 → 元サイズで切り出し
 */
async function autoCropVerticalPadding(dataUrl) {
  const img = await loadImage(dataUrl);

  // 縮小して解析
  const maxW = 520;
  const scale = Math.min(1, maxW / img.width);
  const w = Math.max(1, Math.floor(img.width * scale));
  const h = Math.max(1, Math.floor(img.height * scale));

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const { data } = ctx.getImageData(0, 0, w, h);

  // 行ごとの“情報量”を測る（輝度のばらつき + エッジっぽさ）
  const rowScore = new Array(h).fill(0);

  for (let y = 0; y < h; y++) {
    let sum = 0;
    let sum2 = 0;

    // 横方向を間引き（軽く）
    const step = Math.max(1, Math.floor(w / 180));
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += lum;
      sum2 += lum * lum;
    }

    const n = Math.ceil(w / step);
    const mean = sum / n;
    const varc = Math.max(0, sum2 / n - mean * mean);

    // 低輝度一色(黒背景)だとvarが小さい → カット対象に
    rowScore[y] = varc;
  }

  // 閾値：上位何%かを「内容あり」とみなす
  const sorted = [...rowScore].sort((a, b) => a - b);
  const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0;
  const threshold = Math.max(25, p90 * 0.20); // ほどよく

  let top = 0;
  while (top < h && rowScore[top] < threshold) top++;

  let bottom = h - 1;
  while (bottom > 0 && rowScore[bottom] < threshold) bottom--;

  // 失敗時はそのまま
  if (bottom - top < Math.floor(h * 0.2)) {
    return dataUrl;
  }

  // 余白を少し残す（切り過ぎ防止）
  const pad = Math.floor(h * 0.03);
  top = Math.max(0, top - pad);
  bottom = Math.min(h - 1, bottom + pad);

  // 元画像で切り出し
  const top0 = Math.floor(top / scale);
  const bottom0 = Math.floor((bottom + 1) / scale);
  const cropH0 = Math.max(1, bottom0 - top0);

  const out = document.createElement("canvas");
  out.width = img.width;
  out.height = cropH0;

  const octx = out.getContext("2d");
  octx.drawImage(img, 0, top0, img.width, cropH0, 0, 0, img.width, cropH0);

  // JPEG圧縮は軽く（PDF化しやすく）
  return out.toDataURL("image/jpeg", 0.92);
}

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/* -------------------------
   9) LINE：追加/開く
------------------------- */
function openMembershipLine() {
  state.lineOpened = true;
  saveState();
  syncStateToUI();

  // iOS/Android両対応：そのまま開く
  window.open(OFA_MEMBERSHIP_LINE_URL, "_blank", "noopener,noreferrer");
  showToast("OFAメンバーシップLINEを開きました");
}

/* -------------------------
   10) 規約文（あなたの指定に差し替え）
------------------------- */
function injectTermsText() {
  const box = $("#termsList");
  if (!box) return;

  const items = [
    "内容を確認し、同意して次へ進んでください。",
    "本登録はドライバー本人が行うものとします。",
    "入力内容および提出書類は正確な情報であることを保証してください。",
    "虚申告・不正が判明した場合、登録・契約をお断りする場合があります。",
    "取得した個人情報は、業務連絡・案件調整・法令対応の目的で利用します。",
    "登録後、OFA GROUP担当者より連絡を行い案件を決定します。",
  ];

  box.innerHTML = items.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* -------------------------
   11) PDF作成
   - jsPDF + html2canvas が index.html に読み込み済み想定
   - PDF用に #pdfPaper を埋めて、A4で出力
   - 免許証画像は「上下余白カット済み」を貼る（サイズは維持）
------------------------- */
function fillPdfPaper() {
  const paper = $("#pdfPaper");
  if (!paper) return false;

  // 日付
  const dateEl = $("#pdfDate");
  if (dateEl) dateEl.textContent = `作成日時：${new Date().toLocaleString("ja-JP")}`;

  // 基本情報
  setText("#pdf_nameKanji", state.nameKanji);
  setText("#pdf_nameKana", state.nameKana);
  setText("#pdf_phone", state.phone);
  setText("#pdf_email", state.email);
  setText("#pdf_birth", state.birth);

  // 住所
  setText("#pdf_address", state.address);

  // 所属
  setText("#pdf_affiliationType", state.affiliationType);
  setText("#pdf_affiliationCompany", state.affiliationCompany);

  // 車両（STEP4）
  setText("#pdf_vehicleType", state.vehicleType);
  setText("#pdf_blackStatus", state.blackStatus);
  setText("#pdf_carNumber", state.carNumber);

  // 口座
  setText("#pdf_bankName", state.bankName);
  setText("#pdf_accountType", state.accountType);
  setText("#pdf_accountNumber", state.accountNumber);
  setText("#pdf_accountNameKana", state.accountNameKana);

  // 免許証画像（PDF用：トリム版）
  const imgFront = $("#pdf_licenseFront");
  const imgBack = $("#pdf_licenseBack");
  if (imgFront) imgFront.src = state.licenseFrontCropped || state.licenseFront || "";
  if (imgBack) imgBack.src = state.licenseBackCropped || state.licenseBack || "";

  // 補足（LINE）
  const note = $("#pdfFooterNote");
  if (note) {
    note.textContent = "このPDFを「OFAメンバーシップLINE」へ添付して送信してください。";
  }

  return true;

  function setText(sel, v) {
    const el = $(sel);
    if (el) el.textContent = (v || "").trim();
  }
}

async function createPdfAndDownload() {
  // 導線：LINEを先に踏ませたい
  if (!state.lineOpened) {
    showToast("先に「OFAメンバーシップLINE」を追加/開いてください");
    return;
  }

  // ライブラリチェック
  if (typeof window.html2canvas !== "function" || typeof window.jspdf?.jsPDF !== "function") {
    showToast("PDF生成ライブラリが読み込まれていません（index.html確認）");
    return;
  }

  const ok = fillPdfPaper();
  if (!ok) {
    showToast("PDFテンプレート(#pdfPaper)が見つかりません");
    return;
  }

  showToast("PDFを作成中…", 2800);

  // 画像読み込みを少し待つ
  await waitImagesLoaded(["#pdf_licenseFront", "#pdf_licenseBack"]);

  const paper = $("#pdfPaper");

  // html2canvas でA4相当をキャプチャ
  const canvas = await window.html2canvas(paper, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "pt", "a4");

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // 画像をA4にフィット
  const imgW = canvas.width;
  const imgH = canvas.height;
  const ratio = Math.min(pageW / imgW, pageH / imgH);
  const w = imgW * ratio;
  const h = imgH * ratio;
  const x = (pageW - w) / 2;
  const y = (pageH - h) / 2;

  pdf.addImage(imgData, "JPEG", x, y, w, h, undefined, "FAST");

  const filename = `OFA_driver_entry_${nowStamp()}.pdf`;
  pdf.save(filename);

  showToast("PDFを保存しました");
}

function waitImagesLoaded(selectors) {
  const imgs = selectors.map((s) => $(s)).filter(Boolean);
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise((res) => {
          if (!img.src) return res();
          if (img.complete) return res();
          img.onload = () => res();
          img.onerror = () => res();
        })
    )
  );
}

/* -------------------------
   12) 初期化
------------------------- */
function init() {
  loadState();
  bindElements();

  // STEP4 select の選択肢を強制的に統一
  ensureOptions(els.vehicleType, VEHICLE_TYPES);
  ensureOptions(els.blackStatus, BLACK_STATUS);

  // 規約テキスト差し替え
  injectTermsText();

  // state -> UI
  syncStateToUI();

  // nav wiring
  wireInputs();

  // step復元
  setStep(state.step || 1);

  // 「次へ進めない」対策：Enterで次へ（フォーム送信される環境用）
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const active = document.activeElement;
    if (!active) return;

    // textareaはEnterを許可
    if (active.tagName === "TEXTAREA") return;

    const btnNext = $("#btnNext");
    if (btnNext && !btnNext.disabled) {
      e.preventDefault();
      nextStep();
    }
  });

  // デバッグ：Done画面に警告（URL未設定など）
  // ※あなたのLINE URLは固定済みなので基本出ません
  const dbg = $("#debugHint");
  if (dbg) dbg.textContent = "";
}

document.addEventListener("DOMContentLoaded", init);
