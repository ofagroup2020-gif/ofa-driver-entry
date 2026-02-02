/* =========================
   OFA Driver Entry - FULL
   - iOS/Androidでボタン反応しない問題を潰す
   - 日本語PDF (NotoSansJP) を埋め込み
   - 免許証画像は縮小せず上下トリミングで見やすく
========================= */

const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt";

const state = {
  step: 1,
  data: {
    // 1
    nameKanji: "",
    nameKana: "",
    phone: "",
    email: "",
    birth: "",
    // 2
    address: "",
    // 3
    affiliationType: "", // 協力会社 / FC / 個人
    affiliationCompany: "",
    // 4
    carType: "",
    blackPlate: "", // あり/なし/申請中/リース希望
    carNumber: "",
    // 5
    bankName: "",
    accountType: "",
    accountNumber: "",
    accountNameKana: "",
    // 6
    licenseFrontFile: null,
    licenseBackFile: null,
    licenseFrontDataUrl: "",
    licenseBackDataUrl: "",
    // 7
    agreed: false
  },
  pdfBlob: null,
  pdfFileName: ""
};

const $ = (id) => document.getElementById(id);

/* ============ Tap Fix (重要) ============ */
function bindTap(el, handler){
  if(!el) return;
  const safeHandler = (e) => {
    // Androidでclickが死ぬ / iOSで二重発火対策
    try { e.preventDefault?.(); } catch(_){}
    try { e.stopPropagation?.(); } catch(_){}
    handler(e);
  };

  // ✅3系統で確実に拾う
  el.addEventListener("click", safeHandler, { passive:false });
  el.addEventListener("pointerup", safeHandler, { passive:false });
  el.addEventListener("touchend", safeHandler, { passive:false });
}

/* ============ Toast ============ */
let toastTimer = null;
function toast(msg){
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove("show"), 2200);
}

/* ============ UI ============ */
function buildDots(){
  const wrap = $("progressDots");
  wrap.innerHTML = "";
  for(let i=1;i<=8;i++){
    const s = document.createElement("span");
    if(i === state.step) s.classList.add("active");
    wrap.appendChild(s);
  }
}
function updateHeader(){
  $("stepLabel").textContent = `STEP ${state.step} / 8`;
  const pct = (state.step/8)*100;
  $("progressFill").style.width = `${pct}%`;
  buildDots();
}

/* ============ Steps rendering ============ */
function render(){
  updateHeader();

  const stepsEl = $("steps");
  stepsEl.innerHTML = "";

  // Tag/Title
  const meta = getStepMeta(state.step);
  $("tagText").textContent = meta.tag;
  $("cardTitle").textContent = meta.title;
  $("cardDesc").textContent = meta.desc;

  // Back/Next visibility
  $("btnBack").style.visibility = (state.step === 1) ? "hidden" : "visible";
  $("btnNext").textContent = (state.step === 8) ? "最初から" : "次へ";

  // Render content
  const content = document.createElement("div");
  content.className = "formGrid";
  content.appendChild(buildStep(state.step));
  stepsEl.appendChild(content);

  // Bind navigation
  $("btnNext").disabled = false;
  $("btnBack").disabled = false;

  bindTap($("btnBack"), ()=> {
    if(state.step > 1){
      state.step--;
      render();
    }
  });

  bindTap($("btnNext"), ()=> {
    if(state.step === 8){
      // reset
      state.step = 1;
      render();
      return;
    }
    if(!validateStep(state.step)){
      return;
    }
    state.step++;
    render();
  });
}

function getStepMeta(step){
  switch(step){
    case 1: return { tag:"PROFILE", title:"ドライバー基本情報", desc:"本登録はドライバーご本人が行ってください。" };
    case 2: return { tag:"ADDRESS", title:"住所", desc:"契約・書類送付のため住所を入力してください。" };
    case 3: return { tag:"AFFILIATION", title:"所属情報", desc:"あなたの所属に近いものを選択してください。" };
    case 4: return { tag:"VEHICLE", title:"車両情報", desc:"稼働に必要な車両情報を入力してください。" };
    case 5: return { tag:"BANK", title:"口座情報", desc:"報酬振込先口座を入力してください。" };
    case 6: return { tag:"DOCUMENTS", title:"提出画像", desc:"免許証画像をアップロードしてください（表面必須）。" };
    case 7: return { tag:"TERMS", title:"確認事項", desc:"内容を確認し、同意して次へ進んでください。" };
    case 8: return { tag:"DONE", title:"登録完了", desc:"LINE追加 → PDF作成 → LINE送信 の順番でお願いします。" };
    default: return { tag:"", title:"", desc:"" };
  }
}

function buildStep(step){
  switch(step){
    case 1: return step1();
    case 2: return step2();
    case 3: return step3();
    case 4: return step4();
    case 5: return step5();
    case 6: return step6();
    case 7: return step7();
    case 8: return step8();
    default: return document.createTextNode("");
  }
}

/* ============ Step 1 ============ */
function step1(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";

  wrap.appendChild(fieldText("氏名（漢字）", "例）山田 太郎", state.data.nameKanji, (v)=> state.data.nameKanji=v, true));
  wrap.appendChild(fieldText("フリガナ", "例）ヤマダ タロウ", state.data.nameKana, (v)=> state.data.nameKana=v, true));
  wrap.appendChild(fieldText("電話番号", "090xxxxxxxx ※ハイフンなしでもOK", state.data.phone, (v)=> state.data.phone=v, true, "tel"));
  wrap.appendChild(fieldText("メールアドレス（任意）", "example@gmail.com", state.data.email, (v)=> state.data.email=v, false, "email"));
  wrap.appendChild(fieldText("生年月日", "1991/07/31", state.data.birth, (v)=> state.data.birth=v, true, "text"));

  return wrap;
}

/* ============ Step 2 ============ */
function step2(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";
  wrap.appendChild(fieldTextarea("住所", "例）鹿児島県鹿児島市…", state.data.address, (v)=> state.data.address=v, true));
  return wrap;
}

/* ============ Step 3 ============ */
function step3(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";

  const chips = document.createElement("div");
  chips.className = "chips";

  const options = ["協力会社","FC","個人"];
  options.forEach(opt=>{
    const b = document.createElement("div");
    b.className = "chip" + (state.data.affiliationType===opt ? " active":"");
    b.textContent = opt;
    bindTap(b, ()=>{
      state.data.affiliationType = opt;
      render();
    });
    chips.appendChild(b);
  });

  const box = document.createElement("div");
  box.className = "field";
  const label = document.createElement("label");
  label.textContent = "所属区分";
  box.appendChild(label);
  box.appendChild(chips);
  wrap.appendChild(box);

  wrap.appendChild(fieldText("所属会社名（任意）", "株式会社〇〇 / 〇〇運送など", state.data.affiliationCompany, (v)=> state.data.affiliationCompany=v, false));

  return wrap;
}

/* ============ Step 4 ============ */
function step4(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";

  // 車種
  wrap.appendChild(fieldSelect("車種", ["選択してください","軽バン","軽トラ","幌車","クール車","その他"], state.data.carType, (v)=> state.data.carType=v, true));

  // 車両ナンバー（任意：リース希望や申請中の場合は空でもOK）
  wrap.appendChild(fieldText("車両ナンバー（任意）", "例）鹿児島 480 あ 12-34", state.data.carNumber, (v)=> state.data.carNumber=v, false));

  // 黒ナンバー
  wrap.appendChild(fieldSelect("黒ナンバー", ["選択してください","あり","なし","申請中","リース希望"], state.data.blackPlate, (v)=> state.data.blackPlate=v, true));

  return wrap;
}

/* ============ Step 5 ============ */
function step5(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";

  wrap.appendChild(fieldText("銀行名", "例）三井住友銀行", state.data.bankName, (v)=> state.data.bankName=v, true));
  wrap.appendChild(fieldSelect("口座種別", ["選択してください","普通","当座"], state.data.accountType, (v)=> state.data.accountType=v, true));
  wrap.appendChild(fieldText("口座番号", "7桁など", state.data.accountNumber, (v)=> state.data.accountNumber=v, true, "tel"));
  wrap.appendChild(fieldText("口座名義（カナ）", "例）ヤマダタロウ", state.data.accountNameKana, (v)=> state.data.accountNameKana=v, true));

  return wrap;
}

/* ============ Step 6 ============ */
function step6(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";

  wrap.appendChild(fileUploader("免許証 表面（必須）", true, (file, url)=>{
    state.data.licenseFrontFile = file;
    state.data.licenseFrontDataUrl = url;
  }, state.data.licenseFrontDataUrl));

  wrap.appendChild(fileUploader("免許証 裏面（任意）", false, (file, url)=>{
    state.data.licenseBackFile = file;
    state.data.licenseBackDataUrl = url;
  }, state.data.licenseBackDataUrl));

  return wrap;
}

/* ============ Step 7 ============ */
function step7(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";

  const terms = document.createElement("div");
  terms.className = "termsBox";
  const ul = document.createElement("ul");
  [
    "本登録はドライバー本人が行うものとします。",
    "入力内容および提出書類は正確な情報であることを保証してください。",
    "虚申告・不正が判明した場合、登録・契約をお断りする場合があります。",
    "取得した個人情報は、業務連絡・案件調整・法令対応の目的で利用します。",
    "登録後、OFA GROUP担当者より連絡を行い案件を決定します。"
  ].forEach(t=>{
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });
  terms.appendChild(ul);
  wrap.appendChild(terms);

  const check = document.createElement("div");
  check.className = "checkRow";

  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.checked = !!state.data.agreed;
  cb.addEventListener("change", ()=> state.data.agreed = cb.checked);

  const text = document.createElement("div");
  text.innerHTML = "<b>上記に同意します</b>";

  check.appendChild(cb);
  check.appendChild(text);

  wrap.appendChild(check);

  return wrap;
}

/* ============ Step 8 ============ */
function step8(){
  const wrap = document.createElement("div");
  wrap.className = "formGrid";

  const p = document.createElement("div");
  p.className = "termsBox";
  p.innerHTML = `
    <ul>
      <li><b>まず</b> OFAメンバーシップLINE を追加（開く）</li>
      <li><b>次に</b> 登録PDFを作成</li>
      <li><b>PDFを</b> LINEへ送信してください</li>
    </ul>
  `;
  wrap.appendChild(p);

  // 横3ボタン
  const row = document.createElement("div");
  row.className = "nav";
  row.style.marginTop = "12px";

  const btnLine = document.createElement("button");
  btnLine.type = "button";
  btnLine.className = "btn btnGreen";
  btnLine.textContent = "メンバーシップLINEを開く";

  const btnPdf = document.createElement("button");
  btnPdf.type = "button";
  btnPdf.className = "btn btnPrimary";
  btnPdf.textContent = "登録PDFを作成";

  row.appendChild(btnLine);
  row.appendChild(btnPdf);

  wrap.appendChild(row);

  const btnShare = document.createElement("button");
  btnShare.type = "button";
  btnShare.className = "btn btnWhite";
  btnShare.textContent = "PDFを共有";
  wrap.appendChild(btnShare);

  const note = document.createElement("div");
  note.className = "help";
  note.textContent = "※LINE未追加だと共有先に表示されない場合があります。先にLINE追加 → その後PDF作成 の順番でお願いします。";
  wrap.appendChild(note);

  bindTap(btnLine, ()=>{
    // LINE内ブラウザでも開けるように
    window.location.href = OFA_MEMBERSHIP_LINE_URL;
  });

  bindTap(btnPdf, async ()=>{
    try{
      toast("PDF作成中…");
      await generatePdf();
      toast("PDFを作成しました");
    }catch(e){
      console.error(e);
      toast(e?.message || "PDF作成に失敗しました");
    }
  });

  bindTap(btnShare, async ()=>{
    try{
      if(!state.pdfBlob){
        toast("先に「登録PDFを作成」を押してください");
        return;
      }
      await sharePdf();
    }catch(e){
      console.error(e);
      toast(e?.message || "共有に失敗しました");
    }
  });

  return wrap;
}

/* ============ Fields ============ */
function fieldText(label, placeholder, value, onInput, required=false, type="text"){
  const wrap = document.createElement("div");
  wrap.className = "field";

  const l = document.createElement("label");
  l.textContent = required ? `${label}（必須）` : label;

  const input = document.createElement("input");
  input.className = "input";
  input.type = type;
  input.placeholder = placeholder;
  input.value = value || "";
  input.autocomplete = "off";
  input.inputMode = (type==="tel") ? "tel" : undefined;

  input.addEventListener("input", ()=> onInput(input.value));

  wrap.appendChild(l);
  wrap.appendChild(input);
  return wrap;
}

function fieldTextarea(label, placeholder, value, onInput, required=false){
  const wrap = document.createElement("div");
  wrap.className = "field";

  const l = document.createElement("label");
  l.textContent = required ? `${label}（必須）` : label;

  const ta = document.createElement("textarea");
  ta.className = "textarea";
  ta.placeholder = placeholder;
  ta.value = value || "";
  ta.addEventListener("input", ()=> onInput(ta.value));

  wrap.appendChild(l);
  wrap.appendChild(ta);
  return wrap;
}

function fieldSelect(label, options, value, onChange, required=false){
  const wrap = document.createElement("div");
  wrap.className = "field";

  const l = document.createElement("label");
  l.textContent = required ? `${label}（必須）` : label;

  const sel = document.createElement("select");
  sel.className = "select";

  options.forEach(opt=>{
    const o = document.createElement("option");
    o.value = (opt === "選択してください") ? "" : opt;
    o.textContent = opt;
    sel.appendChild(o);
  });
  sel.value = value || "";
  sel.addEventListener("change", ()=> onChange(sel.value));

  wrap.appendChild(l);
  wrap.appendChild(sel);
  return wrap;
}

function fileUploader(title, required, onPicked, previewUrl){
  const box = document.createElement("div");
  box.className = "fileBox";

  const row = document.createElement("div");
  row.className = "fileRow";

  const left = document.createElement("div");
  left.className = "label";
  left.textContent = required ? `${title}` : `${title}`;

  const right = document.createElement("div");

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.capture = "environment";

  input.addEventListener("change", async ()=>{
    const file = input.files?.[0];
    if(!file) return;
    const url = await readFileAsDataUrl(file);
    onPicked(file, url);
    render();
  });

  right.appendChild(input);
  row.appendChild(left);
  row.appendChild(right);

  box.appendChild(row);

  if(previewUrl){
    const prev = document.createElement("div");
    prev.className = "preview";
    const img = document.createElement("img");
    img.src = previewUrl;
    prev.appendChild(img);
    box.appendChild(prev);

    const help = document.createElement("div");
    help.className = "help";
    help.textContent = "※PDFでは免許証が見えるように上下を自動トリミングして出力します（縮小しません）";
    box.appendChild(help);
  }

  return box;
}

function readFileAsDataUrl(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ============ Validation ============ */
function validateStep(step){
  const d = state.data;

  const req = (cond, msg) => {
    if(!cond){
      toast(msg);
      return false;
    }
    return true;
  };

  if(step===1){
    if(!req(d.nameKanji.trim().length>0, "氏名（漢字）を入力してください")) return false;
    if(!req(d.nameKana.trim().length>0, "フリガナを入力してください")) return false;
    if(!req(normalizePhone(d.phone).length>=10, "電話番号を正しく入力してください")) return false;
    if(!req(d.birth.trim().length>0, "生年月日を入力してください（例：1991/07/31）")) return false;
  }
  if(step===2){
    if(!req(d.address.trim().length>0, "住所を入力してください")) return false;
  }
  if(step===3){
    if(!req(d.affiliationType.trim().length>0, "所属区分を選択してください")) return false;
  }
  if(step===4){
    if(!req(d.carType.trim().length>0, "車種を選択してください")) return false;
    if(!req(d.blackPlate.trim().length>0, "黒ナンバーを選択してください")) return false;
  }
  if(step===5){
    if(!req(d.bankName.trim().length>0, "銀行名を入力してください")) return false;
    if(!req(d.accountType.trim().length>0, "口座種別を選択してください")) return false;
    if(!req(d.accountNumber.trim().length>=5, "口座番号を入力してください")) return false;
    if(!req(d.accountNameKana.trim().length>0, "口座名義（カナ）を入力してください")) return false;
  }
  if(step===6){
    if(!req(!!d.licenseFrontDataUrl, "免許証 表面（必須）をアップロードしてください")) return false;
  }
  if(step===7){
    if(!req(!!d.agreed, "同意にチェックしてください")) return false;
  }
  return true;
}

function normalizePhone(s){
  return (s||"").replace(/[^\d]/g,"");
}

/* ============ PDF ============ */
async function generatePdf(){
  // 文字化け防止：フォント必須
  const fontUrl = "./assets/NotoSansJP-Regular.ttf";

  const { jsPDF } = window.jspdf;
  if(!jsPDF) throw new Error("jsPDF が読み込めませんでした（ネット環境を確認してください）");

  const doc = new jsPDF({ unit:"pt", format:"a4" });

  // フォントを読み込んで埋め込み
  const fontBytes = await fetchBinary(fontUrl).catch(()=> null);
  if(!fontBytes){
    throw new Error("日本語フォントが見つかりません（assets/NotoSansJP-Regular.ttf を配置してください）");
  }
  doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBytes);
  doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
  doc.setFont("NotoSansJP", "normal");

  const d = state.data;

  // Header
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  doc.setFontSize(14);
  doc.text("OFA GROUP ドライバー登録シート", margin, 44);

  doc.setFontSize(9);
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth()+1).padStart(2,"0");
  const da = String(now.getDate()).padStart(2,"0");
  const hh = String(now.getHours()).padStart(2,"0");
  const mm = String(now.getMinutes()).padStart(2,"0");
  const stamp = `${y}/${m}/${da} ${hh}:${mm}`;

  doc.text(`作成日時：${stamp}`, pageW - margin - 160, 44);
  doc.setTextColor(255,106,0);
  doc.text("One for All, All for One", pageW - margin - 175, 58);
  doc.setTextColor(17,24,39);

  // Orange line
  doc.setDrawColor(255,106,0);
  doc.setLineWidth(2);
  doc.line(margin, 64, pageW - margin, 64);

  // Boxes helper
  const boxW = (pageW - margin*2 - 12)/2;
  const boxH = 44;

  let cursorY = 80;

  const addBox = (x, y, label, val)=>{
    doc.setDrawColor(230,230,230);
    doc.setFillColor(255,255,255);
    doc.roundedRect(x, y, boxW, boxH, 10, 10, "FD");

    // left orange bar
    doc.setFillColor(255,106,0);
    doc.roundedRect(x+8, y+8, 4, boxH-16, 3, 3, "F");

    doc.setFontSize(8);
    doc.setTextColor(107,114,128);
    doc.text(label, x+18, y+18);

    doc.setFontSize(11);
    doc.setTextColor(17,24,39);
    const safe = (val && String(val).trim().length>0) ? String(val) : "";
    doc.text(safe, x+18, y+36, { maxWidth: boxW-30 });
  };

  // row 1
  addBox(margin, cursorY, "氏名（漢字）", d.nameKanji);
  addBox(margin + boxW + 12, cursorY, "フリガナ", d.nameKana);
  cursorY += boxH + 10;

  // row 2
  addBox(margin, cursorY, "電話番号", "+" + normalizePhone(d.phone));
  addBox(margin + boxW + 12, cursorY, "メール", d.email || "");
  cursorY += boxH + 10;

  // row 3
  addBox(margin, cursorY, "生年月日", d.birth);
  addBox(margin + boxW + 12, cursorY, "住所", d.address);
  cursorY += boxH + 10;

  // row 4
  addBox(margin, cursorY, "所属区分", d.affiliationType);
  addBox(margin + boxW + 12, cursorY, "所属会社名（任意）", d.affiliationCompany || "");
  cursorY += boxH + 10;

  // row 5
  addBox(margin, cursorY, "車種", d.carType);
  addBox(margin + boxW + 12, cursorY, "黒ナンバー", d.blackPlate);
  cursorY += boxH + 10;

  // row 6
  addBox(margin, cursorY, "車両ナンバー（任意）", d.carNumber || "");
  addBox(margin + boxW + 12, cursorY, "銀行", d.bankName);
  cursorY += boxH + 10;

  // row 7
  addBox(margin, cursorY, "口座種別", d.accountType);
  addBox(margin + boxW + 12, cursorY, "口座番号", d.accountNumber);
  cursorY += boxH + 10;

  // row 8
  addBox(margin, cursorY, "口座名義（カナ）", d.accountNameKana);
  cursorY += boxH + 16;

  // Section title
  doc.setFontSize(11);
  doc.setTextColor(17,24,39);
  doc.text("提出画像", margin, cursorY);
  cursorY += 10;

  // License images
  const imgBoxW = (pageW - margin*2 - 12)/2;
  const imgBoxH = 190;

  doc.setDrawColor(230,230,230);
  doc.setFillColor(255,255,255);
  doc.roundedRect(margin, cursorY, imgBoxW, imgBoxH, 12, 12, "FD");
  doc.roundedRect(margin + imgBoxW + 12, cursorY, imgBoxW, imgBoxH, 12, 12, "FD");

  doc.setFontSize(9);
  doc.setTextColor(107,114,128);
  doc.text("免許証 表面（必須）", margin+14, cursorY+18);
  doc.text("免許証 裏面（任意）", margin+imgBoxW+12+14, cursorY+18);

  // ✅縮小しない：上下トリミングで横長枠にフィット
  const innerPad = 12;
  const targetX1 = margin + innerPad;
  const targetY = cursorY + 28;
  const targetW = imgBoxW - innerPad*2;
  const targetH = imgBoxH - 40;

  if(d.licenseFrontDataUrl){
    const cropped1 = await cropToAspect(d.licenseFrontDataUrl, targetW/targetH);
    doc.addImage(cropped1, "JPEG", targetX1, targetY, targetW, targetH);
  }
  if(d.licenseBackDataUrl){
    const cropped2 = await cropToAspect(d.licenseBackDataUrl, targetW/targetH);
    doc.addImage(cropped2, "JPEG", margin + imgBoxW + 12 + innerPad, targetY, targetW, targetH);
  }

  cursorY += imgBoxH + 16;

  // Footer note
  doc.setFontSize(9);
  doc.setTextColor(55,65,81);
  doc.text("このPDFを『OFAメンバーシップLINE』へ添付して送信してください。", margin, pageH - 46);

  // Save blob
  const fileName = `OFA_driver_entry_${y}${m}${da}_${hh}${mm}.pdf`;
  const blob = doc.output("blob");
  state.pdfBlob = blob;
  state.pdfFileName = fileName;

  // 端末によっては保存が必要
  // iOSは新規タブ表示が安全
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}

/* fetch binary and return base64 string for addFileToVFS */
async function fetchBinary(url){
  const res = await fetch(url, { cache:"no-store" });
  if(!res.ok) return null;
  const buf = await res.arrayBuffer();
  // base64
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunkSize = 0x8000;
  for(let i=0;i<bytes.length;i+=chunkSize){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i+chunkSize));
  }
  return btoa(binary);
}

/* Crop image (center) to target aspect ratio and return JPEG dataURL */
async function cropToAspect(dataUrl, aspect){
  const img = await loadImage(dataUrl);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // desired crop size (center)
  let cw = iw;
  let ch = Math.round(iw / aspect);
  if(ch > ih){
    ch = ih;
    cw = Math.round(ih * aspect);
  }
  const sx = Math.max(0, Math.round((iw - cw)/2));
  const sy = Math.max(0, Math.round((ih - ch)/2));

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);

  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(src){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=> resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/* Share PDF */
async function sharePdf(){
  const blob = state.pdfBlob;
  const file = new File([blob], state.pdfFileName, { type:"application/pdf" });

  // Web Share API
  if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
    await navigator.share({
      title: "OFA 登録PDF",
      text: "登録PDFを送信します。",
      files: [file]
    });
    toast("共有しました");
    return;
  }

  // fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = state.pdfFileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("ダウンロードしました（共有できない端末は保存→LINE添付してください）");
}

/* ============ Init ============ */
function init(){
  // dots
  const dots = $("progressDots");
  dots.innerHTML = "";
  for(let i=1;i<=8;i++){
    const s = document.createElement("span");
    dots.appendChild(s);
  }

  // 初期レンダリング
  render();
}

document.addEventListener("DOMContentLoaded", init);
