/* =========================
   OFA Driver Entry App (Full)
   - STEP 1/8 ～ 8/8
   - iOS/Safari tap bug対策
   - Galaxy/Android PDF重い問題：軽量化 + 進捗表示
   - 日本語PDF：html2canvasで「A4画像化PDF」→確実に表示
   - 免許証：縦長は上下カット（縮小しないで見やすく）
========================= */

const LINE_URL = "https://lin.ee/8x437Vt";

const steps = Array.from(document.querySelectorAll(".step"));
const stepLabel = document.getElementById("stepLabel");
const barFill = document.getElementById("barFill");
const dotsWrap = document.getElementById("dots");

const backBtn = document.getElementById("backBtn");
const nextBtn = document.getElementById("nextBtn");

const toast = document.getElementById("toast");
const busy = document.getElementById("busy");

const howModal = document.getElementById("howModal");
const howCloseBg = document.getElementById("howCloseBg");
const howCloseBtn = document.getElementById("howCloseBtn");

const makePdfBtn = document.getElementById("makePdfBtn");
const openLineBtn = document.getElementById("openLineBtn");
const howBtn = document.getElementById("howBtn");
const savePdfLink = document.getElementById("savePdfLink");

let cur = 0;

// ---- helpers ----
function qs(id){ return document.getElementById(id); }

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 1900);
}

function setBusy(on){
  busy.classList.toggle("on", !!on);
}

function updateProgress(){
  const n = cur + 1;
  stepLabel.textContent = `STEP ${n} / 8`;
  barFill.style.width = `${(n/8)*100}%`;

  const dots = Array.from(dotsWrap.querySelectorAll(".d"));
  dots.forEach((d,i)=>{
    d.classList.toggle("on", i === cur);
  });

  // STEP8は下ナビの「次へ」を隠す
  if (cur === 7){
    nextBtn.style.display = "none";
  } else {
    nextBtn.style.display = "";
  }
}

function showStep(){
  steps.forEach(s=>s.classList.remove("active"));
  steps[cur].classList.add("active");
  updateProgress();

  // hashで現在STEPも出す（リンク共有に便利）
  try{
    history.replaceState(null, "", `#s${cur+1}`);
  }catch(e){}
}

// ---- validation ----
function must(id, label){
  const el = qs(id);
  const v = (el?.value || "").trim();
  if (!v){
    showToast(`${label}を入力してください`);
    el?.focus?.();
    return false;
  }
  return true;
}

function validateCurrentStep(){
  const s = cur + 1;

  if (s === 1){
    if (!must("name","氏名")) return false;
    if (!must("kana","フリガナ")) return false;
    if (!must("phone","電話番号")) return false;
    return true;
  }

  if (s === 2){
    if (!must("zip","郵便番号")) return false;
    if (!must("pref","都道府県")) return false;
    if (!must("city","市区町村")) return false;
    if (!must("addr1","番地")) return false;
    return true;
  }

  if (s === 4){
    if (!must("vehicleType","車種")) return false;
    if (!must("blackPlate","黒ナンバー")) return false;
    return true;
  }

  if (s === 5){
    const f = qs("licFront");
    if (!f.files || !f.files[0]){
      showToast("免許証（表面）をアップロードしてください");
      return false;
    }
    return true;
  }

  if (s === 6){
    if (!must("bank","銀行名")) return false;
    if (!must("acctType","口座種別")) return false;
    if (!must("acctNo","口座番号")) return false;
    if (!must("acctName","口座名義（カナ）")) return false;
    return true;
  }

  if (s === 7){
    if (!qs("agree").checked){
      showToast("規約に同意してください");
      return false;
    }
    return true;
  }

  return true;
}

// ---- step buttons ----
backBtn.addEventListener("click", ()=>{
  if (cur > 0){ cur--; showStep(); }
});

nextBtn.addEventListener("click", ()=>{
  if (!validateCurrentStep()) return;
  if (cur < 7){ cur++; showStep(); }
});

// Safari / Android のタップ不発対策：pointerdownでも反応させる
["pointerdown","touchstart"].forEach(evt=>{
  nextBtn.addEventListener(evt, (e)=>{ /* noop - event binds helps some webviews */ }, {passive:true});
  backBtn.addEventListener(evt, (e)=>{ /* noop */ }, {passive:true});
});

// ---- affiliation buttons ----
document.querySelectorAll(".segBtn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".segBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    qs("affType").value = btn.dataset.value;
    showToast(`選択：${btn.dataset.value}`);
  });
});

// ---- image preview ----
function setPreview(fileInputId, imgId){
  const inp = qs(fileInputId);
  const img = qs(imgId);
  inp.addEventListener("change", ()=>{
    const f = inp.files?.[0];
    if (!f){
      img.style.display = "none";
      img.src = "";
      return;
    }
    const url = URL.createObjectURL(f);
    img.src = url;
    img.style.display = "block";
  });
}
setPreview("licFront","licFrontPrev");
setPreview("licBack","licBackPrev");

// ---- STEP8 actions ----
openLineBtn.addEventListener("click", ()=>{
  window.location.href = LINE_URL;
});

howBtn.addEventListener("click", ()=>{
  howModal.classList.add("on");
  howModal.setAttribute("aria-hidden","false");
});
howCloseBg.addEventListener("click", closeHow);
howCloseBtn.addEventListener("click", closeHow);
function closeHow(){
  howModal.classList.remove("on");
  howModal.setAttribute("aria-hidden","true");
}

// ---- PDF generation core ----
let lastPdfUrl = null;
function revokeLastPdf(){
  try{ if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl); }catch(e){}
  lastPdfUrl = null;
}

function nowString(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`;
}

function pdfFileName(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `OFA_driver_entry_${yyyy}${mm}${dd}_${hh}${mi}.pdf`;
}

function joinAddress(){
  const zip = qs("zip").value.trim();
  const pref = qs("pref").value.trim();
  const city = qs("city").value.trim();
  const addr1 = qs("addr1").value.trim();
  const addr2 = qs("addr2").value.trim();
  return `〒${zip} ${pref}${city}${addr1}${addr2 ? " " + addr2 : ""}`;
}

/**
 * 免許証写真：縦長なら上下をカットしてカード比率へ寄せる（縮小で文字が潰れない）
 * targetAspect = 1.586（免許証の横/縦くらい）
 */
async function cropToLicenseAspect(file, targetAspect = 1.586){
  if (!file) return null;

  const img = await fileToImage(file);

  const w = img.naturalWidth;
  const h = img.naturalHeight;

  // 元の比率
  const aspect = w / h;

  let sx=0, sy=0, sw=w, sh=h;

  if (aspect < targetAspect){
    // 縦長：上下をカット（幅は維持）
    const newH = Math.round(w / targetAspect);
    sh = Math.min(newH, h);
    sy = Math.round((h - sh) / 2);
  } else if (aspect > targetAspect){
    // 横長：左右をカット（高さは維持）
    const newW = Math.round(h * targetAspect);
    sw = Math.min(newW, w);
    sx = Math.round((w - sw) / 2);
  }

  // 出力サイズ（最大幅1200pxで軽量化）
  const maxW = 1200;
  const outW = Math.min(maxW, sw);
  const outH = Math.round(outW * (sh / sw));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d", {alpha:false});

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  // Android/Galaxy向け：JPEG圧縮（判読性維持の範囲）
  const jpegQ = isGalaxyOrLowMem() ? 0.80 : 0.86;
  return canvas.toDataURL("image/jpeg", jpegQ);
}

function isGalaxyOrLowMem(){
  const ua = navigator.userAgent || "";
  const isSamsung = /Samsung|SM-|SC-|Galaxy/i.test(ua);
  const mem = navigator.deviceMemory || 0; // 未対応なら0
  const lowMem = mem && mem <= 4;
  return isSamsung || lowMem;
}

function fileToImage(file){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function fillPdfPaper(frontDataUrl, backDataUrl){
  qs("pdfDate").textContent = `作成日時：${nowString()}`;

  qs("p_name").textContent = qs("name").value.trim();
  qs("p_kana").textContent = qs("kana").value.trim();
  qs("p_phone").textContent = qs("phone").value.trim();
  qs("p_email").textContent = qs("email").value.trim() || "—";
  qs("p_birth").textContent = qs("birth").value || "—";

  qs("p_address").textContent = joinAddress();
  qs("p_aff").textContent = qs("affType").value.trim() || "—";
  qs("p_company").textContent = qs("company").value.trim() || "—";

  qs("p_vehicleType").textContent = qs("vehicleType").value.trim();
  qs("p_blackPlate").textContent = qs("blackPlate").value.trim();
  qs("p_plate").textContent = qs("plate").value.trim() || "—";

  qs("p_bank").textContent = qs("bank").value.trim();
  qs("p_acctType").textContent = qs("acctType").value.trim();
  qs("p_acctNo").textContent = qs("acctNo").value.trim();
  qs("p_acctName").textContent = qs("acctName").value.trim();

  const f = qs("p_licFront");
  const b = qs("p_licBack");
  f.src = frontDataUrl || "";
  b.src = backDataUrl || "";
}

async function renderPdfPaperToPdfBlob(){
  const paper = qs("pdfPaper");

  // Galaxy等はスケールを下げて安定性UP
  const scale = isGalaxyOrLowMem() ? 1.35 : 1.75;

  // 画像化（日本語OK）
  const canvas = await html2canvas(paper, {
    scale,
    backgroundColor: "#ffffff",
    useCORS: true,
    allowTaint: true,
    logging: false
  });

  // jsPDF A4（mm）
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");

  const imgData = canvas.toDataURL("image/jpeg", isGalaxyOrLowMem() ? 0.82 : 0.88);

  // A4に余白込みで配置（途切れ防止）
  const pageW = 210;
  const pageH = 297;
  const margin = 8;

  const targetW = pageW - margin*2;
  const targetH = pageH - margin*2;

  // canvas比率でfit
  const imgW = canvas.width;
  const imgH = canvas.height;
  const imgAspect = imgW / imgH;
  const boxAspect = targetW / targetH;

  let drawW = targetW;
  let drawH = targetH;

  if (imgAspect > boxAspect){
    // 横長→幅優先
    drawW = targetW;
    drawH = targetW / imgAspect;
  } else {
    // 縦長→高さ優先
    drawH = targetH;
    drawW = targetH * imgAspect;
  }

  const x = (pageW - drawW)/2;
  const y = (pageH - drawH)/2;

  pdf.addImage(imgData, "JPEG", x, y, drawW, drawH, "", "FAST");

  return pdf.output("blob");
}

// STEP8のPDFボタン
makePdfBtn.addEventListener("click", async ()=>{
  // 最後の段階で必須が抜けてたら止める
  //（STEP遷移で埋まってる想定だが、直リンク対策）
  if (!qs("name").value.trim() || !qs("phone").value.trim()){
    showToast("未入力があります。STEP1から入力してください");
    cur = 0;
    showStep();
    return;
  }

  setBusy(true);
  try{
    // 免許証画像を“見やすく”整形（縦長は上下カット）
    const frontFile = qs("licFront").files?.[0];
    const backFile = qs("licBack").files?.[0] || null;

    const frontUrl = await cropToLicenseAspect(frontFile);
    const backUrl = backFile ? await cropToLicenseAspect(backFile) : null;

    fillPdfPaper(frontUrl, backUrl);

    // Safariはクリック直後のwindow.openが安定する
    const newWin = window.open("", "_blank");
    if (!newWin){
      setBusy(false);
      alert("ポップアップがブロックされています。ブラウザ設定をご確認ください。");
      return;
    }

    // PDF生成
    const blob = await renderPdfPaperToPdfBlob();

    revokeLastPdf();
    lastPdfUrl = URL.createObjectURL(blob);

    // 新しいタブでPDF表示（保存/共有/印刷は同じボタンで可能）
    newWin.location.href = lastPdfUrl;

    // 予備の保存リンクも活性化
    savePdfLink.href = lastPdfUrl;
    savePdfLink.download = pdfFileName();
    savePdfLink.style.opacity = "1";
    savePdfLink.style.pointerEvents = "auto";
    savePdfLink.setAttribute("aria-disabled", "false");

    showToast("PDFを作成しました（共有/印刷できます）");
  } catch (e){
    console.error(e);
    alert("PDF作成に失敗しました。写真の容量が大きい場合は、撮影し直して再度お試しください。");
  } finally {
    setBusy(false);
  }
});

// ---- direct hash open (#s1..#s8) ----
(function initFromHash(){
  const h = (location.hash || "").trim();
  const m = h.match(/^#s([1-8])$/);
  if (m){
    cur = Math.max(0, Math.min(7, parseInt(m[1],10)-1));
  }
  showStep();
})();

// ---- UX: enterキーで次へ（PC/Android） ----
document.addEventListener("keydown", (e)=>{
  if (e.key === "Enter"){
    const tag = (document.activeElement?.tagName || "").toLowerCase();
    if (tag === "input" || tag === "select"){
      e.preventDefault();
      if (cur < 7) nextBtn.click();
    }
  }
});
