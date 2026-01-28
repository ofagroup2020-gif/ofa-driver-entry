/* =========================================================
   OFA Driver Registration App (GitHub Pages / Safari対応)
   - ステップ遷移が止まる問題を修正（確実に動く）
   - PDFは日本語OK（DOM→画像→PDFでフォント依存なし）
   - A4に収めて自動で複数ページ
   - PDF作成ボタン1つで「開く→保存/共有/印刷」
========================================================= */

const $ = (id) => document.getElementById(id);

const steps = Array.from(document.querySelectorAll(".step"));
const nextBtn = $("nextBtn");
const backBtn = $("backBtn");
const stepLabel = $("stepLabel");
const barFill = $("barFill");
const dotsWrap = $("dots");
const toastEl = $("toast");

const makePdfBtn = $("makePdfBtn");
const lineLinkBtn = $("lineLinkBtn");

const segBtns = Array.from(document.querySelectorAll(".segBtn"));
const affTypeHidden = $("affType");

let current = 1;

// --- state (ファイルはメモリ保持) ---
let licFrontFile = null;
let licBackFile = null;
let licFrontDataUrl = "";
let licBackDataUrl = "";

// ========== Utils ==========
function toast(msg){
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(()=>toastEl.classList.remove("show"), 1800);
}

function setStep(n){
  current = Math.max(1, Math.min(8, n));
  steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step) === current));

  stepLabel.textContent = `STEP ${current} / 8`;
  barFill.style.width = `${(current / 8) * 100}%`;

  const dots = Array.from(dotsWrap.querySelectorAll(".d"));
  dots.forEach((d, i) => {
    d.classList.toggle("on", (i+1) === current);
  });

  // nav label
  backBtn.style.display = current === 1 ? "none" : "inline-flex";
  nextBtn.style.display = current === 8 ? "none" : "inline-flex";
}

function val(id){ return ($(id)?.value ?? "").trim(); }

function normalizeBirth(v){
  if(!v) return "";
  // yyyy-mm-dd -> yyyy/mm/dd
  return v.replaceAll("-", "/");
}

function required(stepNo){
  const birth = val("birth");
  const aff = val("affType");
  const vehicleType = $("vehicleType").value;
  const blackPlate = $("blackPlate").value;
  const acctType = $("acctType").value;

  if(stepNo === 1){
    if(!val("name") || !val("kana") || !val("phone") || !val("email") || !birth){
      return "STEP1：未入力があります（氏名/フリガナ/電話/メール/生年月日）";
    }
  }
  if(stepNo === 2){
    if(!val("zip") || !val("pref") || !val("city") || !val("addr1")){
      return "STEP2：未入力があります（郵便番号/都道府県/市区町村/番地）";
    }
  }
  if(stepNo === 3){
    if(!aff){
      return "STEP3：所属区分を選択してください";
    }
  }
  if(stepNo === 4){
    if(!vehicleType || !val("plate") || !blackPlate){
      return "STEP4：未入力があります（車種/車両ナンバー/黒ナンバー）";
    }
  }
  if(stepNo === 5){
    if(!licFrontFile && !licFrontDataUrl){
      return "STEP5：免許証 表面（必須）をアップロードしてください";
    }
  }
  if(stepNo === 6){
    if(!val("bank") || !val("branch") || !acctType || !val("acctNo") || !val("acctName")){
      return "STEP6：未入力があります（銀行/支店/種別/口座番号/口座名義）";
    }
  }
  if(stepNo === 7){
    if(!$("agree").checked){
      return "STEP7：『上記内容に同意します』にチェックしてください";
    }
  }
  return "";
}

function collect(){
  const addr = `${val("zip")} ${val("pref")}${val("city")}${val("addr1")}${val("addr2") ? " " + val("addr2") : ""}`.trim();
  return {
    name: val("name"),
    kana: val("kana"),
    phone: val("phone"),
    email: val("email"),
    birth: normalizeBirth(val("birth")),
    addr,
    affType: val("affType"),
    company: val("company"),
    vehicleType: $("vehicleType").value,
    plate: val("plate"),
    blackPlate: $("blackPlate").value,
    bank: val("bank"),
    branch: val("branch"),
    acctType: $("acctType").value,
    acctNo: val("acctNo"),
    acctName: val("acctName"),
  };
}

function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ========== Seg Buttons ==========
segBtns.forEach(btn=>{
  btn.addEventListener("click", ()=>{
    segBtns.forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    affTypeHidden.value = btn.dataset.value || "";
  });
});

// ========== Upload Preview ==========
$("licFront").addEventListener("change", async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  licFrontFile = f;
  licFrontDataUrl = await fileToDataURL(f);
  const img = $("licFrontPrev");
  img.src = licFrontDataUrl;
  img.style.display = "block";
});

$("licBack").addEventListener("change", async (e)=>{
  const f = e.target.files?.[0];
  if(!f) return;
  licBackFile = f;
  licBackDataUrl = await fileToDataURL(f);
  const img = $("licBackPrev");
  img.src = licBackDataUrl;
  img.style.display = "block";
});

// ========== Navigation ==========
nextBtn.addEventListener("click", ()=>{
  const msg = required(current);
  if(msg){ toast(msg); return; }
  setStep(current + 1);
});

backBtn.addEventListener("click", ()=>{
  setStep(current - 1);
});

// ========== PDF (日本語 / A4 / 途切れない / 印刷もOK) ==========
function buildPdfPaper(data){
  // 日付
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,"0");
  const d = String(now.getDate()).padStart(2,"0");
  const hh = String(now.getHours()).padStart(2,"0");
  const mm = String(now.getMinutes()).padStart(2,"0");
  $("pdfDate").textContent = `作成日時：${y}/${m}/${d} ${hh}:${mm}`;

  // grid items
  const grid = $("pdfGrid");
  grid.innerHTML = "";

  const items = [
    ["氏名（漢字）", data.name],
    ["フリガナ", data.kana],
    ["電話番号", data.phone],
    ["メール", data.email],
    ["生年月日", data.birth],
    ["住所", data.addr],
    ["所属区分", data.affType],
    ["所属会社名（任意）", data.company || "—"],
    ["車種", data.vehicleType],
    ["車両ナンバー", data.plate],
    ["黒ナンバー", data.blackPlate],
    ["銀行", `${data.bank} / ${data.branch}`],
    ["口座種別", data.acctType],
    ["口座番号", data.acctNo],
    ["口座名義（カナ）", data.acctName],
  ];

  for(const [label, value] of items){
    const div = document.createElement("div");
    div.className = "pdfItem";
    div.innerHTML = `<div class="pdfLabel">${label}</div><div class="pdfValue">${escapeHtml(value || "—")}</div>`;
    grid.appendChild(div);
  }

  // images
  const imgF = $("pdfImgFront");
  const imgB = $("pdfImgBack");
  imgF.src = licFrontDataUrl || "";
  imgB.src = licBackDataUrl || "";
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, (c)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

async function makePdfAndOpen(){
  const msg = required(7); // 7まで通ってないとPDFは作らせない
  if(msg){ toast(msg); setStep(7); return; }

  const data = collect();
  buildPdfPaper(data);

  const paper = $("pdfPaper");

  // 画像読み込み待ち（免許画像）
  await waitImagesLoaded([$("pdfImgFront"), $("pdfImgBack")]);

  // 高解像度でキャプチャ（端末差を減らす）
  const scale = 2; // 2で十分綺麗＆重すぎない
  const canvas = await html2canvas(paper, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: paper.scrollWidth,
    windowHeight: paper.scrollHeight
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

  // A4サイズ(mm)
  const pageW = 210;
  const pageH = 297;

  // 余白(mm)
  const margin = 8;
  const contentW = pageW - margin*2;
  const contentH = pageH - margin*2;

  // キャンバス比率からPDF上の描画サイズを算出
  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const ratio = contentW / (canvasW * 0.264583); // px→mm(約0.264583)
  const imgWmm = (canvasW * 0.264583) * ratio;
  const imgHmm = (canvasH * 0.264583) * ratio;

  // 1ページに収まらない場合は分割
  let y = margin;
  let remainingH = imgHmm;
  let offsetPx = 0;

  // 画像をページごとに切り出す
  while(remainingH > 0){
    const pageCanvas = document.createElement("canvas");
    const pageCanvasW = canvasW;
    const pageCanvasH = Math.floor((contentH / imgHmm) * canvasH);

    pageCanvas.width = pageCanvasW;
    pageCanvas.height = pageCanvasH;

    const ctx = pageCanvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0,0,pageCanvasW,pageCanvasH);

    ctx.drawImage(
      canvas,
      0, offsetPx, pageCanvasW, pageCanvasH,
      0, 0, pageCanvasW, pageCanvasH
    );

    const pageImg = pageCanvas.toDataURL("image/jpeg", 0.92);

    pdf.addImage(pageImg, "JPEG", margin, margin, contentW, contentH);

    remainingH -= contentH;
    offsetPx += pageCanvasH;

    if(remainingH > 0) pdf.addPage();
  }

  // ファイル名
  const today = new Date().toISOString().slice(0,10);
  const safeName = (data.name || "OFA").replace(/[\\/:*?"<>|]/g, "_");
  const fileName = `OFA_登録_${safeName}_${today}.pdf`;

  // Blob化 → 新規タブで開く（ここが保存/共有/印刷の統一ボタン）
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);

  const opened = window.open(url, "_blank");

  if(!opened){
    // ポップアップブロック等の保険：ダウンロード
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  setTimeout(()=>URL.revokeObjectURL(url), 60*1000);

  toast("PDFを開きました（共有→保存/LINE送信/印刷）");
  setStep(8);
}

function waitImagesLoaded(imgs){
  return Promise.all(imgs.map(img=>{
    return new Promise((resolve)=>{
      if(!img || !img.src){ resolve(); return; }
      if(img.complete) { resolve(); return; }
      img.onload = ()=>resolve();
      img.onerror = ()=>resolve();
    });
  }));
}

makePdfBtn.addEventListener("click", ()=>{
  makePdfAndOpen().catch(err=>{
    console.error(err);
    toast("PDF作成に失敗しました（端末/ブラウザをSafari/Chromeで再試行）");
  });
});

// 初期化
setStep(1);
