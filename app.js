// =====================
// ここだけあなた用設定
// =====================
// 「OFAメンバーシップLINE」へ変更したいリンクを入れる
// 例）https://lin.ee/vdhKWQg など
const LINE_URL = "https://lin.ee/Ev7r84H5";

// =====================

const steps = [...document.querySelectorAll(".step")];
const barFill = document.getElementById("barFill");
const stepLabel = document.getElementById("stepLabel");
const dots = [...document.querySelectorAll(".dots .d")];

const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const toast = document.getElementById("toast");

const makePdfBtn = document.getElementById("makePdfBtn");
const lineLinkBtn = document.getElementById("lineLinkBtn");

let current = 1;
let licFrontDataUrl = "";
let licBackDataUrl = "";

// LINEリンク反映
lineLinkBtn.href = LINE_URL;

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=> toast.classList.remove("show"), 1600);
}

function setStep(n){
  current = n;
  steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step) === current));

  const pct = ((current - 1) / (steps.length - 1)) * 100;
  barFill.style.width = `${pct}%`;
  stepLabel.textContent = `STEP ${current} / ${steps.length}`;

  dots.forEach((d, i) => d.classList.toggle("on", i < current));

  backBtn.style.display = current === 1 ? "none" : "inline-block";
  nextBtn.style.display = current === steps.length ? "none" : "inline-block";
}

function val(id){ return document.getElementById(id).value?.trim() || ""; }

function validateStep(n){
  if(n === 1){
    if(!val("name") || !val("kana") || !val("phone") || !val("email") || !val("birth")) return "基本情報を入力してください";
  }
  if(n === 2){
    if(!val("zip") || !val("pref") || !val("city") || !val("addr1")) return "住所を入力してください";
  }
  if(n === 3){
    if(!val("affType")) return "所属区分を選択してください";
  }
  if(n === 4){
    if(!val("vehicleType") || !val("plate") || !val("blackPlate")) return "車両情報を入力してください";
  }
  if(n === 5){
    if(!licFrontDataUrl) return "免許証（表面）をアップロードしてください";
  }
  if(n === 6){
    if(!val("bank") || !val("branch") || !val("acctType") || !val("acctNo") || !val("acctName")) return "振込先を入力してください";
  }
  if(n === 7){
    const agree = document.getElementById("agree")?.checked;
    if(!agree) return "規約に同意してください";
  }
  return "";
}

nextBtn.addEventListener("click", () => {
  const msg = validateStep(current);
  if(msg){ showToast(msg); return; }
  setStep(current + 1);
});

backBtn.addEventListener("click", () => setStep(Math.max(1, current - 1)));

// 所属ボタン（色付き）
document.querySelectorAll(".segBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".segBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("affType").value = btn.dataset.value;
  });
});

// 画像プレビュー
function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
async function bindImage(inputId, previewId, setter){
  const input = document.getElementById(inputId);
  const prev = document.getElementById(previewId);
  input.addEventListener("change", async () => {
    const f = input.files?.[0];
    if(!f) return;
    const url = await fileToDataUrl(f);
    setter(url);
    prev.src = url;
    prev.classList.add("show");
  });
}
bindImage("licFront","licFrontPrev",(u)=> licFrontDataUrl=u);
bindImage("licBack","licBackPrev",(u)=> licBackDataUrl=u);

// PDF作成（※あなたの既存PDFロジックが別にあるなら、ここは差し替えてOK）
async function buildAndSavePdf(){
  // 最低限チェック
  for(let i=1;i<=7;i++){
    const msg = validateStep(i);
    if(msg){ showToast(msg); setStep(i); return; }
  }

  // ここは「PDF生成が既に完成している」前提のため、
  // 今回は“保存できた”導線を崩さない最小のダミーPDFにしてあります。
  // 既存の日本語PDF生成コードがある場合は、ここへ丸ごと貼ってください。
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit:"mm", format:"a4" });

  doc.setFontSize(16);
  doc.text("OFA GROUP Driver Entry", 14, 18);
  doc.setFontSize(11);
  doc.text(`氏名: ${val("name")}（${val("kana")}）`, 14, 32);
  doc.text(`電話: ${val("phone")}`, 14, 40);
  doc.text(`メール: ${val("email")}`, 14, 48);
  doc.text(`住所: ${val("zip")} ${val("pref")}${val("city")}${val("addr1")} ${val("addr2")}`, 14, 56);

  const ymd = new Date().toISOString().slice(0,10);
  const safeName = (val("name") || "no_name").replace(/[^\wぁ-んァ-ヶ一-龠ー\s]/g,"_").replace(/\s+/g,"_");
  doc.save(`OFA_エントリー_${safeName}_${ymd}.pdf`);

  showToast("PDFを保存しました。OFAメンバーシップLINEへ送信してください");
  setStep(8);
}

makePdfBtn.addEventListener("click", buildAndSavePdf);

// 初期
setStep(1);
