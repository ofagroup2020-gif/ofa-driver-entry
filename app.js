/* OFA Driver App - app.js（日本語PDF：ttf不要の画像PDF方式） */

const LINE_MEMBERSHIP_URL = "https://lin.ee/Ev7r84H5"; // OFAメンバーシップLINE

const steps = Array.from(document.querySelectorAll(".step"));
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const barFill = document.getElementById("barFill");
const stepLabel = document.getElementById("stepLabel");
const toastEl = document.getElementById("toast");
const dots = Array.from(document.querySelectorAll(".dots .d"));
const makePdfBtn = document.getElementById("makePdfBtn");
const lineLinkBtn = document.getElementById("lineLinkBtn");

// LINEリンク
lineLinkBtn.href = LINE_MEMBERSHIP_URL;

// ファイル
const licFrontInput = document.getElementById("licFront");
const licBackInput  = document.getElementById("licBack");
const licFrontPrev  = document.getElementById("licFrontPrev");
const licBackPrev   = document.getElementById("licBackPrev");

let current = 1;
let licFrontDataUrl = "";
let licBackDataUrl  = "";

function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(()=>toastEl.classList.remove("show"), 2200);
}

function $(id){ return document.getElementById(id); }
function v(id){ return ($(id)?.value ?? "").trim(); }

function setStep(n){
  current = n;
  steps.forEach(s => s.classList.remove("active"));
  const active = steps.find(s => Number(s.dataset.step) === n);
  if(active) active.classList.add("active");

  const pct = (n / steps.length) * 100;
  barFill.style.width = `${pct}%`;
  stepLabel.textContent = `STEP ${n} / ${steps.length}`;
  dots.forEach((d,i)=> d.classList.toggle("on", i === n-1));

  backBtn.disabled = (n === 1);
  nextBtn.style.display = (n === steps.length) ? "none" : "inline-block";
}

function normalizeBirth(val){
  if(!val) return "";
  // YYYY-MM-DD -> YYYY/MM/DD
  return val.replaceAll("-", "/");
}

function validateStep(stepNo){
  // 必須チェック（必要最低限）
  if(stepNo === 1){
    if(!v("name") || !v("kana") || !v("phone") || !v("email") || !v("birth")){
      return "STEP1：未入力があります";
    }
  }
  if(stepNo === 2){
    if(!v("zip") || !v("pref") || !v("city") || !v("addr1")){
      return "STEP2：住所を入力してください";
    }
  }
  if(stepNo === 3){
    if(!v("affType")){
      return "STEP3：所属区分を選択してください";
    }
  }
  if(stepNo === 4){
    if(!v("vehicleType") || !v("plate") || !v("blackPlate")){
      return "STEP4：車両情報を入力してください";
    }
  }
  if(stepNo === 5){
    if(!licFrontDataUrl){
      return "STEP5：免許証（表面）をアップロードしてください";
    }
  }
  if(stepNo === 6){
    if(!v("bank") || !v("branch") || !v("acctType") || !v("acctNo") || !v("acctName")){
      return "STEP6：銀行情報を入力してください";
    }
  }
  if(stepNo === 7){
    if(!$("agree").checked){
      return "STEP7：同意チェックが必要です";
    }
  }
  return "";
}

function collect(){
  return {
    name: v("name"),
    kana: v("kana"),
    phone: v("phone"),
    email: v("email"),
    birth: normalizeBirth(v("birth")),
    zip: v("zip"),
    pref: v("pref"),
    city: v("city"),
    addr1: v("addr1"),
    addr2: v("addr2"),
    affType: v("affType"),
    company: v("company"),
    vehicleType: v("vehicleType"),
    plate: v("plate"),
    blackPlate: v("blackPlate"),
    bank: v("bank"),
    branch: v("branch"),
    acctType: v("acctType"),
    acctNo: v("acctNo"),
    acctName: v("acctName"),
  };
}

// 所属セグ
document.querySelectorAll(".segBtn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".segBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    $("affType").value = btn.dataset.value;
  });
});

// 画像プレビュー＆DataURL化
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

licFrontInput.addEventListener("change", async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  licFrontDataUrl = await fileToDataUrl(f);
  licFrontPrev.src = licFrontDataUrl;
  licFrontPrev.style.display = "block";
});

licBackInput.addEventListener("change", async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  licBackDataUrl = await fileToDataUrl(f);
  licBackPrev.src = licBackDataUrl;
  licBackPrev.style.display = "block";
});

// 次へ/戻る
nextBtn.addEventListener("click", ()=>{
  const msg = validateStep(current);
  if(msg){ toast(msg); return; }
  setStep(Math.min(current+1, steps.length));
});
backBtn.addEventListener("click", ()=>{
  setStep(Math.max(current-1, 1));
});

// ===== 日本語PDF（画像化方式）=====
async function buildPdfSheetHTML(data){
  const now = new Date();
  const ymd = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")}`;
  const hms = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;

  const addr = `${data.zip} ${data.pref}${data.city}${data.addr1}${data.addr2 ? " " + data.addr2 : ""}`;

  return `
    <div class="pdfTitle">
      <div>
        <h2>OFA GROUP ドライバー登録シート</h2>
        <div class="sub">作成日時：${ymd} ${hms}</div>
      </div>
      <div style="font-weight:900;color:#ff7a00;">One for All, All for One</div>
    </div>

    <div class="pdfGrid">
      <div class="pdfItem"><div class="k">氏名（漢字）</div><div class="v">${escapeHtml(data.name)}</div></div>
      <div class="pdfItem"><div class="k">フリガナ</div><div class="v">${escapeHtml(data.kana)}</div></div>

      <div class="pdfItem"><div class="k">電話番号</div><div class="v">${escapeHtml(data.phone)}</div></div>
      <div class="pdfItem"><div class="k">メール</div><div class="v">${escapeHtml(data.email)}</div></div>

      <div class="pdfItem"><div class="k">生年月日</div><div class="v">${escapeHtml(data.birth)}</div></div>
      <div class="pdfItem"><div class="k">住所</div><div class="v">${escapeHtml(addr)}</div></div>

      <div class="pdfItem"><div class="k">所属区分</div><div class="v">${escapeHtml(data.affType)}</div></div>
      <div class="pdfItem"><div class="k">所属会社名（任意）</div><div class="v">${escapeHtml(data.company || "—")}</div></div>

      <div class="pdfItem"><div class="k">車種</div><div class="v">${escapeHtml(data.vehicleType)}</div></div>
      <div class="pdfItem"><div class="k">車両ナンバー</div><div class="v">${escapeHtml(data.plate)}</div></div>

      <div class="pdfItem"><div class="k">黒ナンバー</div><div class="v">${escapeHtml(data.blackPlate)}</div></div>
      <div class="pdfItem"><div class="k">銀行</div><div class="v">${escapeHtml(data.bank)} / ${escapeHtml(data.branch)}</div></div>

      <div class="pdfItem"><div class="k">口座種別</div><div class="v">${escapeHtml(data.acctType)}</div></div>
      <div class="pdfItem"><div class="k">口座番号</div><div class="v">${escapeHtml(data.acctNo)}</div></div>

      <div class="pdfItem" style="grid-column:1 / -1;">
        <div class="k">口座名義（カナ）</div>
        <div class="v">${escapeHtml(data.acctName)}</div>
      </div>
    </div>

    <div style="font-weight:900;margin-top:8px;">提出画像</div>
    <div class="pdfImages">
      <div class="pdfImgBox">
        <div class="k">免許証 表面（必須）</div>
        ${licFrontDataUrl ? `<img src="${licFrontDataUrl}" />` : `<div style="color:#999;font-weight:800;">未提出</div>`}
      </div>
      <div class="pdfImgBox">
        <div class="k">免許証 裏面（任意）</div>
        ${licBackDataUrl ? `<img src="${licBackDataUrl}" />` : `<div style="color:#999;font-weight:800;">未提出</div>`}
      </div>
    </div>

    <div style="margin-top:16px;border-top:1px solid #eee;padding-top:10px;color:#555;font-weight:800;">
      このPDFを「OFAメンバーシップLINE」へ添付して送信してください。
    </div>
  `;
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function makeJapanesePdf(){
  // 8まで行ってなくても押せるようにするならここでvalidateしてもOK
  const data = collect();

  const pdfSheet = document.getElementById("pdfSheet");
  pdfSheet.innerHTML = await buildPdfSheetHTML(data);

  // 画像化
  const canvas = await html2canvas(pdfSheet, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  // A4サイズ(mm)
  const pageW = 210;
  const pageH = 297;

  // 画像の比率に合わせて高さ計算
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let y = 0;
  let remaining = imgH;

  // 1ページ目
  pdf.addImage(imgData, "JPEG", 0, y, imgW, imgH);

  // 2ページ目以降（長い場合）
  while(remaining > pageH){
    remaining -= pageH;
    pdf.addPage();
    // yをマイナスにして見えてない部分を次ページに表示
    pdf.addImage(imgData, "JPEG", 0, - (imgH - remaining), imgW, imgH);
  }

  const now = new Date();
  const ymd = now.toISOString().slice(0,10);
  const fileName = `OFA_登録_${data.name || "driver"}_${ymd}.pdf`;

  pdf.save(fileName);
  toast("PDFを保存しました。LINEへ送信してください。");
}

makePdfBtn.addEventListener("click", async ()=>{
  try{
    // 最低限：規約同意まで終わってる状態を推奨
    const msg = validateStep(7); // 同意は必須にしたいなら
    if(msg){ toast(msg); return; }
    await makeJapanesePdf();
  }catch(err){
    console.error(err);
    toast("PDF作成に失敗しました（再読み込みして再試行）");
  }
});

// 初期表示
setStep(1);
