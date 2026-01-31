/* =========================
   OFA Driver Entry - Full
   ========================= */

const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt";

let currentStep = 1;
const totalSteps = 8;

const $ = (id) => document.getElementById(id);

const steps = Array.from(document.querySelectorAll(".step"));
const stepText = $("stepText");
const barFill = $("barFill");
const dotsEl = $("dots");
const toast = $("toast");

const state = {
  affiliation: "協力会社",
  licFrontDataUrl: "",
  licBackDataUrl: "",
  lineOpened: false
};

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 1600);
}

function buildDots(){
  dotsEl.innerHTML = "";
  for(let i=1;i<=totalSteps;i++){
    const d = document.createElement("div");
    d.className = "d" + (i===currentStep ? " on" : "");
    dotsEl.appendChild(d);
  }
}

function setStep(n){
  currentStep = Math.max(1, Math.min(totalSteps, n));
  steps.forEach(s => s.classList.remove("active"));
  const active = steps.find(s => Number(s.dataset.step) === currentStep);
  if(active) active.classList.add("active");

  stepText.textContent = `STEP ${currentStep} / ${totalSteps}`;
  barFill.style.width = `${(currentStep/totalSteps)*100}%`;
  buildDots();

  // STEP8: LINEボタン設定
  if(currentStep === 8){
    const openLineBtn = $("openLineBtn");
    const makePdfBtn = $("makePdfBtn");
    openLineBtn.href = OFA_MEMBERSHIP_LINE_URL;

    // LINEを開いた後にPDFを有効化（導線）
    makePdfBtn.disabled = !state.lineOpened;
  }
}

function preventEnterSubmit(){
  // iOS SafariでEnterがform submit扱いになって遷移が死ぬケース対策
  document.addEventListener("keydown", (e)=>{
    if(e.key === "Enter"){
      const t = e.target;
      if(t && (t.tagName === "INPUT" || t.tagName === "SELECT")){
        e.preventDefault();
      }
    }
  }, {passive:false});
}

function normalizePhone(v){
  return (v||"").replace(/[^\d+]/g,"");
}

function isEmail(v){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v||"");
}

function requiredFilled(ids){
  for(const id of ids){
    const el = $(id);
    if(!el) continue;
    const val = (el.value||"").trim();
    if(!val) return false;
    if(id === "email" && !isEmail(val)) return false;
  }
  return true;
}

function bindNav(){
  // STEP 1
  $("prev1").addEventListener("click", ()=>setStep(1));
  $("next1").addEventListener("click", (e)=>{
    e.preventDefault();
    const ok = requiredFilled(["nameKanji","nameKana","phone","email","birthday"]);
    if(!ok){ showToast("未入力または形式エラーがあります"); return; }
    setStep(2);
  });

  // STEP 2
  $("prev2").addEventListener("click", ()=>setStep(1));
  $("next2").addEventListener("click", (e)=>{
    e.preventDefault();
    const ok = requiredFilled(["zip","address"]);
    if(!ok){ showToast("住所を入力してください"); return; }
    setStep(3);
  });

  // STEP 3
  $("prev3").addEventListener("click", ()=>setStep(2));
  $("next3").addEventListener("click", (e)=>{
    e.preventDefault();
    setStep(4);
  });

  // STEP 4
  $("prev4").addEventListener("click", ()=>setStep(3));
  $("next4").addEventListener("click", (e)=>{
    e.preventDefault();
    const ok = requiredFilled(["carType","blackPlate"]);
    if(!ok){ showToast("車種/黒ナンバーを選択してください"); return; }
    setStep(5);
  });

  // STEP 5
  $("prev5").addEventListener("click", ()=>setStep(4));
  $("next5").addEventListener("click", (e)=>{
    e.preventDefault();
    const ok = requiredFilled(["bankName","accountType","accountNumber","accountNameKana"]);
    if(!ok){ showToast("口座情報を入力してください"); return; }
    setStep(6);
  });

  // STEP 6
  $("prev6").addEventListener("click", ()=>setStep(5));
  $("next6").addEventListener("click", (e)=>{
    e.preventDefault();
    if(!state.licFrontDataUrl){
      showToast("免許証（表面）は必須です");
      return;
    }
    setStep(7);
  });

  // STEP 7
  $("prev7").addEventListener("click", ()=>setStep(6));
  $("next7").addEventListener("click", (e)=>{
    e.preventDefault();
    if(!$("agree").checked){
      showToast("同意にチェックしてください");
      return;
    }
    setStep(8);
  });

  // STEP 8
  $("prev8").addEventListener("click", ()=>setStep(7));
  $("restart").addEventListener("click", ()=>{
    // reset
    state.affiliation = "協力会社";
    state.licFrontDataUrl = "";
    state.licBackDataUrl = "";
    state.lineOpened = false;
    location.reload();
  });

  // LINE open -> enable PDF
  $("openLineBtn").addEventListener("click", ()=>{
    state.lineOpened = true;
    // 遷移直後に押せるよう少し待って有効化
    setTimeout(()=>{
      const makePdfBtn = $("makePdfBtn");
      if(makePdfBtn) makePdfBtn.disabled = false;
    }, 600);
  });

  // PDF
  $("makePdfBtn").addEventListener("click", async (e)=>{
    e.preventDefault();
    try{
      await makePdf();
    }catch(err){
      console.error(err);
      alert("PDF作成に失敗しました。もう一度お試しください。");
    }
  });
}

function bindAffSeg(){
  const seg = $("affSeg");
  const btns = Array.from(seg.querySelectorAll(".segBtn"));
  btns.forEach(btn=>{
    btn.addEventListener("click", ()=>{
      btns.forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      state.affiliation = btn.dataset.value;
    });
  });
}

function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function bindUploads(){
  const licFront = $("licFront");
  const licBack = $("licBack");

  licFront.addEventListener("change", async ()=>{
    const f = licFront.files && licFront.files[0];
    if(!f) return;
    state.licFrontDataUrl = await fileToDataUrl(f);
    const img = $("prevFront");
    img.src = state.licFrontDataUrl;
    img.style.display = "block";
    showToast("表面を読み込みました");
  });

  licBack.addEventListener("change", async ()=>{
    const f = licBack.files && licBack.files[0];
    if(!f) return;
    state.licBackDataUrl = await fileToDataUrl(f);
    const img = $("prevBack");
    img.src = state.licBackDataUrl;
    img.style.display = "block";
    showToast("裏面を読み込みました");
  });
}

/* ===== PDF作成 ===== */

function jpDateTime(){
  const d = new Date();
  const pad = (n)=>String(n).padStart(2,"0");
  const y = d.getFullYear();
  const m = pad(d.getMonth()+1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}/${m}/${day} ${hh}:${mm}`;
}

function setPdfDates(){
  const t = jpDateTime();
  $("pdfDate1").textContent = `作成日時：${t}`;
  $("pdfDate2").textContent = `作成日時：${t}`;
}

function buildPdfGrid(){
  const grid = $("pdfGrid");
  grid.innerHTML = "";

  const items = [
    ["氏名（漢字）", $("nameKanji").value],
    ["フリガナ", $("nameKana").value],
    ["電話番号", normalizePhone($("phone").value)],
    ["メール", $("email").value],
    ["生年月日", $("birthday").value],
    ["住所", `${$("zip").value} ${$("address").value}`],
    ["所属区分", state.affiliation],
    ["所属会社名（任意）", $("affCompany").value || ""],
    ["車種", $("carType").value],
    ["車両ナンバー（任意）", $("carNo").value || ""],
    ["黒ナンバー", $("blackPlate").value],
    ["銀行", $("bankName").value],
    ["口座種別", $("accountType").value],
    ["口座番号", $("accountNumber").value],
    ["口座名義（カナ）", $("accountNameKana").value],
  ];

  for(const [label, value] of items){
    const box = document.createElement("div");
    box.className = "pdfItem";
    const l = document.createElement("div");
    l.className = "pdfLabel";
    l.textContent = label;
    const v = document.createElement("div");
    v.className = "pdfValue";
    v.textContent = value || "";
    box.appendChild(l);
    box.appendChild(v);
    grid.appendChild(box);
  }
}

/* 上下余白だけトリミングする（免許証が縦長写真で小さくならないように） */
async function cropVerticalWhitespace(dataUrl){
  if(!dataUrl) return "";

  const img = new Image();
  img.src = dataUrl;
  await new Promise((res, rej)=>{ img.onload=res; img.onerror=rej; });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d",{willReadFrequently:true});
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.drawImage(img,0,0);

  const {width:w, height:h} = canvas;
  const imgData = ctx.getImageData(0,0,w,h).data;

  // 背景判定：上下の数行の平均色を基準に「近い色＝余白」とみなす
  const sampleRows = 10;
  function avgRow(y){
    let r=0,g=0,b=0,c=0;
    for(let x=0;x<w;x+=4){
      const i = (y*w + x)*4;
      r += imgData[i]; g += imgData[i+1]; b += imgData[i+2]; c++;
    }
    return [r/c,g/c,b/c];
  }
  const topAvg = avgRow(2);
  const botAvg = avgRow(h-3);
  const bg = [(topAvg[0]+botAvg[0])/2,(topAvg[1]+botAvg[1])/2,(topAvg[2]+botAvg[2])/2];

  function rowIsBg(y){
    let diff=0, c=0;
    for(let x=0;x<w;x+=6){
      const i = (y*w + x)*4;
      const dr = imgData[i]-bg[0];
      const dg = imgData[i+1]-bg[1];
      const db = imgData[i+2]-bg[2];
      diff += Math.abs(dr)+Math.abs(dg)+Math.abs(db);
      c++;
    }
    const score = diff/c;
    return score < 18; // 閾値：小さいほど背景に近い
  }

  let top = 0;
  for(let y=0;y<Math.min(h, 600);y++){
    if(!rowIsBg(y)){ top = Math.max(0, y-8); break; }
  }

  let bottom = h-1;
  for(let y=h-1;y>Math.max(0, h-600);y--){
    if(!rowIsBg(y)){ bottom = Math.min(h-1, y+8); break; }
  }

  // トリム幅が小さすぎる場合はそのまま
  if(bottom - top < h*0.35) return dataUrl;

  const outH = bottom - top + 1;
  const out = document.createElement("canvas");
  out.width = w;
  out.height = outH;
  const octx = out.getContext("2d");
  octx.drawImage(canvas, 0, top, w, outH, 0, 0, w, outH);

  return out.toDataURL("image/jpeg", 0.95);
}

async function makePdf(){
  // 必須チェック
  if(!state.lineOpened){
    showToast("先にOFAメンバーシップLINEを開いてください");
    return;
  }
  if(!state.licFrontDataUrl){
    showToast("免許証（表面）は必須です");
    return;
  }

  setPdfDates();
  buildPdfGrid();

  // 免許証画像：上下だけトリミングして読みやすく
  const front = await cropVerticalWhitespace(state.licFrontDataUrl);
  const back  = state.licBackDataUrl ? await cropVerticalWhitespace(state.licBackDataUrl) : "";

  $("pdfLicFront").src = front;
  $("pdfLicBack").src  = back || front; // 任意未提出なら表を表示して空白回避

  // 2ページ固定でレンダリング
  const page1 = $("pdfPage1");
  const page2 = $("pdfPage2");

  const scale = 2; // 画質UP
  const canvas1 = await html2canvas(page1, {scale, backgroundColor:"#ffffff", useCORS:true});
  const canvas2 = await html2canvas(page2, {scale, backgroundColor:"#ffffff", useCORS:true});

  const img1 = canvas1.toDataURL("image/jpeg", 0.95);
  const img2 = canvas2.toDataURL("image/jpeg", 0.95);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({orientation:"portrait", unit:"mm", format:"a4"});

  const pageW = 210;
  const pageH = 297;

  pdf.addImage(img1, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");
  pdf.addPage();
  pdf.addImage(img2, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");

  const stamp = new Date();
  const pad = (n)=>String(n).padStart(2,"0");
  const name = `OFA_driver_entry_${stamp.getFullYear()}${pad(stamp.getMonth()+1)}${pad(stamp.getDate())}_${pad(stamp.getHours())}${pad(stamp.getMinutes())}.pdf`;

  pdf.save(name);
  showToast("PDFを作成しました");
}

/* ===== init ===== */

function init(){
  preventEnterSubmit();
  buildDots();
  setStep(1);
  bindNav();
  bindAffSeg();
  bindUploads();

  // Safariで「次へ」が死ぬ原因になりやすい：クリック対象にtouchの競合が出るので
  // “確実にクリックを拾う”ため、passive falseで抑える
  document.addEventListener("touchend", ()=>{}, {passive:false});
}

document.addEventListener("DOMContentLoaded", init);
