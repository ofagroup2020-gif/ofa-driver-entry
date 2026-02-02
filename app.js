/* =========================
  OFA Driver Entry - Full Version
  - iOS Safari / Android Chrome / LINE内ブラウザ対応
  - ボタン反応しない対策（pointerup + touchend + click / passive:false）
  - PDF生成（jsPDF）+ 共有（navigator.share対応）
  - 免許証画像は「上下カットで大きく」（object-fit:cover + PDFもcover crop）
========================= */

const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt";

/** ロゴ画像（任意）：存在しない場合は自動で文字ロゴ */
const OFA_LOGO_URL = "./assets/ofa-logo.png"; // あるなら置く。無いならそのままでOK。

/* ===== State ===== */
const state = {
  step: 1,
  data: {
    nameKanji: "",
    nameKana: "",
    phone: "",
    email: "",
    birthday: "",

    affiliation: "", // 協力会社/FC/個人（画面表示はしない要望もあったが、PDF項目には残せる）
    companyName: "",

    vehicleType: "",
    vehicleNo: "",      // 任意：今後必要なら
    blackNumber: "",    // あり/なし/申請中/リース希望

    bankName: "",
    accountType: "普通",
    accountNumber: "",
    accountNameKana: "",

    licenseFront: null, // dataURL
    licenseBack: null,  // dataURL

    agreed: false,
    lineOpened: false,
  }
};

const $ = (id)=>document.getElementById(id);

/* ===== Safe Tap Binding ===== */
function bindSafeTap(node, fn){
  let locked = false;

  const run = async (e)=>{
    if(e){
      e.preventDefault?.();
      e.stopPropagation?.();
    }
    // キーボードが邪魔する端末向け：必ず閉じる
    try { document.activeElement?.blur?.(); } catch(_){}

    if(locked) return;
    locked = true;
    try{
      await fn();
    } finally {
      setTimeout(()=> locked = false, 250);
    }
  };

  node.addEventListener("pointerup", run, { passive:false });
  node.addEventListener("touchend", run, { passive:false });
  node.addEventListener("click", run, { passive:false });

  node.style.cursor = "pointer";
  node.style.webkitTapHighlightColor = "transparent";
}

/* ===== UI Meta ===== */
const steps = [
  { chip:"PROFILE", title:"ドライバー基本情報", desc:"本登録はドライバーご本人が行ってください。"},
  { chip:"AFFILIATION", title:"所属（任意）", desc:"該当する場合のみ入力してください。"},
  { chip:"BANK", title:"口座情報", desc:"報酬の振込先口座を入力してください。"},
  { chip:"VEHICLE", title:"車両情報", desc:"稼働に必要な車両情報を入力してください。"},
  { chip:"LICENSE", title:"免許証画像", desc:"免許証画像をアップロードしてください（表は必須）。"},
  { chip:"CONFIRM", title:"入力内容の確認", desc:"内容を確認して次へ進んでください。"},
  { chip:"TERMS", title:"登録規約", desc:"内容を確認し、同意して次へ進んでください。"},
  { chip:"DONE", title:"登録完了", desc:"LINE追加→PDF作成→LINEへ送信 の順番でお願いします。"},
];

/* ===== Init ===== */
init();

function init(){
  // Logo
  const img = $("ofaLogo");
  img.onload = ()=> { img.style.display = "block"; document.querySelector(".logoFallback").style.display="none"; };
  img.onerror = ()=> { /* fallback */ };
  img.src = OFA_LOGO_URL + "?v=1";

  // Progress dots
  const dots = $("progressDots");
  dots.innerHTML = "";
  for(let i=0;i<8;i++){
    const s = document.createElement("span");
    dots.appendChild(s);
  }

  // Buttons
  bindSafeTap($("btnBack"), ()=>goBack());
  bindSafeTap($("btnNext"), ()=>goNext());

  render();
}

/* ===== Navigation ===== */
function goBack(){
  if(state.step <= 1) return;
  state.step--;
  render();
}

function goNext(){
  // Stepごとのバリデーション
  const ok = validateStep(state.step);
  if(!ok) return;

  if(state.step >= 8) return;
  state.step++;
  render();
}

/* ===== Render ===== */
function render(){
  const meta = steps[state.step - 1];
  $("chipLabel").textContent = meta.chip;
  $("stepTitle").textContent = meta.title;
  $("stepDesc").textContent = meta.desc;
  $("stepText").textContent = `STEP ${state.step} / 8`;

  // progress
  $("progressFill").style.width = `${Math.round((state.step-1)/7*100)}%`;
  const dotEls = [...$("progressDots").children];
  dotEls.forEach((d, i)=>{
    d.classList.toggle("active", i === (state.step-1));
  });

  // footer
  $("btnBack").style.visibility = (state.step === 1) ? "hidden" : "visible";
  $("btnNext").style.visibility = (state.step === 8) ? "hidden" : "visible";

  // content
  const body = $("stepBody");
  body.innerHTML = "";

  if(state.step === 1) renderStep1(body);
  if(state.step === 2) renderStep2(body);
  if(state.step === 3) renderStep3(body);
  if(state.step === 4) renderStep4(body);
  if(state.step === 5) renderStep5(body);
  if(state.step === 6) renderStep6(body);
  if(state.step === 7) renderStep7(body);
  if(state.step === 8) renderStep8(body);

  // iOS: レイアウト確定後のタップ不具合保険
  setTimeout(()=>window.scrollBy(0,0), 0);
}

/* ===== Components ===== */
function formWrap(){
  const d = document.createElement("div");
  d.className = "form";
  return d;
}
function fieldBlock(labelText, inputEl, note){
  const w = document.createElement("div");
  const lab = document.createElement("div");
  lab.className = "label";
  lab.textContent = labelText;
  w.appendChild(lab);
  w.appendChild(inputEl);
  if(note){
    const n = document.createElement("div");
    n.className = "note";
    n.textContent = note;
    w.appendChild(n);
  }
  return w;
}
function inputText(placeholder, value, onInput, type="text"){
  const i = document.createElement("input");
  i.className = "field";
  i.type = type;
  i.placeholder = placeholder;
  i.value = value ?? "";
  i.autocomplete = "off";
  i.addEventListener("input", (e)=>onInput(e.target.value));
  return i;
}
function inputDate(value, onInput){
  const i = document.createElement("input");
  i.className = "field";
  i.type = "date";
  i.value = value ?? "";
  i.addEventListener("input", (e)=>onInput(e.target.value));
  return i;
}
function selectBox(options, value, onChange){
  const s = document.createElement("select");
  s.className = "field";
  options.forEach(opt=>{
    const o = document.createElement("option");
    o.value = opt.value;
    o.textContent = opt.label;
    s.appendChild(o);
  });
  s.value = value ?? "";
  s.addEventListener("change", (e)=>onChange(e.target.value));
  return s;
}
function pillGroup(items, current, onPick){
  const wrap = document.createElement("div");
  wrap.className = "pills";
  items.forEach(it=>{
    const p = document.createElement("div");
    p.className = "pill" + (current === it.value ? " active" : "");
    p.innerHTML = `<div>${escapeHtml(it.label)}</div>${it.sub ? `<div class="pillSub">${escapeHtml(it.sub)}</div>` : ""}`;
    bindSafeTap(p, ()=>{
      onPick(it.value);
      render();
    });
    wrap.appendChild(p);
  });
  return wrap;
}
function hr(){
  const d = document.createElement("div");
  d.className="hr";
  return d;
}
function alertToast(msg){
  // シンプルにalert（LINE内ブラウザ等で確実）
  alert(msg);
}

/* ===== Step 1: Profile ===== */
function renderStep1(body){
  const f = formWrap();

  f.appendChild(fieldBlock("氏名（漢字）", inputText("例）山田 太郎", state.data.nameKanji, v=>state.data.nameKanji=v)));
  f.appendChild(fieldBlock("フリガナ", inputText("例）ヤマダ タロウ", state.data.nameKana, v=>state.data.nameKana=v)));

  // phone/email/birthdayは任意でもOKにすると“次へ押せない”誤判定が減るが、
  // OFAの運用上は必要が多いので、電話は必須扱いにしている
  f.appendChild(fieldBlock("電話番号（必須）", inputText("090-xxxx-xxxx", state.data.phone, v=>state.data.phone=v, "tel")));
  f.appendChild(fieldBlock("メールアドレス（任意）", inputText("example@gmail.com", state.data.email, v=>state.data.email=v, "email")));
  f.appendChild(fieldBlock("生年月日（任意）", inputDate(state.data.birthday, v=>state.data.birthday=v)));

  body.appendChild(f);
}

/* ===== Step 2: Affiliation (任意・表示いらない要望があったので最小) ===== */
function renderStep2(body){
  const f = formWrap();

  const info = document.createElement("div");
  info.className = "note";
  info.textContent = "※所属情報は任意です（必要な場合のみ入力）。";
  body.appendChild(info);

  f.appendChild(fieldBlock("所属区分（任意）",
    pillGroup([
      {label:"協力会社", value:"協力会社"},
      {label:"FC", value:"FC"},
      {label:"個人", value:"個人"},
    ], state.data.affiliation, v=>state.data.affiliation=v)
  ));

  f.appendChild(fieldBlock("所属会社名（任意）", inputText("株式会社〇〇 / 〇〇運送など", state.data.companyName, v=>state.data.companyName=v)));
  body.appendChild(f);
}

/* ===== Step 3: Bank ===== */
function renderStep3(body){
  const f = formWrap();

  f.appendChild(fieldBlock("銀行名（必須）", inputText("例）三井住友銀行", state.data.bankName, v=>state.data.bankName=v)));
  f.appendChild(fieldBlock("口座種別（必須）", selectBox([
    {label:"普通", value:"普通"},
    {label:"当座", value:"当座"},
  ], state.data.accountType, v=>state.data.accountType=v)));

  const row = document.createElement("div");
  row.className = "row2";
  row.appendChild(fieldBlock("口座番号（必須）", inputText("例）1234567", state.data.accountNumber, v=>state.data.accountNumber=v, "text")));
  row.appendChild(fieldBlock("口座名義（カナ）（必須）", inputText("例）ヤマダタロウ", state.data.accountNameKana, v=>state.data.accountNameKana=v)));
  f.appendChild(row);

  body.appendChild(f);
}

/* ===== Step 4: Vehicle ===== */
function renderStep4(body){
  const f = formWrap();

  // 車種（指定の5つ）
  f.appendChild(fieldBlock("車種（必須）", selectBox([
    {label:"選択してください", value:""},
    {label:"軽バン", value:"軽バン"},
    {label:"軽トラ", value:"軽トラ"},
    {label:"幌車", value:"幌車"},
    {label:"クール車", value:"クール車"},
    {label:"その他", value:"その他"},
  ], state.data.vehicleType, v=>state.data.vehicleType=v)));

  // 車両ナンバーは現状必須じゃない（要望的にも“実質これだけ”）
  // もし入れたいなら下のコメントを外す
  // f.appendChild(fieldBlock("車両ナンバー（任意）", inputText("例）鹿児島 480 さ 12-34", state.data.vehicleNo, v=>state.data.vehicleNo=v)));

  // 黒ナンバー（4択：あり/なし/申請中/リース希望）
  f.appendChild(fieldBlock("黒ナンバー（必須）", selectBox([
    {label:"選択してください", value:""},
    {label:"あり", value:"あり"},
    {label:"なし", value:"なし"},
    {label:"申請中", value:"申請中"},
    {label:"リース希望", value:"リース希望"},
  ], state.data.blackNumber, v=>state.data.blackNumber=v)));

  body.appendChild(f);
}

/* ===== Step 5: License Images ===== */
function renderStep5(body){
  const f = formWrap();

  const box = document.createElement("div");
  box.className = "fileBox";
  box.innerHTML = `
    <div class="label">免許証 表（必須）</div>
    <div class="note">※縦長写真でもOK。PDFでは上下をカットして免許証が見えるように大きく出力します。</div>
  `;
  const in1 = document.createElement("input");
  in1.type = "file";
  in1.accept = "image/*";
  in1.className = "field";
  in1.addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    state.data.licenseFront = await fileToDataURL(file);
    render();
  });
  box.appendChild(in1);

  const box2 = document.createElement("div");
  box2.className = "fileBox";
  box2.innerHTML = `<div class="label">免許証 裏（任意）</div>`;
  const in2 = document.createElement("input");
  in2.type = "file";
  in2.accept = "image/*";
  in2.className = "field";
  in2.addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    state.data.licenseBack = await fileToDataURL(file);
    render();
  });
  box2.appendChild(in2);

  const previews = document.createElement("div");
  previews.className = "previewRow";

  const p1 = document.createElement("div");
  p1.className = "preview";
  p1.innerHTML = state.data.licenseFront ? `<img src="${state.data.licenseFront}" alt="license front">` : `<div class="note" style="padding:14px;">未選択</div>`;

  const p2 = document.createElement("div");
  p2.className = "preview";
  p2.innerHTML = state.data.licenseBack ? `<img src="${state.data.licenseBack}" alt="license back">` : `<div class="note" style="padding:14px;">未選択</div>`;

  previews.appendChild(p1);
  previews.appendChild(p2);

  body.appendChild(box);
  body.appendChild(box2);
  body.appendChild(previews);
}

/* ===== Step 6: Confirm ===== */
function renderStep6(body){
  const d = state.data;

  const wrap = document.createElement("div");
  wrap.className = "form";

  wrap.appendChild(makeSummaryBadge("PROFILE"));
  wrap.appendChild(summaryLine("氏名（漢字）", d.nameKanji));
  wrap.appendChild(summaryLine("フリガナ", d.nameKana));
  wrap.appendChild(summaryLine("電話番号", d.phone));
  wrap.appendChild(summaryLine("メール", d.email || "—"));
  wrap.appendChild(summaryLine("生年月日", d.birthday || "—"));

  wrap.appendChild(hr());
  wrap.appendChild(makeSummaryBadge("AFFILIATION"));
  wrap.appendChild(summaryLine("所属区分", d.affiliation || "—"));
  wrap.appendChild(summaryLine("所属会社名", d.companyName || "—"));

  wrap.appendChild(hr());
  wrap.appendChild(makeSummaryBadge("BANK"));
  wrap.appendChild(summaryLine("銀行", d.bankName));
  wrap.appendChild(summaryLine("口座種別", d.accountType));
  wrap.appendChild(summaryLine("口座番号", d.accountNumber));
  wrap.appendChild(summaryLine("口座名義（カナ）", d.accountNameKana));

  wrap.appendChild(hr());
  wrap.appendChild(makeSummaryBadge("VEHICLE"));
  wrap.appendChild(summaryLine("車種", d.vehicleType));
  wrap.appendChild(summaryLine("黒ナンバー", d.blackNumber));

  wrap.appendChild(hr());
  wrap.appendChild(makeSummaryBadge("LICENSE"));
  wrap.appendChild(summaryLine("免許証 表", d.licenseFront ? "登録済" : "未登録"));
  wrap.appendChild(summaryLine("免許証 裏", d.licenseBack ? "登録済" : "未登録"));

  body.appendChild(wrap);
}

function makeSummaryBadge(text){
  const b = document.createElement("div");
  b.className="badge";
  b.innerHTML = `<span class="dot"></span><span>${escapeHtml(text)}</span>`;
  return b;
}
function summaryLine(k,v){
  const row = document.createElement("div");
  row.className = "note";
  row.style.padding = "2px 2px";
  row.innerHTML = `<b style="display:inline-block;min-width:120px;">${escapeHtml(k)}</b> ${escapeHtml(v ?? "")}`;
  return row;
}

/* ===== Step 7: Terms ===== */
function renderStep7(body){
  const box = document.createElement("div");
  box.className = "fileBox";
  box.innerHTML = `
    <div class="note" style="font-size:14px;line-height:1.75;">
      ・本登録はドライバー本人が行うものとします。<br>
      ・入力内容および提出書類は正確な情報であることを保証してください。<br>
      ・虚申告・不正が判明した場合、登録・契約をお断りする場合があります。<br>
      ・取得した個人情報は、業務連絡・案件調整・法令対応の目的で利用します。<br>
      ・登録後、OFA GROUP担当者より連絡を行い案件を決定します。
    </div>
  `;

  const checkRow = document.createElement("div");
  checkRow.className = "checkboxRow";
  const check = document.createElement("div");
  check.className = "check" + (state.data.agreed ? " on" : "");
  check.textContent = state.data.agreed ? "✓" : "";
  const txt = document.createElement("div");
  txt.innerHTML = `<b>上記に同意します</b>`;
  checkRow.appendChild(check);
  checkRow.appendChild(txt);

  bindSafeTap(checkRow, ()=>{
    state.data.agreed = !state.data.agreed;
    render();
  });

  const note = document.createElement("div");
  note.className = "note";
  note.textContent = "※同意後「次へ」で完了画面へ進みます。";

  body.appendChild(box);
  body.appendChild(checkRow);
  body.appendChild(note);
}

/* ===== Step 8: Done ===== */
function renderStep8(body){
  const d = document.createElement("div");
  d.className = "form";

  const text = document.createElement("div");
  text.className = "note";
  text.style.fontSize = "15px";
  text.style.lineHeight = "1.8";
  text.innerHTML = `
    ① まず <b>OFAメンバーシップLINE</b> を追加（開く）<br>
    ② 次に <b>登録PDF</b> を作成<br>
    ③ PDFを <b>LINEへ送信</b> してください
    <div class="hr"></div>
    <span style="color:rgba(0,0,0,.65)">
      ※LINE未追加だと共有先に表示されない場合があります。<br>
      先にLINE追加 → その後PDF作成 の順番でお願いします。
    </span>
  `;

  const row = document.createElement("div");
  row.className = "btnRow3";

  const btnLine = document.createElement("button");
  btnLine.className = "btn btnGreen";
  btnLine.type = "button";
  btnLine.textContent = "メンバーシップLINEを開く";

  const btnPdf = document.createElement("button");
  btnPdf.className = "btn btnPrimary";
  btnPdf.type = "button";
  btnPdf.textContent = "登録PDFを作成";

  const btnShare = document.createElement("button");
  btnShare.className = "btn btnWhite";
  btnShare.type = "button";
  btnShare.textContent = "PDFを共有";

  bindSafeTap(btnLine, ()=>{
    state.data.lineOpened = true;
    // LINEを開く
    window.location.href = OFA_MEMBERSHIP_LINE_URL;
  });

  bindSafeTap(btnPdf, async ()=>{
    const ok = validateAllForPdf();
    if(!ok) return;
    const pdfBlob = await buildPdfBlob();
    // download fallback
    downloadBlob(pdfBlob, makePdfFileName());
    state._lastPdfBlob = pdfBlob;
    alertToast("PDFを作成しました。共有する場合は「PDFを共有」を押してください。");
  });

  bindSafeTap(btnShare, async ()=>{
    const ok = validateAllForPdf();
    if(!ok) return;

    let pdfBlob = state._lastPdfBlob;
    if(!pdfBlob){
      pdfBlob = await buildPdfBlob();
      state._lastPdfBlob = pdfBlob;
    }

    const file = new File([pdfBlob], makePdfFileName(), { type: "application/pdf" });

    // Web Share API（Androidで強い）
    if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      try{
        await navigator.share({
          title: "OFA ドライバー登録PDF",
          text: "登録PDFを送信します。",
          files: [file],
        });
        return;
      }catch(e){
        // ユーザーキャンセル等
      }
    }

    // fallback: 新規タブで開く（端末によってはDL/共有へ）
    const url = URL.createObjectURL(pdfBlob);
    window.open(url, "_blank");
    setTimeout(()=>URL.revokeObjectURL(url), 60_000);
    alertToast("共有が出ない端末は、開いたPDF画面の共有ボタンからLINEへ送ってください。");
  });

  row.appendChild(btnLine);
  row.appendChild(btnPdf);
  row.appendChild(btnShare);

  const bottom = document.createElement("div");
  bottom.className = "footerBtns";
  bottom.innerHTML = `
    <button class="btn btnGhost" id="btnBack2" type="button">戻る</button>
    <button class="btn btnPrimary" id="btnReset" type="button">最初から</button>
  `;
  d.appendChild(text);
  d.appendChild(row);
  d.appendChild(bottom);

  body.appendChild(d);

  // 下ボタン
  bindSafeTap($("btnBack2"), ()=>{ state.step = 7; render(); });
  bindSafeTap($("btnReset"), ()=>{
    if(confirm("最初から入力し直しますか？")){
      resetAll();
      render();
    }
  });
}

/* ===== Validation ===== */
function validateStep(step){
  const d = state.data;

  if(step === 1){
    // 必須：氏名（漢字）/フリガナ/電話番号
    if(!d.nameKanji.trim()) return alertToast("氏名（漢字）を入力してください。"), false;
    if(!d.nameKana.trim())  return alertToast("フリガナを入力してください。"), false;
    if(!d.phone.trim())     return alertToast("電話番号を入力してください。"), false;
    return true;
  }

  if(step === 3){
    if(!d.bankName.trim())        return alertToast("銀行名を入力してください。"), false;
    if(!d.accountType.trim())     return alertToast("口座種別を選択してください。"), false;
    if(!d.accountNumber.trim())   return alertToast("口座番号を入力してください。"), false;
    if(!d.accountNameKana.trim()) return alertToast("口座名義（カナ）を入力してください。"), false;
    return true;
  }

  if(step === 4){
    if(!d.vehicleType)    return alertToast("車種を選択してください。"), false;
    if(!d.blackNumber)    return alertToast("黒ナンバーを選択してください。"), false;
    return true;
  }

  if(step === 5){
    if(!d.licenseFront) return alertToast("免許証（表）の画像をアップロードしてください。"), false;
    return true;
  }

  if(step === 7){
    if(!d.agreed) return alertToast("規約に同意してください。"), false;
    return true;
  }

  return true;
}

function validateAllForPdf(){
  // PDF作成に必要な最低限
  const d = state.data;
  if(!d.nameKanji.trim()) return alertToast("氏名（漢字）が未入力です。"), false;
  if(!d.nameKana.trim())  return alertToast("フリガナが未入力です。"), false;
  if(!d.phone.trim())     return alertToast("電話番号が未入力です。"), false;

  if(!d.bankName.trim())        return alertToast("銀行名が未入力です。"), false;
  if(!d.accountType.trim())     return alertToast("口座種別が未選択です。"), false;
  if(!d.accountNumber.trim())   return alertToast("口座番号が未入力です。"), false;
  if(!d.accountNameKana.trim()) return alertToast("口座名義（カナ）が未入力です。"), false;

  if(!d.vehicleType) return alertToast("車種が未選択です。"), false;
  if(!d.blackNumber) return alertToast("黒ナンバーが未選択です。"), false;

  if(!d.licenseFront) return alertToast("免許証（表）が未登録です。"), false;

  return true;
}

/* ===== PDF ===== */
function makePdfFileName(){
  const now = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  const y = now.getFullYear();
  const m = pad(now.getMonth()+1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return `OFA_driver_entry_${y}${m}${d}_${hh}${mm}${ss}.pdf`;
}

async function buildPdfBlob(){
  const { jsPDF } = window.jspdf;

  // A4 portrait
  const pdf = new jsPDF({ unit:"pt", format:"a4" });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();

  // margins
  const margin = 32;
  const colGap = 14;
  const colW = (W - margin*2 - colGap) / 2;

  const d = state.data;
  const createdAt = new Date();

  // Header
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(14);
  pdf.text("OFA GROUP ドライバー登録シート", margin, 42);

  pdf.setFont("helvetica","normal");
  pdf.setFontSize(10);
  pdf.text(`作成日時：${formatDateTime(createdAt)}`, W - margin - 220, 42);
  pdf.setFont("helvetica","bold");
  pdf.setTextColor(255,106,0);
  pdf.text("One for All, All for One", W - margin - 165, 58);
  pdf.setTextColor(0,0,0);

  // underline
  pdf.setDrawColor(255,106,0);
  pdf.setLineWidth(2);
  pdf.line(margin, 64, W - margin, 64);

  // Field blocks (2 columns)
  let y = 84;

  const left = [
    ["氏名（漢字）", d.nameKanji],
    ["電話番号", d.phone],
    ["生年月日", d.birthday || "—"],
    ["所属区分", d.affiliation || "—"],
    ["車種", d.vehicleType],
    ["黒ナンバー", d.blackNumber],
    ["口座種別", d.accountType],
    ["口座名義（カナ）", d.accountNameKana],
  ];

  const right = [
    ["フリガナ", d.nameKana],
    ["メール", d.email || "—"],
    ["所属会社名（任意）", d.companyName || "—"],
    ["銀行", d.bankName],
    ["口座番号", d.accountNumber],
  ];

  // Draw boxes helper
  const boxH = 52;
  const radius = 12;

  // Left column
  let yL = y;
  for(const [k,v] of left){
    drawField(pdf, margin, yL, colW, boxH, k, v, radius);
    yL += boxH + 10;
  }

  // Right column
  let yR = y;
  for(const [k,v] of right){
    drawField(pdf, margin + colW + colGap, yR, colW, boxH, k, v, radius);
    yR += boxH + 10;
  }

  // Images area label
  const imgTop = Math.max(yL, yR) + 10;
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(11);
  pdf.text("提出画像", margin, imgTop + 14);

  // image boxes
  const imgBoxY = imgTop + 26;
  const imgBoxH = 220;
  const imgBoxW = colW;

  // Front (required)
  await drawImageCover(pdf, d.licenseFront, margin, imgBoxY, imgBoxW, imgBoxH);
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(9);
  pdf.text("免許証 表（必須）", margin, imgBoxY - 6);

  // Back (optional)
  if(d.licenseBack){
    await drawImageCover(pdf, d.licenseBack, margin + colW + colGap, imgBoxY, imgBoxW, imgBoxH);
  }else{
    drawEmptyImageBox(pdf, margin + colW + colGap, imgBoxY, imgBoxW, imgBoxH, "免許証 裏（任意）");
  }
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(9);
  pdf.text("免許証 裏（任意）", margin + colW + colGap, imgBoxY - 6);

  // Footer note
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(10);
  pdf.setTextColor(80,80,80);
  pdf.text("このPDFを「OFAメンバーシップLINE」へ添付して送信してください。", margin, H - 42);
  pdf.setTextColor(0,0,0);

  // Return blob
  const blob = pdf.output("blob");
  return blob;
}

function drawField(pdf, x, y, w, h, label, value, r){
  // box
  pdf.setDrawColor(230,230,238);
  pdf.setFillColor(255,255,255);
  roundRect(pdf, x, y, w, h, r, true, true);

  // orange left border
  pdf.setDrawColor(255,106,0);
  pdf.setLineWidth(3);
  pdf.line(x+1.5, y+10, x+1.5, y+h-10);

  // text
  pdf.setFont("helvetica","bold");
  pdf.setFontSize(9);
  pdf.text(label, x+14, y+16);

  pdf.setFont("helvetica","bold");
  pdf.setFontSize(12);
  const str = (value ?? "").toString();
  pdf.text(str, x+14, y+36, { maxWidth: w-28 });
}

function drawEmptyImageBox(pdf, x, y, w, h, label){
  pdf.setDrawColor(230,230,238);
  pdf.setFillColor(255,255,255);
  roundRect(pdf, x, y, w, h, 16, true, true);
  pdf.setFont("helvetica","normal");
  pdf.setFontSize(11);
  pdf.setTextColor(140,140,140);
  pdf.text("未登録", x + w/2 - 16, y + h/2);
  pdf.setTextColor(0,0,0);
}

async function drawImageCover(pdf, dataURL, x, y, w, h){
  // 枠
  pdf.setDrawColor(230,230,238);
  pdf.setFillColor(255,255,255);
  roundRect(pdf, x, y, w, h, 16, true, true);

  // cover crop 用にcanvas化
  const canvas = await dataUrlToCoverCanvas(dataURL, w*2, h*2); // 2xでキレイに
  const out = canvas.toDataURL("image/jpeg", 0.92);

  // 画像描画
  pdf.addImage(out, "JPEG", x+8, y+8, w-16, h-16, undefined, "FAST");
}

async function dataUrlToCoverCanvas(dataURL, targetW, targetH){
  const img = await loadImage(dataURL);
  const cw = Math.floor(targetW);
  const ch = Math.floor(targetH);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");

  // cover：縦長写真は上下を切って中身を大きく（免許証が見える）
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(cw/iw, ch/ih);
  const sw = cw/scale;
  const sh = ch/scale;
  const sx = (iw - sw)/2;
  const sy = (ih - sh)/2;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,cw,ch);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

  return canvas;
}

function roundRect(pdf, x, y, w, h, r, fill, stroke){
  // jsPDF rounded rect helper
  pdf.roundedRect(x, y, w, h, r, r, fill ? "F" : undefined);
  if(stroke){
    pdf.roundedRect(x, y, w, h, r, r);
  }
}

function formatDateTime(d){
  const pad = (n)=>String(n).padStart(2,"0");
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ===== Utils ===== */
function escapeHtml(str){
  return (str ?? "").toString()
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const fr = new FileReader();
    fr.onload = ()=>resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

function loadImage(src){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 60_000);
}

function resetAll(){
  state.step = 1;
  state.data = {
    nameKanji: "",
    nameKana: "",
    phone: "",
    email: "",
    birthday: "",
    affiliation: "",
    companyName: "",
    vehicleType: "",
    vehicleNo: "",
    blackNumber: "",
    bankName: "",
    accountType: "普通",
    accountNumber: "",
    accountNameKana: "",
    licenseFront: null,
    licenseBack: null,
    agreed: false,
    lineOpened: false,
  };
  state._lastPdfBlob = null;
}
