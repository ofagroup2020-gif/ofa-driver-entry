// ★ここをRenderのAPI URLに変更（末尾/api/pdfまで）
const API_PDF_URL = "https://YOUR-RENDER-URL.onrender.com/api/pdf";

// LINE公式（いまのリンクでOK）
const LINE_OA_URL = "https://lin.ee/Ev7r84H5";

const steps = [...document.querySelectorAll(".step")];
const barFill = document.getElementById("barFill");
const stepText = document.getElementById("stepText");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const toast = document.getElementById("toast");

const makePdfBtn = document.getElementById("makePdfBtn");
const lineBtn = document.querySelector(".lineBtn");

let current = 1;
let licFrontFile = null;
let licBackFile = null;

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 1700);
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
}

function val(id){ return document.getElementById(id)?.value?.trim() || ""; }

function validateStep(n){
  if(n===1){
    if(!val("name") || !val("kana") || !val("phone") || !val("email") || !val("birth")) return "基本情報を入力してください";
  }
  if(n===2){
    if(!val("zip") || !val("pref") || !val("city") || !val("addr1")) return "住所を入力してください";
  }
  if(n===3){
    if(!val("affType")) return "所属区分を選択してください";
  }
  if(n===4){
    if(!val("vehicleType") || !val("plate") || !val("blackPlate")) return "車両情報を入力してください";
  }
  if(n===5){
    if(!licFrontFile) return "免許証（表面）をアップロードしてください";
  }
  if(n===6){
    if(!val("bank") || !val("branch") || !val("acctType") || !val("acctNo") || !val("acctName")) return "振込先を入力してください";
  }
  if(n===7){
    const agree = document.getElementById("agree");
    if(agree && !agree.checked) return "規約に同意してください";
  }
  return "";
}

nextBtn?.addEventListener("click", ()=>{
  const msg = validateStep(current);
  if(msg){ showToast(msg); return; }
  setStep(current + 1);
});
backBtn?.addEventListener("click", ()=> setStep(Math.max(1, current - 1)));

document.querySelectorAll(".segBtn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".segBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("affType").value = btn.dataset.value;
  });
});

document.getElementById("licFront")?.addEventListener("change", (e)=>{
  licFrontFile = e.target.files?.[0] || null;
});
document.getElementById("licBack")?.addEventListener("change", (e)=>{
  licBackFile = e.target.files?.[0] || null;
});

function collectData(){
  return {
    name: val("name"),
    kana: val("kana"),
    phone: val("phone"),
    email: val("email"),
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
    acctName: val("acctName")
  };
}

async function makePdfByApi(){
  // 全チェック（1〜7）
  for(let i=1;i<=7;i++){
    const msg = validateStep(i);
    if(msg){ setStep(i); showToast(msg); return; }
  }

  showToast("PDF作成中…");

  const data = collectData();
  const fd = new FormData();
  fd.append("data", JSON.stringify(data));
  fd.append("licFront", licFrontFile);
  if(licBackFile) fd.append("licBack", licBackFile);

  const res = await fetch(API_PDF_URL, { method: "POST", body: fd });
  if(!res.ok){
    const t = await res.text().catch(()=> "");
    console.error(t);
    showToast("PDF作成に失敗しました（API設定を確認）");
    return;
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  // ダウンロード
  const a = document.createElement("a");
  a.href = url;
  a.download = "OFA_登録.pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);

  showToast("PDFを保存しました。LINE公式へ送ってください");
  setStep(8);
}

makePdfBtn?.addEventListener("click", makePdfByApi);
if(lineBtn) lineBtn.href = LINE_OA_URL;

setStep(1);
