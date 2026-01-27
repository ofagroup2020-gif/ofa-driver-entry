// public/app.js
const steps = [...document.querySelectorAll(".step")];
const barFill = document.getElementById("barFill");
const stepText = document.getElementById("stepText");
const nextBtn = document.getElementById("nextBtn");
const backBtn = document.getElementById("backBtn");
const submitBtn = document.getElementById("submitBtn");
const toast = document.getElementById("toast");
const reviewEl = document.getElementById("review");

let current = 1;
let licFrontDataUrl = "";
let licBackDataUrl = "";

// ✅ LIFF（使えるなら使う）
const LIFF_ID = "YOUR_LIFF_ID_HERE"; // ←あなたのLIFF IDに置換
let liffReady = false;

(async () => {
  try{
    if (window.liff && LIFF_ID && LIFF_ID !== "YOUR_LIFF_ID_HERE") {
      await liff.init({ liffId: LIFF_ID });
      liffReady = true;
    }
  }catch(e){
    liffReady = false;
  }
})();

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

  if(current === steps.length){
    renderReview();
  }
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

// 所属区分ボタン
document.querySelectorAll(".segBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".segBtn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("affType").value = btn.dataset.value;
  });
});

// 画像→DataURL
function fileToDataUrl(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function handleImage(inputId, previewId, setVar){
  const input = document.getElementById(inputId);
  const prev = document.getElementById(previewId);
  input.addEventListener("change", async () => {
    const f = input.files?.[0];
    if(!f) return;
    const url = await fileToDataUrl(f);
    setVar(url);
    prev.src = url;
    prev.classList.add("show");
  });
}
handleImage("licFront", "licFrontPrev", (u)=> licFrontDataUrl = u);
handleImage("licBack", "licBackPrev", (u)=> licBackDataUrl = u);

function renderReview(){
  const data = collectData();
  reviewEl.innerHTML = `
    <div><strong>氏名</strong>${data.name}（${data.kana}）</div>
    <div><strong>電話</strong>${data.phone}</div>
    <div><strong>メール</strong>${data.email}</div>
    <div><strong>生年月日</strong>${data.birth}</div>
    <hr/>
    <div><strong>住所</strong>${data.zip} ${data.pref}${data.city}${data.addr1} ${data.addr2}</div>
    <hr/>
    <div><strong>所属区分</strong>${data.affType}</div>
    <div><strong>所属会社</strong>${data.company || "—"}</div>
    <hr/>
    <div><strong>車種</strong>${data.vehicleType}</div>
    <div><strong>ナンバー</strong>${data.plate}</div>
    <div><strong>黒ナンバー</strong>${data.blackPlate}</div>
    <hr/>
    <div><strong>振込先</strong>${data.bank} ${data.branch} / ${data.acctType} ${data.acctNo}</div>
    <div><strong>名義</strong>${data.acctName}</div>
  `;
}

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

// ✅ PDF生成（日本語を綺麗に出すには本来フォント埋め込みが必要）
// ただしまず「動く」版を優先：日本語は表示可能な環境が多いが、崩れる場合あり。
// 完全日本語フォント埋め込み版も必要なら次で出す。
async function buildPdfBlob(){
  const { jsPDF } = window.jspdf;
  const data = collectData();

  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // ヘッダー
  doc.setFontSize(16);
  doc.text("OFA GROUP Driver Entry Sheet", 14, 16);
  doc.setFontSize(10);
  doc.text(`作成日: ${new Date().toLocaleString("ja-JP")}`, 14, 22);

  // ブロック
  doc.setFontSize(12);
  let y = 32;

  const line = (label, value) => {
    doc.setFontSize(10);
    doc.text(label, 14, y);
    doc.setFontSize(11);
    doc.text(String(value || "—"), 55, y);
    y += 7;
  };

  doc.setDrawColor(220);
  doc.line(14, y-3, 196, y-3);

  line("氏名", `${data.name}（${data.kana}）`);
  line("電話", data.phone);
  line("メール", data.email);
  line("生年月日", data.birth);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("住所", `${data.zip} ${data.pref}${data.city}${data.addr1} ${data.addr2}`);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("所属区分", data.affType);
  line("所属会社", data.company);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("車種", data.vehicleType);
  line("ナンバー", data.plate);
  line("黒ナンバー", data.blackPlate);

  y += 2; doc.line(14, y-3, 196, y-3);

  line("銀行", data.bank);
  line("支店", data.branch);
  line("口座種別", data.acctType);
  line("口座番号", data.acctNo);
  line("名義(カナ)", data.acctName);

  // 免許画像
  const imgY = Math.max(y + 6, 170);
  doc.setFontSize(12);
  doc.text("運転免許証", 14, imgY);

  // 画像は右側に並べる
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

  const pdfBlob = doc.output("blob");
  return pdfBlob;
}

async function uploadPdf(pdfBlob, filename){
  const fd = new FormData();
  fd.append("pdf", pdfBlob, filename);

  const res = await fetch("/api/upload-pdf", { method:"POST", body: fd });
  const json = await res.json();
  if(!json.ok) throw new Error(json.message || "upload failed");
  return json.url;
}

async function shareToLine(url, data){
  const text =
`【OFA GROUP エントリー】
新規ドライバー登録がありました。

氏名：${data.name}
エリア：${data.pref}
所属：${data.affType}
車両：${data.vehicleType} / ${data.plate}

▼ エントリーPDF
${url}
`;

  // LIFFが使えるなら送信先選択で共有（グループ/個人どちらもOK）
  if(liffReady && liff.isInClient()){
    await liff.shareTargetPicker([
      { type:"text", text }
    ]);
    return;
  }

  // 非LIFF：URLをコピーしてLINEへ案内
  await navigator.clipboard.writeText(text).catch(()=>{});
  alert("PDFリンクをコピーしました。LINEに貼り付けて送ってください。\n\n" + text);
}

submitBtn?.addEventListener("click", async () => {
  // 全体最終チェック
  for(let i=1;i<=7;i++){
    const msg = validateStep(i);
    if(msg){ showToast(msg); setStep(i); return; }
  }

  try{
    submitBtn.disabled = true;
    submitBtn.textContent = "PDF作成中...";

    const data = collectData();
    const ymd = new Date().toISOString().slice(0,10);
    const safeName = (data.name || "no_name").replace(/[^\wぁ-んァ-ヶ一-龠ー\s]/g,"_").replace(/\s+/g,"_");
    const filename = `OFA_エントリー_${safeName}_${ymd}.pdf`;

    const pdfBlob = await buildPdfBlob();

    submitBtn.textContent = "アップロード中...";
    const url = await uploadPdf(pdfBlob, filename);

    submitBtn.textContent = "LINE送信中...";
    await shareToLine(url, data);

    submitBtn.textContent = "完了しました";
    showToast("登録完了：OFA管理が対応します");
  }catch(e){
    console.error(e);
    alert("エラーが発生しました：\n" + (e?.message || e));
    submitBtn.disabled = false;
    submitBtn.textContent = "登録完了 → PDF作成 → LINE送信";
  }
});

// 初期表示
setStep(1);
