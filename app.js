/* OFA Driver Registration App - Full Version
   - Safari/Chromeで「次へ」押せない問題対策：button type=button + touch-action + click/touchの二重対応 + z-index
   - Galaxy等でPDFボタン反応しない対策：同期ブロック回避 + 例外時フォールバック（ダウンロード）
   - 免許証画像が小さくなる問題：PDF描画を "cover"（上下を切る）でカードを大きく見せる
*/

const STEPS = 8;

const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt"; // 指定URL

// ---- State ----
const state = {
  step: 1,
  data: {
    // STEP1
    nameKanji: "",
    nameKana: "",
    phone: "",
    email: "",
    birth: "",

    // STEP2 (住所)
    zip: "",
    address: "",

    // STEP3 (所属) ※表示はしてもPDFには使う（必要なら）
    affiliation: "協力会社",
    companyName: "",

    // STEP4 (車両) - 指定の“実質このだけ”
    carType: "",
    blackNo: "", // あり / なし / 申請中 / リース希望

    // STEP5 (口座)
    bankName: "",
    branchName: "",
    accountType: "普通",
    accountNo: "",
    accountNameKana: "",

    // STEP6 (免許証画像)
    licenseFront: null, // File
    licenseBack: null,  // File

    // STEP7 (規約)
    agreed: false,

    // generated
    pdfBlob: null,
    pdfFileName: ""
  }
};

const el = {
  stepLabel: document.getElementById("stepLabel"),
  progressFill: document.getElementById("progressFill"),
  progressDots: document.getElementById("progressDots"),
  chip: document.getElementById("chip"),
  title: document.getElementById("title"),
  desc: document.getElementById("desc"),
  stepContainer: document.getElementById("stepContainer"),
  btnBack: document.getElementById("btnBack"),
  btnNext: document.getElementById("btnNext"),
  hint: document.getElementById("hint"),
  toast: document.getElementById("toast"),
};

function toast(msg){
  el.toast.textContent = msg;
  el.toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> el.toast.classList.remove("show"), 1800);
}

function setProgress(){
  el.stepLabel.textContent = `STEP ${state.step} / ${STEPS}`;
  el.progressFill.style.width = `${((state.step-1)/(STEPS-1))*100}%`;

  el.progressDots.innerHTML = "";
  for(let i=1;i<=STEPS;i++){
    const d = document.createElement("span");
    if(i===state.step) d.classList.add("active");
    el.progressDots.appendChild(d);
  }
}

function setHeader(){
  const map = {
    1: {chip:"PROFILE", title:"ドライバー基本情報", desc:"本登録はドライバーご本人が行ってください。"},
    2: {chip:"ADDRESS", title:"住所情報", desc:"稼働に必要な住所情報を入力してください。"},
    3: {chip:"AFFILIATION", title:"所属区分", desc:"あなたの所属に近いものを選択してください。"},
    4: {chip:"VEHICLE", title:"車両情報", desc:"稼働に必要な車両情報を入力してください。"},
    5: {chip:"BANK", title:"口座情報", desc:"報酬振込先の情報を入力してください。"},
    6: {chip:"UPLOAD", title:"提出画像", desc:"免許証画像をアップロードしてください。"},
    7: {chip:"TERMS", title:"確認事項", desc:"内容を確認し、同意して次へ進んでください。"},
    8: {chip:"DONE", title:"登録完了", desc:"手順に沿って、LINE追加 → PDF作成 → PDF共有 を行ってください。"},
  };
  const h = map[state.step];
  el.chip.textContent = h.chip;
  el.title.textContent = h.title;
  el.desc.textContent = h.desc;
}

function field({label, required=false, node}){
  const wrap = document.createElement("div");
  wrap.className = "field";
  const lab = document.createElement("div");
  lab.className = "label";
  lab.textContent = label;
  if(required){
    const r = document.createElement("span");
    r.className = "req";
    r.textContent = "必須";
    lab.appendChild(r);
  }
  wrap.appendChild(lab);
  wrap.appendChild(node);
  return wrap;
}

function inputText({placeholder="", value="", onInput, type="text"}){
  const i = document.createElement("input");
  i.className = "input";
  i.type = type;
  i.placeholder = placeholder;
  i.value = value || "";
  i.autocomplete = "off";
  i.addEventListener("input", (e)=> onInput(e.target.value));
  return i;
}

function inputDate({value="", onInput}){
  // iOS Safariのdateは挙動差があるので text + pattern で安定
  const i = document.createElement("input");
  i.className = "input";
  i.type = "text";
  i.placeholder = "例）1991/07/31";
  i.value = value || "";
  i.inputMode = "numeric";
  i.addEventListener("input", (e)=>{
    let v = e.target.value.replace(/[^\d]/g,"");
    if(v.length>8) v = v.slice(0,8);
    let out = v;
    if(v.length>=5) out = `${v.slice(0,4)}/${v.slice(4,6)}${v.length>=7?"/"+v.slice(6,8):""}`;
    else if(v.length>=3) out = `${v.slice(0,4)}/${v.slice(4)}`;
    e.target.value = out;
    onInput(out);
  });
  return i;
}

function selectBox({options, value, onChange}){
  const s = document.createElement("select");
  s.className = "input";
  for(const op of options){
    const o = document.createElement("option");
    o.value = op.value;
    o.textContent = op.label;
    if(op.value === value) o.selected = true;
    s.appendChild(o);
  }
  s.addEventListener("change", (e)=> onChange(e.target.value));
  return s;
}

function pills({options, value, onChange}){
  const wrap = document.createElement("div");
  wrap.className = "pills";
  options.forEach(op=>{
    const b = document.createElement("div");
    b.className = "pill" + (op.value===value ? " active" : "");
    b.textContent = op.label;
    // click + touch どちらでも確実に
    const handler = ()=>{
      onChange(op.value);
      render();
    };
    b.addEventListener("click", handler, {passive:true});
    b.addEventListener("touchend", handler, {passive:true});
    wrap.appendChild(b);
  });
  return wrap;
}

function normalizePhone(v){
  // 数字と+だけ残す
  v = (v || "").trim();
  v = v.replace(/[^\d+]/g,"");
  return v;
}

function validEmail(v){
  if(!v) return true; // 任意扱いの場合に使う
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function requiredOkStep(){
  const d = state.data;
  if(state.step===1){
    // 必須：氏名(漢字)/フリガナ/電話/生年月日。メールは任意にしてOK（スクショで任意もあり）
    if(!d.nameKanji.trim()) return false;
    if(!d.nameKana.trim()) return false;
    if(!normalizePhone(d.phone)) return false;
    if(!d.birth.trim()) return false;
    if(d.email && !validEmail(d.email)) return false;
    return true;
  }
  if(state.step===2){
    // 住所は任意運用でもOKだが、PDFの品質上は入力推奨
    return true;
  }
  if(state.step===3){
    // 所属区分は選択だけ（表示は残す、PDFにも出す）
    return true;
  }
  if(state.step===4){
    if(!d.carType) return false;
    if(!d.blackNo) return false;
    return true;
  }
  if(state.step===5){
    // 口座は運用によるので任意でも良い（必要ならここを必須化）
    return true;
  }
  if(state.step===6){
    // 表面必須、裏面任意
    if(!d.licenseFront) return false;
    return true;
  }
  if(state.step===7){
    return !!d.agreed;
  }
  return true;
}

function renderStep(){
  const d = state.data;
  const c = el.stepContainer;
  c.innerHTML = "";

  if(state.step===1){
    const row = document.createElement("div");
    row.className = "row2";

    row.appendChild(field({
      label:"氏名（漢字）", required:true,
      node: inputText({placeholder:"例）山田 太郎", value:d.nameKanji, onInput:v=>d.nameKanji=v})
    }));

    row.appendChild(field({
      label:"フリガナ", required:true,
      node: inputText({placeholder:"例）ヤマダ タロウ", value:d.nameKana, onInput:v=>d.nameKana=v})
    }));
    c.appendChild(row);

    c.appendChild(field({
      label:"電話番号", required:true,
      node: inputText({placeholder:"090-xxxx-xxxx / +8180xxxx...", value:d.phone, onInput:v=>d.phone=normalizePhone(v), type:"tel"})
    }));

    c.appendChild(field({
      label:"メールアドレス（任意）",
      node: inputText({placeholder:"example@gmail.com", value:d.email, onInput:v=>d.email=v, type:"email"})
    }));

    c.appendChild(field({
      label:"生年月日", required:true,
      node: inputDate({value:d.birth, onInput:v=>d.birth=v})
    }));
  }

  if(state.step===2){
    c.appendChild(field({
      label:"郵便番号（任意）",
      node: inputText({placeholder:"例）890-0065", value:d.zip, onInput:v=>d.zip=v})
    }));
    c.appendChild(field({
      label:"住所（任意）",
      node: inputText({placeholder:"例）鹿児島県鹿児島市…", value:d.address, onInput:v=>d.address=v})
    }));
  }

  if(state.step===3){
    const p = pills({
      options:[
        {label:"協力会社", value:"協力会社"},
        {label:"FC", value:"FC"},
        {label:"個人", value:"個人"},
      ],
      value:d.affiliation,
      onChange:(v)=>{ d.affiliation=v; }
    });
    c.appendChild(field({label:"所属区分", node:p}));

    c.appendChild(field({
      label:"所属会社名（任意）",
      node: inputText({placeholder:"株式会社〇〇 / 〇〇運送など", value:d.companyName, onInput:v=>d.companyName=v})
    }));
  }

  if(state.step===4){
    c.appendChild(field({
      label:"車種", required:true,
      node: selectBox({
        value: d.carType,
        options:[
          {label:"選択してください", value:""},
          {label:"軽バン", value:"軽バン"},
          {label:"軽トラ", value:"軽トラ"},
          {label:"幌車", value:"幌車"},
          {label:"クール車", value:"クール車"},
          {label:"その他", value:"その他"},
        ],
        onChange:v=>{ d.carType=v; render(); }
      })
    }));

    c.appendChild(field({
      label:"黒ナンバー", required:true,
      node: selectBox({
        value: d.blackNo,
        options:[
          {label:"選択してください", value:""},
          {label:"あり", value:"あり"},
          {label:"なし", value:"なし"},
          {label:"申請中", value:"申請中"},
          {label:"リース希望", value:"リース希望"},
        ],
        onChange:v=>{ d.blackNo=v; render(); }
      })
    }));

    el.hint.textContent = "※ 車両ナンバーや支店は入力不要（運用上の必須項目のみ）";
  }

  if(state.step===5){
    const row = document.createElement("div");
    row.className = "row2";
    row.appendChild(field({
      label:"銀行（任意）",
      node: inputText({placeholder:"例）〇〇銀行", value:d.bankName, onInput:v=>d.bankName=v})
    }));
    row.appendChild(field({
      label:"支店名（任意）",
      node: inputText({placeholder:"例）鹿児島支店", value:d.branchName, onInput:v=>d.branchName=v})
    }));
    c.appendChild(row);

    const row2 = document.createElement("div");
    row2.className = "row2";
    row2.appendChild(field({
      label:"口座種別（任意）",
      node: selectBox({
        value:d.accountType,
        options:[
          {label:"普通", value:"普通"},
          {label:"当座", value:"当座"},
        ],
        onChange:v=>d.accountType=v
      })
    }));
    row2.appendChild(field({
      label:"口座番号（任意）",
      node: inputText({placeholder:"例）1234567", value:d.accountNo, onInput:v=>d.accountNo=v})
    }));
    c.appendChild(row2);

    c.appendChild(field({
      label:"口座名義（カナ）（任意）",
      node: inputText({placeholder:"例）ヤマダ タロウ", value:d.accountNameKana, onInput:v=>d.accountNameKana=v})
    }));

    el.hint.textContent = "※ 報酬振込のための情報です（未入力の場合、別途担当者が確認します）";
  }

  if(state.step===6){
    const box = document.createElement("div");
    box.className = "uploadBox";

    const front = document.createElement("input");
    front.type = "file";
    front.accept = "image/*";
    front.capture = "environment";
    front.addEventListener("change", (e)=>{
      d.licenseFront = e.target.files?.[0] || null;
      render();
    });

    const back = document.createElement("input");
    back.type = "file";
    back.accept = "image/*";
    back.capture = "environment";
    back.addEventListener("change", (e)=>{
      d.licenseBack = e.target.files?.[0] || null;
      render();
    });

    const row = document.createElement("div");
    row.className = "row2";
    row.appendChild(field({label:"免許証 表面（必須）", required:true, node: front}));
    row.appendChild(field({label:"免許証 裏面（任意）", node: back}));
    box.appendChild(row);

    const grid = document.createElement("div");
    grid.className = "previewGrid";

    const pv1 = document.createElement("div");
    pv1.className = "preview";
    pv1.innerHTML = `<div style="padding:10px;font-weight:900;">表面プレビュー</div>`;
    if(d.licenseFront){
      const img = document.createElement("img");
      img.src = URL.createObjectURL(d.licenseFront);
      pv1.appendChild(img);
    }

    const pv2 = document.createElement("div");
    pv2.className = "preview";
    pv2.innerHTML = `<div style="padding:10px;font-weight:900;">裏面プレビュー</div>`;
    if(d.licenseBack){
      const img = document.createElement("img");
      img.src = URL.createObjectURL(d.licenseBack);
      pv2.appendChild(img);
    }

    grid.appendChild(pv1);
    grid.appendChild(pv2);
    box.appendChild(grid);

    c.appendChild(box);
    el.hint.textContent = "※ 縦長写真は上下をカットして免許証が大きく見える形でPDFに出力されます。";
  }

  if(state.step===7){
    const terms = document.createElement("div");
    terms.className = "termsBox";
    terms.innerHTML = `
      <ul style="margin:0; padding-left:18px;">
        <li>本登録はドライバー本人が行うものとします。</li>
        <li>入力内容および提出書類は正確な情報であることを保証してください。</li>
        <li>虚申告・不正が判明した場合、登録・契約をお断りする場合があります。</li>
        <li>取得した個人情報は、業務連絡・案件調整・法令対応の目的で利用します。</li>
        <li>登録後、OFA GROUP担当者より連絡を行い案件を決定します。</li>
      </ul>
    `;
    c.appendChild(terms);

    const check = document.createElement("div");
    check.className = "checkRow";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!d.agreed;
    cb.addEventListener("change", (e)=>{ d.agreed = e.target.checked; render(); });

    const t = document.createElement("div");
    t.style.fontWeight = "900";
    t.textContent = "上記に同意します";

    check.appendChild(cb);
    check.appendChild(t);
    c.appendChild(check);

    el.hint.textContent = "※ 同意後「次へ」で完了画面へ進みます。";
  }

  if(state.step===8){
    // 完了画面：横3ボタン + 戻る/最初からは下に
    // ① LINE追加 ② PDF作成 ③ PDF共有
    const p = document.createElement("div");
    p.className = "termsBox";
    p.style.marginBottom = "10px";
    p.innerHTML = `
      <div style="font-weight:900; font-size:18px; margin-bottom:6px;">登録完了</div>
      <div style="line-height:1.7;">
        ① まず <b>OFAメンバーシップLINE</b> を追加（開く）<br/>
        ② 次に 登録PDFを作成<br/>
        ③ PDFをLINEへ送信してください
      </div>
    `;
    c.appendChild(p);

    const row3 = document.createElement("div");
    row3.className = "btnRow3";

    const bLine = document.createElement("button");
    bLine.className = "btnSmall btnGreen";
    bLine.type = "button";
    bLine.textContent = "メンバーシップLINEを開く";
    bindSafeTap(bLine, async ()=>{
      window.open(OFA_MEMBERSHIP_LINE_URL, "_blank");
      toast("LINE追加（開く）を実行しました");
    });

    const bPdf = document.createElement("button");
    bPdf.className = "btnSmall btnPurple";
    bPdf.type = "button";
    bPdf.textContent = "登録PDFを作成";
    bindSafeTap(bPdf, async ()=>{
      try{
        bPdf.disabled = true;
        toast("PDF作成中…");
        await generatePdf();
        toast("PDFを作成しました");
      }catch(err){
        console.error(err);
        toast("PDF作成に失敗しました");
        alert("PDF作成に失敗しました。通信環境やブラウザを変更して再度お試しください。");
      }finally{
        bPdf.disabled = false;
      }
    });

    const bShare = document.createElement("button");
    bShare.className = "btnSmall btnWhite";
    bShare.type = "button";
    bShare.textContent = "PDFを共有";
    bindSafeTap(bShare, async ()=>{
      try{
        if(!state.data.pdfBlob){
          await generatePdf();
        }
        await sharePdf();
      }catch(err){
        console.error(err);
        toast("共有に失敗しました");
        alert("共有に失敗しました。PDF作成後にダウンロードしてLINEから送付してください。");
      }
    });

    row3.appendChild(bLine);
    row3.appendChild(bPdf);
    row3.appendChild(bShare);
    c.appendChild(row3);

    const note = document.createElement("div");
    note.className = "miniNote";
    note.innerHTML = `
      ※ LINE未追加だと共有先に表示されない場合があります。<br/>
      先にLINE追加 → その後PDF作成 の順番でお願いします。
    `;
    c.appendChild(note);

    // 完了画面は標準の戻る/次へボタンを「戻る/最初から」に置換
    el.btnBack.textContent = "戻る";
    el.btnNext.textContent = "最初から";
    el.hint.textContent = "";
  }
}

function bindSafeTap(node, fn){
  // 端末/ブラウザ差でclickが飛ばない対策（iOS/Samsung/LINE内ブラウザ）
  let locked = false;
  const run = async ()=>{
    if(locked) return;
    locked = true;
    try{ await fn(); } finally { setTimeout(()=> locked=false, 150); }
  };
  node.addEventListener("click", (e)=>{ e.preventDefault(); run(); }, {passive:false});
  node.addEventListener("touchend", (e)=>{ e.preventDefault(); run(); }, {passive:false});
}

function render(){
  setProgress();
  setHeader();
  renderStep();

  // Buttons
  el.btnBack.style.display = (state.step===1) ? "none" : "inline-block";
  if(state.step===8){
    // 完了
    el.btnBack.disabled = false;
    el.btnNext.disabled = false;
  }else{
    el.btnNext.textContent = "次へ";
    el.btnBack.textContent = "戻る";
    el.btnNext.disabled = !requiredOkStep();
  }

  // hint reset
  if(state.step!==4 && state.step!==5 && state.step!==6 && state.step!==7) el.hint.textContent = "";
}

// ---- Navigation ----
async function goNext(){
  if(state.step < 8){
    // validate
    if(!requiredOkStep()){
      toast("未入力の必須項目があります");
      return;
    }
    state.step += 1;
    render();
    window.scrollTo({top:0, behavior:"smooth"});
    return;
  }
  // step8 -> reset
  resetAll();
}

function goBack(){
  if(state.step > 1){
    state.step -= 1;
    render();
    window.scrollTo({top:0, behavior:"smooth"});
  }
}

function resetAll(){
  state.step = 1;
  state.data.pdfBlob = null;
  state.data.pdfFileName = "";
  render();
  window.scrollTo({top:0, behavior:"smooth"});
}

// ボタン押下が無反応になる問題対策：click/touchend両方で確実に
bindSafeTap(el.btnNext, goNext);
bindSafeTap(el.btnBack, goBack);

// ---- PDF ----
function ymdNow(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

async function fileToDataURL(file){
  return new Promise((resolve, reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function loadImage(dataUrl){
  return new Promise((resolve, reject)=>{
    const img = new Image();
    img.onload = ()=> resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/**
 * cover描画：縦長写真は上下を切って、免許証（中央）を大きく見せる
 * ＝ “写真サイズ縮小で中が見えない” を防ぐ
 */
function drawImageCover(doc, img, x, y, w, h){
  const iw = img.width, ih = img.height;
  const targetRatio = w / h;
  const imgRatio = iw / ih;

  let sx=0, sy=0, sw=iw, sh=ih;

  if(imgRatio > targetRatio){
    // 画像が横長 → 左右を切る
    sh = ih;
    sw = ih * targetRatio;
    sx = (iw - sw) / 2;
    sy = 0;
  }else{
    // 画像が縦長 → 上下を切る（要望通り）
    sw = iw;
    sh = iw / targetRatio;
    sx = 0;
    sy = (ih - sh) / 2;
  }

  doc.addImage(img, "JPEG", x, y, w, h, undefined, "FAST", 0, sx, sy, sw, sh);
}

async function generatePdf(){
  const { jsPDF } = window.jspdf;
  if(!jsPDF) throw new Error("jsPDF not loaded");

  const d = state.data;

  // ファイル名
  const ts = ymdNow();
  const fileName = `OFA_driver_entry_${ts}.pdf`;
  state.data.pdfFileName = fileName;

  const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Header
  doc.setFillColor(255,255,255);
  doc.rect(0,0,pageW,pageH,"F");

  doc.setFont("helvetica","bold");
  doc.setFontSize(16);
  doc.text("OFA GROUP ドライバー登録シート", 40, 48);

  doc.setFontSize(10);
  doc.setFont("helvetica","normal");
  doc.text(`作成日時：${new Date().toLocaleString("ja-JP")}`, pageW-220, 40);
  doc.setTextColor(255,122,0);
  doc.setFont("helvetica","bold");
  doc.text("One for All, All for One", pageW-180, 55);
  doc.setTextColor(0,0,0);

  // Orange line
  doc.setDrawColor(255,122,0);
  doc.setLineWidth(2);
  doc.line(40, 62, pageW-40, 62);

  // Boxes layout (two columns)
  const leftX = 40;
  const rightX = pageW/2 + 10;
  const colW = pageW/2 - 50;
  const boxH = 46;
  let y = 80;

  function box(x,y,label,value){
    doc.setDrawColor(220,220,220);
    doc.setLineWidth(1);
    doc.roundedRect(x, y, colW, boxH, 10, 10, "S");

    // orange accent line
    doc.setDrawColor(255,122,0);
    doc.setLineWidth(3);
    doc.line(x+6, y+12, x+6, y+boxH-12);

    doc.setFont("helvetica","normal");
    doc.setFontSize(9);
    doc.setTextColor(90,90,90);
    doc.text(label, x+16, y+16);

    doc.setFont("helvetica","bold");
    doc.setFontSize(11);
    doc.setTextColor(0,0,0);
    const text = (value && String(value).trim()) ? String(value).trim() : "";
    doc.text(text || "-", x+16, y+34);
  }

  // Row1
  box(leftX, y, "氏名（漢字）", d.nameKanji);
  box(rightX, y, "フリガナ", d.nameKana);
  y += boxH + 10;

  // Row2
  box(leftX, y, "電話番号", d.phone);
  box(rightX, y, "メール", d.email || "-");
  y += boxH + 10;

  // Row3
  box(leftX, y, "生年月日", d.birth);
  box(rightX, y, "住所", d.address || "-");
  y += boxH + 10;

  // Row4
  box(leftX, y, "所属区分", d.affiliation || "-");
  box(rightX, y, "所属会社名（任意）", d.companyName || "-");
  y += boxH + 10;

  // Row5
  box(leftX, y, "車種", d.carType || "-");
  box(rightX, y, "黒ナンバー", d.blackNo || "-");
  y += boxH + 10;

  // Row6 (口座)
  box(leftX, y, "銀行", d.bankName || "-");
  box(rightX, y, "支店名", d.branchName || "-");
  y += boxH + 10;

  box(leftX, y, "口座種別", d.accountType || "-");
  box(rightX, y, "口座番号", d.accountNo || "-");
  y += boxH + 10;

  box(leftX, y, "口座名義（カナ）", d.accountNameKana || "-");
  // 右は空欄
  doc.setDrawColor(255,255,255);
  doc.roundedRect(rightX, y, colW, boxH, 10, 10, "S");
  y += boxH + 16;

  // Images Section
  doc.setFont("helvetica","bold");
  doc.setFontSize(11);
  doc.text("提出画像", 40, y);
  y += 10;

  const imgY = y + 6;
  const imgW = (pageW - 40*2 - 10) / 2;
  const imgH = 220; // ここで免許証を大きく見せる

  // labels
  doc.setFont("helvetica","normal");
  doc.setFontSize(9);
  doc.setTextColor(90,90,90);
  doc.text("免許証 表面（必須）", leftX, imgY);
  doc.text("免許証 裏面（任意）", leftX + imgW + 10, imgY);

  // frames
  const frameY = imgY + 10;
  doc.setDrawColor(220,220,220);
  doc.setLineWidth(1);
  doc.roundedRect(leftX, frameY, imgW, imgH, 12, 12, "S");
  doc.roundedRect(leftX + imgW + 10, frameY, imgW, imgH, 12, 12, "S");

  // images with cover (上下カットで大きく)
  if(d.licenseFront){
    const du = await fileToDataURL(d.licenseFront);
    const img = await loadImage(du);
    drawImageCover(doc, img, leftX+8, frameY+8, imgW-16, imgH-16);
  }else{
    doc.setFont("helvetica","bold");
    doc.setTextColor(160,160,160);
    doc.text("未提出", leftX + 20, frameY + 40);
    doc.setTextColor(0,0,0);
  }

  if(d.licenseBack){
    const du = await fileToDataURL(d.licenseBack);
    const img = await loadImage(du);
    drawImageCover(doc, img, leftX + imgW + 18, frameY+8, imgW-16, imgH-16);
  }else{
    doc.setFont("helvetica","bold");
    doc.setTextColor(160,160,160);
    doc.text("-", leftX + imgW + 30, frameY + 40);
    doc.setTextColor(0,0,0);
  }

  // Footer note
  const footY = frameY + imgH + 18;
  doc.setFont("helvetica","normal");
  doc.setFontSize(10);
  doc.setTextColor(0,0,0);
  doc.text("このPDFを「OFAメンバーシップLINE」へ添付して送信してください。", 40, footY);

  // Create blob
  const pdfArray = doc.output("arraybuffer");
  const blob = new Blob([pdfArray], {type:"application/pdf"});
  state.data.pdfBlob = blob;

  return blob;
}

async function sharePdf(){
  const blob = state.data.pdfBlob;
  const fileName = state.data.pdfFileName || `OFA_driver_entry_${ymdNow()}.pdf`;
  const file = new File([blob], fileName, {type:"application/pdf"});

  // Web Share API (Android/Chromeが強い)
  if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
    await navigator.share({
      title: "OFA 登録PDF",
      text: "OFAメンバーシップLINEへ送信してください。",
      files: [file]
    });
    toast("共有を開きました");
    return;
  }

  // Fallback: download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 1500);

  toast("ダウンロードしました（LINEから添付してください）");
}

// ---- Init ----
function init(){
  render();
  toast("入力を開始してください");
}

init();
