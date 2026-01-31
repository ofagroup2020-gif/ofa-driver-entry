/* ========= SETTINGS ========= */
const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt";

/* ========= STATE ========= */
let currentStep = 1;
const totalSteps = 8;
let affiliation = ""; // 協力会社/FC/個人
let licFrontDataUrl = "";
let licBackDataUrl = "";
let lineOpenedOnce = false;

/* ========= HELPERS ========= */
const $ = (id) => document.getElementById(id);

function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 2200);
}

function pad2(n){ return String(n).padStart(2,"0"); }
function nowJstString(){
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}/${m}/${dd} ${hh}:${mm}`;
}
function fileNameStamp(){
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth()+1);
  const dd = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}${m}${dd}_${hh}${mm}`;
}

function setStep(n){
  currentStep = Math.max(1, Math.min(totalSteps, n));

  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  const target = document.querySelector(`.step[data-step="${currentStep}"]`);
  if (target) target.classList.add("active");

  $("stepText").textContent = `STEP ${currentStep} / ${totalSteps}`;

  // progress
  const pct = (currentStep / totalSteps) * 100;
  $("barFill").style.width = `${pct}%`;

  // dots
  const dots = $("dots");
  dots.innerHTML = "";
  for(let i=1;i<=totalSteps;i++){
    const d = document.createElement("div");
    d.className = "d" + (i===currentStep ? " on" : "");
    dots.appendChild(d);
  }

  // Step8: PDFボタンはLINE開いた後に有効化
  if(currentStep === 8){
    updateDoneButtons();
  }

  // Safari対策：ステップ移動後に強制再描画
  document.body.offsetHeight;
}

function bindTap(el, handler){
  if(!el) return;
  const run = (e) => { e.preventDefault(); handler(); };
  el.addEventListener("click", run, {passive:false});
  el.addEventListener("touchend", run, {passive:false}); // iOS Safari
}

function requiredFilledStep1(){
  const nameKanji = $("nameKanji").value.trim();
  const nameKana  = $("nameKana").value.trim();
  const phone     = $("phone").value.trim();
  const email     = $("email").value.trim();
  const dob       = $("dob").value;

  if(!nameKanji || !nameKana || !phone || !email || !dob) return false;
  // email簡易チェック
  if(!email.includes("@")) return false;
  return true;
}

function requiredFilledStep2(){
  const pref = $("pref").value.trim();
  const city = $("city").value.trim();
  const addr1 = $("addr1").value.trim();
  if(!pref || !city || !addr1) return false;
  return true;
}

function requiredFilledStep4(){
  const vehicleType = $("vehicleType").value;
  const blackNo = $("blackNo").value;
  if(!vehicleType) return false;
  if(!blackNo) return false;
  return true;
}

function requiredFilledStep5(){
  const bank = $("bank").value.trim();
  const acctType = $("acctType").value;
  const acctNo = $("acctNo").value.trim();
  const acctNameKana = $("acctNameKana").value.trim();
  if(!bank || !acctType || !acctNo || !acctNameKana) return false;
  return true;
}

function requiredFilledStep6(){
  if(!licFrontDataUrl) return false;
  return true;
}

function updateDoneButtons(){
  const pdfBtn = $("btnMakePdf");
  if(!pdfBtn) return;
  // LINE開いてない場合は作成前に案内する（完全に無効化すると誤解が出るので、押したら案内）
}

/* ========= IMAGE (crop only top/bottom by fitting cover in fixed box) ========= */
/** 画像を「横幅最大で表示」→縦方向だけ切れるように cover でcanvas化 */
async function makeCoverDataUrl(srcDataUrl, outW, outH){
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");

      // cover計算（横幅最大→上下をカット）
      const iw = img.width, ih = img.height;
      const scale = Math.max(outW/iw, outH/ih);
      const sw = outW / scale;
      const sh = outH / scale;
      const sx = (iw - sw) / 2;
      const sy = (ih - sh) / 2;

      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      resolve(canvas.toDataURL("image/jpeg", 0.95));
    };
    img.src = srcDataUrl;
  });
}

/* ========= PDF ========= */
function buildPdfGrid(){
  const rows = [
    {label:"氏名（漢字）", value:$("nameKanji").value.trim()},
    {label:"フリガナ", value:$("nameKana").value.trim()},
    {label:"電話番号", value:$("phone").value.trim()},
    {label:"メール", value:$("email").value.trim()},
    {label:"生年月日", value:($("dob").value || "").replaceAll("-","-")},
    {label:"住所", value:`${$("zip").value.trim()} ${$("pref").value.trim()}${$("city").value.trim()} ${$("addr1").value.trim()}`.trim()},
    {label:"所属区分", value: affiliation || "—"},
    {label:"所属会社名（任意）", value:$("affCompany").value.trim() || "—"},
    {label:"車種", value:$("vehicleType").value || "—"},
    {label:"車両ナンバー", value:$("plate").value.trim() || "—"},
    {label:"黒ナンバー", value:$("blackNo").value || "—"},
    // 支店は削除（要望通り）
    {label:"銀行", value:$("bank").value.trim() || "—"},
    {label:"口座種別", value:$("acctType").value || "—"},
    {label:"口座番号", value:$("acctNo").value.trim() || "—"},
    {label:"口座名義（カナ）", value:$("acctNameKana").value.trim() || "—"},
  ];

  const grid = $("pdfGrid");
  grid.innerHTML = "";
  rows.forEach(r=>{
    const box = document.createElement("div");
    box.className = "pdfItem";
    box.innerHTML = `
      <div class="pdfLabel">${escapeHtml(r.label)}</div>
      <div class="pdfValue">${escapeHtml(r.value)}</div>
    `;
    grid.appendChild(box);
  });
}

function escapeHtml(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function makePdf(){
  // 導線：LINE開いてないなら先に促す（ユーザー要望）
  if(!lineOpenedOnce){
    toast("先に「OFAメンバーシップLINE」を追加/開いてください");
    return;
  }

  if(!licFrontDataUrl){
    toast("免許証（表面）の画像が必要です");
    return;
  }

  $("pdfDate").textContent = `作成日時： ${nowJstString()}`;

  // PDF内の免許証画像は「横幅最大→上下だけカット」する
  // ここはPDFのimg枠（CSS height 340px）に合わせて 900x340 ぐらいで作ると綺麗
  const frontCover = await makeCoverDataUrl(licFrontDataUrl, 1200, 680);
  $("pdfLicFront").src = frontCover;

  if(licBackDataUrl){
    const backCover = await makeCoverDataUrl(licBackDataUrl, 1200, 680);
    $("pdfLicBack").src = backCover;
  }else{
    $("pdfLicBack").src = "";
    $("pdfLicBack").style.background = "#fafafa";
  }

  buildPdfGrid();

  toast("PDF作成中…");

  const paper = $("pdfPaper");

  const canvas = await html2canvas(paper, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff"
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "pt", "a4");
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // 画像をA4にフィット
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  // 1ページに収まらない場合は分割
  let y = 0;
  let remaining = imgH;

  while(remaining > 0){
    pdf.addImage(imgData, "JPEG", 0, y, imgW, imgH);
    remaining -= pageH;
    if(remaining > 0){
      pdf.addPage();
      y -= pageH;
    }
  }

  const fname = `OFA_driver_entry_${fileNameStamp()}.pdf`;
  pdf.save(fname);
  toast("PDFを保存しました（共有からLINEへ送信できます）");
}

/* ========= INIT ========= */
function init(){
  // dots initial
  setStep(1);

  // affiliation buttons
  document.querySelectorAll(".segBtn").forEach(btn=>{
    bindTap(btn, ()=>{
      document.querySelectorAll(".segBtn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      affiliation = btn.dataset.aff || "";
    });
  });

  // file previews
  $("licFront").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    const url = await fileToDataUrl(f);
    licFrontDataUrl = url;
    const prev = $("licFrontPrev");
    prev.src = url;
    prev.style.display = "block";
    toast("免許証（表面）を読み込みました");
  });

  $("licBack").addEventListener("change", async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    const url = await fileToDataUrl(f);
    licBackDataUrl = url;
    const prev = $("licBackPrev");
    prev.src = url;
    prev.style.display = "block";
    toast("免許証（裏面）を読み込みました");
  });

  // NAV: back buttons
  bindTap($("btnBack1"), ()=> toast("最初のステップです"));
  bindTap($("btnBack2"), ()=> setStep(1));
  bindTap($("btnBack3"), ()=> setStep(2));
  bindTap($("btnBack4"), ()=> setStep(3));
  bindTap($("btnBack5"), ()=> setStep(4));
  bindTap($("btnBack6"), ()=> setStep(5));
  bindTap($("btnBack7"), ()=> setStep(6));

  // NAV: next buttons
  bindTap($("btnNext1"), ()=>{
    if(!requiredFilledStep1()){
      toast("必須項目を入力してください（氏名/フリガナ/電話/メール/生年月日）");
      return;
    }
    setStep(2);
  });

  bindTap($("btnNext2"), ()=>{
    if(!requiredFilledStep2()){
      toast("住所を入力してください（都道府県/市区町村/番地）");
      return;
    }
    setStep(3);
  });

  bindTap($("btnNext3"), ()=>{
    // 所属区分は選択推奨（未選択でも進める）
    setStep(4);
  });

  bindTap($("btnNext4"), ()=>{
    if(!requiredFilledStep4()){
      toast("車種と黒ナンバーを選択してください");
      return;
    }
    setStep(5);
  });

  bindTap($("btnNext5"), ()=>{
    if(!requiredFilledStep5()){
      toast("口座情報を入力してください");
      return;
    }
    setStep(6);
  });

  bindTap($("btnNext6"), ()=>{
    if(!requiredFilledStep6()){
      toast("免許証（表面）の画像をアップロードしてください");
      return;
    }
    setStep(7);
  });

  bindTap($("btnNext7"), ()=>{
    if(!$("agree").checked){
      toast("同意チェックが必要です");
      return;
    }
    setStep(8);
  });

  // DONE actions
  bindTap($("btnOpenLine"), ()=>{
    lineOpenedOnce = true;
    // Safariで確実に開く
    window.location.href = OFA_MEMBERSHIP_LINE_URL;
  });

  bindTap($("btnMakePdf"), async ()=>{
    await makePdf();
  });

  bindTap($("btnRestart"), ()=>{
    // リセット
    affiliation = "";
    licFrontDataUrl = "";
    licBackDataUrl = "";
    lineOpenedOnce = false;

    document.querySelectorAll("input").forEach(i=>{
      if(i.type === "file") i.value = "";
      else if(i.type === "checkbox") i.checked = false;
      else i.value = "";
    });
    document.querySelectorAll("select").forEach(s=> s.value = "");
    document.querySelectorAll(".segBtn").forEach(b=>b.classList.remove("active"));
    document.querySelectorAll(".preview").forEach(p=>{ p.src=""; p.style.display="none"; });

    setStep(1);
    toast("最初からやり直します");
  });

  // Safariの「押せない」系保険：フォーム送信を完全無効化
  document.addEventListener("submit", (e)=>e.preventDefault());
}

function fileToDataUrl(file){
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onload = ()=> resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

init();
