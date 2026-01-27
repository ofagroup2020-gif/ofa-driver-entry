const steps = [...document.querySelectorAll(".step")];
const barFill = document.getElementById("barFill");
const stepText = document.getElementById("stepText");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const toast = document.getElementById("toast");
const reviewEl = document.getElementById("review");
const makePdfBtn = document.getElementById("makePdfBtn");

let current = 1;
let licFrontDataUrl = "";
let licBackDataUrl = "";

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1700);
}
function setStep(n){
  current = n;
  steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step) === current));
  const pct = ((current - 1) / (steps.length - 1)) * 100;
  barFill.style.width = `${pct}%`;
  stepText.textContent = `STEP ${current} / ${steps.length}`;
  backBtn.style.visibility = current === 1 ? "hidden" : "visible";
  nextBtn.style.display = current === steps.length ? "none" : "inline-block";
  document.querySelector(".nav").style.display = current === steps.length ? "none" : "flex";

  if(current === steps.length) renderReview();
}
function val(id){ return document.getElementById(id).value?.trim() || ""; }

function validateStep(n){
  if(n === 1){
    if(!val("email") || !val("phone")) return "メールと電話を入力してください";
  }
  if(n === 2){
    if(!val("name") || !val("kana") || !val("birth")) return "氏名・フリガナ・生年月日を入力してください";
  }
  if(n === 3){
    if(!val("zip") || !val("pref") || !val("city") || !val("addr1")) return "住所（郵便番号〜番地）を入力してください";
  }
  if(n === 4){
    if(!val("affType")) return "所属区分を選択してください";
  }
  if(n === 5){
    if(!val("vehicleType") || !val("plate") || !val("blackPlate")) return "車両情報を入力してください";
  }
  if(n === 6){
    if(!licFrontDataUrl) return "免許証（表面）をアップロードしてください";
  }
  if(n === 7){
    if(!val("bank") || !val("branch") || !val("acctType") || !val("acctNo") || !val("acctName")) return "振込先情報を入力してください";
  }
  return "";
}

nextBtn.addEventListener("click", () => {
  const msg = validateStep(current);
  if(msg){ showToast(msg); return; }
  setStep(current + 1);
});
backBtn.addEventListener("click", () => setStep(Math.max(1, current - 1)));

// 所属区分
document.querySelectorAll(".segBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".segBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("affType").value = btn.dataset.value;
  });
});

// file -> dataURL
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
bindImage("licFront", "licFrontPrev", (u)=> licFrontDataUrl=u);
bindImage("licBack", "licBackPrev", (u)=> licBackDataUrl=u);

function collectData(){
  return {
    email: val("email"),
    phone: val("phone"),
    name: val("name"),
    kana: val("kana"),
    birth: val("birth"),
    zip: val("zip"),
    pref: val("pref"),
    city: val("city"),
    addr1: val("addr1"),
    addr2: val("addr2"),
    affType: val("affType"),
    company: val("company"),
    vehicleType: val("vehicleType"),
    plate: val("plate"),
    blackPlate: val("blackPlate"),
    bank: val("bank"),
    branch: val("branch"),
    acctType: val("acctType"),
    acctNo: val("acctNo"),
    acctName: val("acctName"),
  };
}

function renderReview(){
  const d = collectData();
  reviewEl.innerHTML = `
    <div><strong>氏名</strong>${d.name}（${d.kana}）</div>
    <div><strong>電話</strong>${d.phone}</div>
    <div><strong>メール</strong>${d.email}</div>
    <div><strong>生年月日</strong>${d.birth}</div>
    <hr/>
    <div><strong>住所</strong>${d.zip} ${d.pref}${d.city}${d.addr1} ${d.addr2}</div>
    <hr/>
    <div><strong>所属区分</strong>${d.affType}</div>
    <div><strong>所属会社</strong>${d.company || "—"}</div>
    <hr/>
    <div><strong>車両</strong>${d.vehicleType} / ${d.plate} / 黒ナンバー:${d.blackPlate}</div>
    <hr/>
    <div><strong>振込先</strong>${d.bank} ${d.branch} / ${d.acctType} ${d.acctNo}</div>
    <div><strong>名義</strong>${d.acctName}</div>
  `;
}

// PDF生成（GitHub Pages対応：端末に保存）
async function buildAndSavePdf(){
  // 全体チェック
  for(let i=1;i<=7;i++){
    const msg = validateStep(i);
    if(msg){ showToast(msg); setStep(i); return; }
  }

  const { jsPDF } = window.jspdf;
  const d = collectData();
  const doc = new jsPDF({ unit:"mm", format:"a4" });

  // Header
  doc.setFontSize(16);
  doc.text("OFA GROUP Driver Entry Sheet", 14, 16);
  doc.setFontSize(10);
  doc.text(`作成日: ${new Date().toLocaleString("ja-JP")}`, 14, 22);

  let y = 34;
  const line = (label, value) => {
    doc.setFontSize(10);
    doc.text(label, 14, y);
    doc.setFontSize(11);
    doc.text(String(value || "—"), 55, y);
    y += 7;
  };

  doc.setDrawColor(220);
  doc.line(14, y-3, 196, y-3);

  line("氏名", `${d.name}（${d.kana}）`);
  line("電話", d.phone);
  line("メール", d.email);
  line("生年月日", d.birth);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("住所", `${d.zip} ${d.pref}${d.city}${d.addr1} ${d.addr2}`);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("所属区分", d.affType);
  line("所属会社", d.company);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("車種", d.vehicleType);
  line("ナンバー", d.plate);
  line("黒ナンバー", d.blackPlate);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("銀行", d.bank);
  line("支店", d.branch);
  line("口座種別", d.acctType);
  line("口座番号", d.acctNo);
  line("名義(カナ)", d.acctName);

  // License images
  const imgY = Math.max(y + 6, 170);
  doc.setFontSize(12);
  doc.text("運転免許証", 14, imgY);

  const boxW = 85, boxH = 50;
  const leftX = 14, rightX = 106;
  const topY = imgY + 6;

  doc.setDrawColor(220);
  doc.rect(leftX, topY, boxW, boxH);
  doc.text("表面", leftX, topY - 2);

  if(licFrontDataUrl){
    doc.addImage(licFrontDataUrl, "JPEG", leftX+1, topY+1, boxW-2, boxH-2, undefined, "FAST");
  }

  doc.rect(rightX, topY, boxW, boxH);
  doc.text("裏面(任意)", rightX, topY - 2);

  if(licBackDataUrl){
    doc.addImage(licBackDataUrl, "JPEG", rightX+1, topY+1, boxW-2, boxH-2, undefined, "FAST");
  } else {
    doc.setFontSize(10);
    doc.text("未提出", rightX + 34, topY + 28);
  }

  const ymd = new Date().toISOString().slice(0,10);
  const safeName = (d.name || "no_name").replace(/[^\wぁ-んァ-ヶ一-龠ー\s]/g,"_").replace(/\s+/g,"_");
  const filename = `OFA_エントリー_${safeName}_${ymd}.pdf`;

  doc.save(filename);
  showToast("PDFを保存しました。LINEで送ってください");
}

makePdfBtn.addEventListener("click", buildAndSavePdf);

// 初期
setStep(1);
