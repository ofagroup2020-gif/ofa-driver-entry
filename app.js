/* =========================================================
  OFA Driver App - app.js（完全版）
  - 8ステップ動作
  - STEP7同意でのみ次へ
  - PDF（日本語）生成：assets/NotoSansJP-Regular.ttf を埋め込み
  - 免許証写真もPDFへ（圧縮して貼付）
========================================================= */

const LINE_MEMBERSHIP_URL = "https://lin.ee/Ev7r84H5";
const FONT_TTF_PATH = "./assets/NotoSansJP-Regular.ttf";

const steps = Array.from(document.querySelectorAll(".step"));
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const barFill = document.getElementById("barFill");
const stepLabel = document.getElementById("stepLabel");
const toastEl = document.getElementById("toast");
const dots = Array.from(document.querySelectorAll(".dots .d"));

const makePdfBtn = document.getElementById("makePdfBtn");
const lineLinkBtn = document.getElementById("lineLinkBtn");

lineLinkBtn.href = LINE_MEMBERSHIP_URL;

let current = 1;
let licFrontFile = null;
let licBackFile = null;

function toast(msg){
  toastEl.textContent = msg;
  toastEl.style.display = "block";
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=> toastEl.style.display = "none", 2200);
}

function setStep(n){
  current = Math.max(1, Math.min(8, n));
  steps.forEach(s => s.classList.remove("active"));
  const active = document.querySelector(`.step[data-step="${current}"]`);
  if(active) active.classList.add("active");

  const pct = (current / 8) * 100;
  barFill.style.width = `${pct}%`;
  stepLabel.textContent = `STEP ${current} / 8`;

  dots.forEach((d,i)=>{
    d.classList.toggle("on", i === current-1);
  });

  backBtn.style.display = (current === 1) ? "none" : "inline-flex";
  nextBtn.style.display = (current === 8) ? "none" : "inline-flex";

  // STEP7は同意してなければ次へ不可（見た目も変更）
  if(current === 7){
    updateNextEnabled();
  }else{
    nextBtn.disabled = false;
    nextBtn.style.opacity = "1";
    nextBtn.style.filter = "none";
  }
}

function updateNextEnabled(){
  const agree = document.getElementById("agree");
  const ok = !!agree?.checked;
  nextBtn.disabled = !ok;
  nextBtn.style.opacity = ok ? "1" : "0.45";
  nextBtn.style.filter = ok ? "none" : "grayscale(0.35)";
}

document.getElementById("agree")?.addEventListener("change", updateNextEnabled);

// 所属区分（セグ）
document.querySelectorAll(".segBtn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".segBtn").forEach(b=> b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("affType").value = btn.dataset.value || "";
  });
});

// 画像プレビュー
function previewFile(inputEl, imgEl, setter){
  inputEl.addEventListener("change", (e)=>{
    const f = e.target.files?.[0] || null;
    setter(f);
    if(!f){
      imgEl.style.display="none";
      imgEl.src="";
      return;
    }
    const url = URL.createObjectURL(f);
    imgEl.src = url;
    imgEl.style.display="block";
    imgEl.onload = ()=> URL.revokeObjectURL(url);
  });
}

previewFile(
  document.getElementById("licFront"),
  document.getElementById("licFrontPrev"),
  (f)=>{ licFrontFile = f; }
);

previewFile(
  document.getElementById("licBack"),
  document.getElementById("licBackPrev"),
  (f)=>{ licBackFile = f; }
);

// 入力取得
const V = (id) => (document.getElementById(id)?.value || "").trim();

function normalizeZip(v){
  return v.replace(/[^\d]/g,"").slice(0,7);
}
function normalizePhone(v){
  return v.replace(/[^\d+]/g,"").replace(/^0/,"0").slice(0,15);
}
function normalizeBirth(v){
  // yyyy-mm-dd -> yyyy/mm/dd
  if(!v) return "";
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return v;
  return `${m[1]}/${m[2]}/${m[3]}`;
}

function collect(){
  return {
    name: V("name"),
    kana: V("kana"),
    phone: normalizePhone(V("phone")),
    email: V("email"),
    birth: normalizeBirth(V("birth")),

    zip: normalizeZip(V("zip")),
    pref: V("pref"),
    city: V("city"),
    addr1: V("addr1"),
    addr2: V("addr2"),

    affType: V("affType"),
    company: V("company"),

    vehicleType: V("vehicleType"),
    plate: V("plate"),
    blackPlate: V("blackPlate"),

    bank: V("bank"),
    branch: V("branch"),
    acctType: V("acctType"),
    acctNo: V("acctNo"),
    acctName: V("acctName"),
  };
}

function validate(stepNo){
  const d = collect();

  if(stepNo === 1){
    if(!d.name || !d.kana || !d.phone || !d.email || !d.birth) return "STEP1：未入力があります";
  }
  if(stepNo === 2){
    if(!d.zip || !d.pref || !d.city || !d.addr1) return "STEP2：住所を入力してください";
    if(d.zip.length !== 7) return "STEP2：郵便番号は7桁で入力してください";
  }
  if(stepNo === 3){
    if(!d.affType) return "STEP3：所属区分を選択してください";
  }
  if(stepNo === 4){
    if(!d.vehicleType || !d.plate || !d.blackPlate) return "STEP4：車両情報を入力してください";
  }
  if(stepNo === 5){
    if(!licFrontFile) return "STEP5：免許証（表面）をアップロードしてください";
  }
  if(stepNo === 6){
    if(!d.bank || !d.branch || !d.acctType || !d.acctNo || !d.acctName) return "STEP6：振込先を入力してください";
  }
  if(stepNo === 7){
    const agree = document.getElementById("agree");
    if(!agree?.checked) return "STEP7：同意チェックを入れてください";
  }
  return "";
}

nextBtn.addEventListener("click", ()=>{
  const msg = validate(current);
  if(msg){ toast(msg); return; }
  setStep(current + 1);
});

backBtn.addEventListener("click", ()=> setStep(current - 1));

// -----------------------------
// PDF（日本語）生成
// -----------------------------
async function loadTtfAsBase64(url){
  const res = await fetch(url, { cache: "no-store" });
  if(!res.ok) throw new Error("FONT_FETCH_FAILED");
  const buf = await res.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for(let i=0;i<bytes.length;i+=chunk){
    binary += String.fromCharCode(...bytes.subarray(i,i+chunk));
  }
  return btoa(binary);
}

// 画像を圧縮してDataURLへ（PDF軽量化）
async function fileToJpegDataUrl(file, maxW=1100, quality=0.78){
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.src = url;

  await new Promise((ok,ng)=>{
    img.onload = ok;
    img.onerror = ng;
  });

  const ratio = Math.min(1, maxW / img.width);
  const w = Math.round(img.width * ratio);
  const h = Math.round(img.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);

  URL.revokeObjectURL(url);
  return canvas.toDataURL("image/jpeg", quality);
}

async function makePdf(){
  const msg = validate(7); // 7までが揃ってること
  if(msg){ toast(msg); return; }

  const d = collect();
  const { jsPDF } = window.jspdf;

  // フォント読み込み（必須）
  let fontBase64 = "";
  try{
    fontBase64 = await loadTtfAsBase64(FONT_TTF_PATH);
  }catch(e){
    toast(`フォントが見つかりません：assets/NotoSansJP-Regular.ttf`);
    return;
  }

  const pdf = new jsPDF({ unit:"pt", format:"a4" });

  // フォント埋め込み
  pdf.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64);
  pdf.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
  pdf.setFont("NotoSansJP", "normal");

  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // ヘッダー帯（グラデ風：簡易）
  pdf.setFillColor(255, 122, 0); pdf.rect(0,0,W,54,"F");
  pdf.setFillColor(255, 61, 110); pdf.rect(W*0.34,0,W*0.33,54,"F");
  pdf.setFillColor(124, 58, 237); pdf.rect(W*0.67,0,W*0.33,54,"F");

  pdf.setTextColor(255,255,255);
  pdf.setFontSize(15);
  pdf.text("OFA GROUP  ドライバー登録シート", 24, 34);

  pdf.setTextColor(11,18,32);
  pdf.setFontSize(11);

  const lines = [
    `作成日時：${new Date().toLocaleString("ja-JP")}`,
    `氏名：${d.name}`,
    `フリガナ：${d.kana}`,
    `電話：${d.phone}`,
    `メール：${d.email}`,
    `生年月日：${d.birth}`,
    ``,
    `郵便番号：${d.zip}`,
    `住所：${d.pref}${d.city}${d.addr1} ${d.addr2}`,
    ``,
    `所属区分：${d.affType}`,
    `所属会社名：${d.company || "—"}`,
    ``,
    `車種：${d.vehicleType}`,
    `車両ナンバー：${d.plate}`,
    `黒ナンバー：${d.blackPlate}`,
    ``,
    `銀行名：${d.bank}`,
    `支店名：${d.branch}`,
    `口座種別：${d.acctType}`,
    `口座番号：${d.acctNo}`,
    `口座名義（カナ）：${d.acctName}`,
  ];

  let y = 78;
  const lh = 16;

  // 本文ボックス
  pdf.setDrawColor(230,231,235);
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(18, 66, W-36, 360, 14, 14, "FD");

  y = 92;
  pdf.setFontSize(11);
  lines.forEach(t=>{
    if(t === ""){
      y += lh;
    }else{
      pdf.text(t, 32, y);
      y += lh;
    }
  });

  // 免許証画像（ページ下部）
  const imgAreaTop = 440;
  pdf.setDrawColor(230,231,235);
  pdf.setFillColor(255,255,255);
  pdf.roundedRect(18, imgAreaTop, W-36, 360, 14, 14, "FD");

  pdf.setFontSize(12);
  pdf.text("運転免許証（提出画像）", 32, imgAreaTop + 28);

  // 画像貼付
  let colX1 = 32;
  let colX2 = (W/2) + 8;
  let imgY = imgAreaTop + 44;
  let imgW = (W - 36 - 32 - 18) / 2; // だいたい半分
  let imgH = 220;

  // 表面
  if(licFrontFile){
    const durl = await fileToJpegDataUrl(licFrontFile, 1200, 0.78);
    pdf.setFontSize(11);
    pdf.text("表面（必須）", colX1, imgY);
    pdf.addImage(durl, "JPEG", colX1, imgY + 10, imgW - 16, imgH);
  }

  // 裏面
  if(licBackFile){
    const durl = await fileToJpegDataUrl(licBackFile, 1200, 0.78);
    pdf.setFontSize(11);
    pdf.text("裏面（任意）", colX2, imgY);
    pdf.addImage(durl, "JPEG", colX2, imgY + 10, imgW - 16, imgH);
  }else{
    pdf.setFontSize(11);
    pdf.text("裏面（任意）", colX2, imgY);
    pdf.setTextColor(100,116,139);
    pdf.text("未提出", colX2, imgY + 26);
    pdf.setTextColor(11,18,32);
  }

  // フッター
  pdf.setTextColor(100,116,139);
  pdf.setFontSize(10);
  pdf.text("© OFA GROUP   One for All, All for One", 24, H - 22);

  // 保存
  const ymd = new Date().toISOString().slice(0,10).replaceAll("-","");
  const safeName = (d.name || "OFA").replace(/[\\/:*?"<>|]/g,"");
  pdf.save(`OFA_登録_${safeName}_${ymd}.pdf`);

  toast("PDFを保存しました。LINEへ送信してください。");
  setStep(8);
}

makePdfBtn.addEventListener("click", makePdf);

// 初期表示
setStep(1);
