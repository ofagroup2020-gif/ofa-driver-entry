/* =========================
   OFA Driver Entry - FULL
   日本語PDF：NotoSansJPを埋め込み
   ========================= */

const OFA_LOGO_URL = "./assets/ofa_logo.png"; // ←ロゴ画像を置く（なければ差し替え）
const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt"; // ←指定URL

const TOTAL_STEPS = 8;

const state = {
  step: 1,
  agree: false,
  data: {
    // STEP1 基本
    nameKanji: "",
    nameKana: "",
    phone: "",
    email: "",
    birthday: "",
    zip: "",
    address: "",

    // STEP2 所属（表示は必要最低限）
    affiliation: "協力会社", // 協力会社 / FC / 個人
    affiliationCompany: "",  // 任意

    // STEP3 車両（あなたの指定に合わせる）
    vehicleType: "",         // 軽バン/軽トラ/幌車/クール車/その他
    plate: "",               // 車両ナンバー（任意）
    blackPlate: "",          // あり/なし/申請中/リース希望

    // STEP4 口座（報酬振込）
    bankName: "",
    branchName: "",
    accountType: "普通",
    accountNumber: "",
    accountNameKana: "",

    // STEP5 画像
    licenseFront: null,
    licenseBack: null
  },
  assets: {
    jpFontReady: false,
    jpFontName: "NotoSansJP"
  }
};

/* ---------- UI helpers ---------- */
const $ = (sel) => document.querySelector(sel);

function toast(msg){
  let t = $(".toast");
  if(!t){
    t = document.createElement("div");
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(()=>t.classList.remove("show"), 1800);
}

function el(tag, attrs={}, children=[]){
  const n = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if(k === "class") n.className = v;
    else if(k === "html") n.innerHTML = v;
    else if(k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v, {passive:false});
    else n.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).filter(Boolean).forEach(c=>{
    if(typeof c === "string") n.appendChild(document.createTextNode(c));
    else n.appendChild(c);
  });
  return n;
}

function field(label, input, hintText){
  return el("div",{class:"field"},[
    el("div",{class:"label"},label),
    input,
    hintText ? el("div",{class:"hint"},hintText) : null
  ]);
}

function inputText(placeholder, value, onInput, opts={}){
  const i = el("input",{
    class:"input",
    placeholder,
    value: value ?? "",
    inputmode: opts.inputmode || "",
    type: opts.type || "text",
    autocomplete: opts.autocomplete || "off",
    oninput: (e)=> onInput(e.target.value)
  });
  return i;
}

function inputDate(value, onInput){
  return el("input",{
    class:"input",
    type:"date",
    value: value ?? "",
    oninput:(e)=>onInput(e.target.value)
  });
}

function selectBox(value, onChange, options){
  const s = el("select",{class:"input", onchange:(e)=>onChange(e.target.value)});
  s.appendChild(el("option",{value:""}, "選択してください"));
  options.forEach(o=>{
    s.appendChild(el("option",{value:o, ...(o===value?{selected:"selected"}:{})}, o));
  });
  return s;
}

function btn(label, kind, handler){
  const b = el("button",{
    class:`btn ${kind}`,
    type:"button",
    onclick:(e)=>{
      e.preventDefault();
      e.stopPropagation();
      handler?.(e);
    },
    ontouchstart:(e)=>{
      // 一部端末でclickが飛ばない対策
      e.preventDefault();
      handler?.(e);
    }
  }, label);
  return b;
}

/* ---------- header/progress ---------- */
function renderShell(content){
  const wrap = el("div",{class:"wrap"},[
    el("div",{class:"header"},[
      el("div",{class:"brand"},[
        el("div",{class:"logoBox"},[
          el("img",{src:OFA_LOGO_URL, alt:"OFA"})
        ]),
        el("div",{},[
          el("div",{class:"brandTitle"},"OFA GROUP"),
          el("div",{class:"brandSub"},"Driver Registration App")
        ])
      ]),
      el("div",{class:"stepPill"},`STEP ${state.step} / ${TOTAL_STEPS}`)
    ]),
    el("div",{class:"progressWrap"},[
      el("div",{class:"progressBar"},[
        el("div",{style:`width:${Math.round((state.step-1)/(TOTAL_STEPS-1)*100)}%`})
      ]),
      el("div",{class:"dots"},
        Array.from({length:TOTAL_STEPS}).map((_,i)=>{
          const idx = i+1;
          return el("div",{class:`dot ${idx===state.step?"active":""}`});
        })
      )
    ]),
    content,
    el("div",{class:"footer"},[
      el("div",{}, "© OFA GROUP"),
      el("div",{}, "One for All, All for One")
    ])
  ]);
  return wrap;
}

function goNext(){
  if(!validateStep(state.step)) return;
  state.step = Math.min(TOTAL_STEPS, state.step+1);
  render();
}
function goBack(){
  state.step = Math.max(1, state.step-1);
  render();
}

/* ---------- validation ---------- */
function validateEmail(s){
  if(!s) return true; // 任意
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}
function validatePhone(s){
  if(!s) return false;
  const t = s.replace(/[^\d+]/g,"");
  return t.length >= 10;
}

function validateStep(step){
  const d = state.data;

  if(step===1){
    if(!d.nameKanji.trim()) return toast("氏名（漢字）を入力してください"), false;
    if(!d.nameKana.trim())  return toast("フリガナを入力してください"), false;
    if(!validatePhone(d.phone)) return toast("電話番号を正しく入力してください"), false;
    if(!validateEmail(d.email)) return toast("メールアドレスを正しく入力してください"), false;

    // 生年月日：任意でもOK（押せない原因になりやすいので）
    // 住所は必須推奨（契約・管理）
    if(!d.address.trim()) return toast("住所を入力してください"), false;

    return true;
  }

  if(step===2){
    // 所属会社名は任意
    if(!d.affiliation) return toast("所属区分を選択してください"), false;
    return true;
  }

  if(step===3){
    if(!d.vehicleType) return toast("車種を選択してください"), false;
    if(!d.blackPlate)  return toast("黒ナンバーを選択してください"), false;
    return true;
  }

  if(step===4){
    if(!d.bankName.trim()) return toast("銀行名を入力してください"), false;
    if(!d.branchName.trim()) return toast("支店名を入力してください"), false;
    if(!d.accountType.trim()) return toast("口座種別を選択してください"), false;
    if(!d.accountNumber.trim()) return toast("口座番号を入力してください"), false;
    if(!d.accountNameKana.trim()) return toast("口座名義（カナ）を入力してください"), false;
    return true;
  }

  if(step===5){
    if(!d.licenseFront) return toast("免許証表（必須）をアップしてください"), false;
    // 裏面は任意
    return true;
  }

  if(step===6){
    return true;
  }

  if(step===7){
    if(!state.agree) return toast("規約に同意してください"), false;
    return true;
  }

  return true;
}

/* ---------- steps ---------- */
function stepCard(badgeText, badgeColorMode, title, desc, bodyNodes, footerButtons){
  const badge = el("div",{class:"badge"},[
    el("i",{style: badgeColorMode==="green" ? "background:var(--gradB)" : ""}),
    badgeText
  ]);

  return el("div",{class:"card"},[
    badge,
    el("h1",{}, title),
    el("p",{class:"desc"}, desc),
    ...bodyNodes,
    footerButtons
  ]);
}

/* STEP1 */
function renderStep1(){
  const d = state.data;

  const body = el("div",{},[
    field("氏名（漢字）", inputText("例）山田 太郎", d.nameKanji, v=>d.nameKanji=v)),
    field("フリガナ", inputText("例）ヤマダ タロウ", d.nameKana, v=>d.nameKana=v)),
    field("電話番号", inputText("090-xxxx-xxxx", d.phone, v=>d.phone=v, {inputmode:"tel"}), "※ハイフンなしでもOK"),
    field("メールアドレス（任意）", inputText("example@gmail.com", d.email, v=>d.email=v, {inputmode:"email"})),
    field("生年月日（任意）", inputDate(d.birthday, v=>d.birthday=v), "※未入力でも進めます"),
    field("郵便番号（任意）", inputText("例）890-0065", d.zip, v=>d.zip=v, {inputmode:"numeric"})),
    field("住所（必須）", inputText("例）鹿児島県鹿児島市〇〇…（番地・建物名まで）", d.address, v=>d.address=v))
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("次へ","primary", goNext)
  ]);

  return stepCard("PROFILE","", "ドライバー基本情報",
    "本登録はドライバーご本人が行ってください。",
    [body],
    buttons
  );
}

/* STEP2 */
function renderStep2(){
  const d = state.data;

  const seg = el("div",{class:"segment"},[
    el("button",{class:d.affiliation==="協力会社"?"active":"", onclick:()=>{d.affiliation="協力会社"; render();}}, "協力会社"),
    el("button",{class:d.affiliation==="FC"?"active":"", onclick:()=>{d.affiliation="FC"; render();}}, "FC"),
    el("button",{class:d.affiliation==="個人"?"active":"", onclick:()=>{d.affiliation="個人"; render();}}, "個人")
  ]);

  const body = el("div",{},[
    el("div",{class:"label"},"所属区分"),
    seg,
    field("所属会社名（任意）", inputText("株式会社〇〇 / 〇〇運送 など", d.affiliationCompany, v=>d.affiliationCompany=v))
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("次へ","primary", goNext)
  ]);

  return stepCard("AFFILIATION","green","所属区分",
    "あなたの所属に近いものを選択してください。",
    [body],
    buttons
  );
}

/* STEP3 */
function renderStep3(){
  const d = state.data;

  const vehicleOpts = ["軽バン","軽トラ","幌車","クール車","その他"];
  const blackOpts = ["あり","なし","申請中","リース希望"];

  const body = el("div",{},[
    field("車種", selectBox(d.vehicleType, v=>d.vehicleType=v, vehicleOpts)),
    field("車両ナンバー（任意）", inputText("例）鹿児島 480 さ 12-34", d.plate, v=>d.plate=v)),
    field("黒ナンバー", selectBox(d.blackPlate, v=>d.blackPlate=v, blackOpts))
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("次へ","primary", goNext)
  ]);

  return stepCard("VEHICLE","", "車両情報",
    "稼働に必要な車両情報を入力してください。",
    [body],
    buttons
  );
}

/* STEP4 */
function renderStep4(){
  const d = state.data;
  const body = el("div",{},[
    field("銀行名", inputText("例）三井住友銀行", d.bankName, v=>d.bankName=v)),
    field("支店名", inputText("例）鹿児島支店", d.branchName, v=>d.branchName=v)),
    field("口座種別", selectBox(d.accountType, v=>d.accountType=v, ["普通","当座"])),
    field("口座番号", inputText("例）1234567", d.accountNumber, v=>d.accountNumber=v, {inputmode:"numeric"})),
    field("口座名義（カナ）", inputText("例）ヤマダ タロウ", d.accountNameKana, v=>d.accountNameKana=v))
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("次へ","primary", goNext)
  ]);

  return stepCard("BANK","green","口座情報",
    "報酬の振込先口座を入力してください。",
    [body],
    buttons
  );
}

/* STEP5 */
function renderStep5(){
  const d = state.data;

  const inputFront = el("input",{type:"file", accept:"image/*", class:"input", onchange: async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    d.licenseFront = await fileToDataURL(f);
    render();
  }});

  const inputBack = el("input",{type:"file", accept:"image/*", class:"input", onchange: async (e)=>{
    const f = e.target.files?.[0];
    if(!f) return;
    d.licenseBack = await fileToDataURL(f);
    render();
  }});

  const grid = el("div",{class:"imageGrid"},[
    el("div",{class:"preview"},[
      el("div",{class:"label", style:"padding:12px 12px 0;"}, "免許証 表面（必須）"),
      d.licenseFront ? el("img",{src:d.licenseFront, alt:"license front"}) : el("div",{style:"padding:12px;"}, "未選択"),
      el("div",{style:"padding:10px 12px 14px;"}, [inputFront])
    ]),
    el("div",{class:"preview"},[
      el("div",{class:"label", style:"padding:12px 12px 0;"}, "免許証 裏面（任意）"),
      d.licenseBack ? el("img",{src:d.licenseBack, alt:"license back"}) : el("div",{style:"padding:12px;"}, "未選択"),
      el("div",{style:"padding:10px 12px 14px;"}, [inputBack])
    ])
  ]);

  const body = el("div",{},[
    el("div",{class:"notice"},
      "※写真は縦長でもOK。PDFでは免許証が見えるように上下の余白をカットして出力します（縮小で読めない問題を防止）。"
    ),
    grid
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("次へ","primary", goNext)
  ]);

  return stepCard("IMAGES","", "提出画像",
    "免許証画像をアップしてください。",
    [body],
    buttons
  );
}

/* STEP6 確認 */
function lineRow(label, value){
  return el("div",{class:"field"},[
    el("div",{class:"label"}, label),
    el("div",{class:"notice"}, value || "—")
  ]);
}
function renderStep6(){
  const d = state.data;
  const body = el("div",{},[
    el("div",{class:"notice"}, "内容を確認し、問題なければ「次へ」へ進んでください。"),
    lineRow("氏名（漢字）", d.nameKanji),
    lineRow("フリガナ", d.nameKana),
    lineRow("電話番号", d.phone),
    lineRow("メールアドレス", d.email || "—"),
    lineRow("生年月日", d.birthday || "—"),
    lineRow("郵便番号", d.zip || "—"),
    lineRow("住所", d.address),
    lineRow("所属区分", d.affiliation),
    lineRow("所属会社名", d.affiliationCompany || "—"),
    lineRow("車種", d.vehicleType),
    lineRow("車両ナンバー", d.plate || "—"),
    lineRow("黒ナンバー", d.blackPlate),
    lineRow("銀行名", d.bankName),
    lineRow("支店名", d.branchName),
    lineRow("口座種別", d.accountType),
    lineRow("口座番号", d.accountNumber),
    lineRow("口座名義（カナ）", d.accountNameKana),
    el("div",{class:"notice"},
      "提出画像：免許証（表/裏）"
    )
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("次へ","primary", goNext)
  ]);

  return stepCard("CONFIRM","green","入力内容の確認",
    "入力内容を最終確認してください。",
    [body],
    buttons
  );
}

/* STEP7 規約 */
function renderStep7(){
  const terms = [
    "内容を確認し、同意して次へ進んでください。",
    "本登録はドライバー本人が行うものとします。",
    "入力内容および提出書類は正確な情報であることを保証してください。",
    "虚申告・不正が判明した場合、登録・契約をお断りする場合があります。",
    "取得した個人情報は、業務連絡・案件調整・法令対応の目的で利用します。",
    "登録後、OFA GROUP担当者より連絡を行い案件を決定します。"
  ];

  const body = el("div",{},[
    el("div",{class:"notice"},
      el("ul",{style:"margin:0;padding-left:18px;line-height:1.8;"},
        terms.map(t=>el("li",{},t))
      )
    ),
    el("div",{class:"checkRow"},[
      el("input",{type:"checkbox", checked: state.agree ? "checked" : null, onchange:(e)=>{state.agree=e.target.checked;}}),
      el("div",{},[
        el("div",{style:"font-weight:900;"},"上記に同意します"),
        el("div",{class:"hint"},"※同意後「次へ」で完了画面へ進みます。")
      ])
    ])
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("次へ","primary", goNext)
  ]);

  return stepCard("TERMS","", "登録規約",
    "同意がないと登録完了できません。",
    [body],
    buttons
  );
}

/* STEP8 完了 */
function renderStep8(){
  const body = el("div",{},[
    el("div",{class:"notice"},
      el("div",{}, "① まず OFAメンバーシップLINE を追加（開く）"),
      el("div",{}, "② 次に 登録PDF を作成"),
      el("div",{}, "③ PDFをLINEへ送信してください")
    ),
    el("div",{class:"btnRow3"},[
      btn("メンバーシップLINE\nを開く","green", ()=>openMembershipLINE()),
      btn("登録PDFを作成","primary", ()=>createPDF()),
      btn("PDFを共有","secondary", ()=>sharePDF())
    ]),
    el("div",{class:"hint", style:"margin-top:10px;line-height:1.6;"},
      "※LINE未追加だと共有先に表示されない場合があります。先にLINE追加 → その後PDF作成 の順番でお願いします。"
    )
  ]);

  const buttons = el("div",{class:"btnRow"},[
    btn("戻る","secondary", goBack),
    btn("最初から","primary", ()=>{state.step=1; render();})
  ]);

  return stepCard("DONE","green","登録完了",
    "登録PDFを作成し、OFAメンバーシップLINEへ送信してください。",
    [body],
    buttons
  );
}

/* ---------- LINE ---------- */
function openMembershipLINE(){
  // LINE内ブラウザ等の対策：window.openはブロックされやすいので location遷移
  try{
    window.location.href = OFA_MEMBERSHIP_LINE_URL;
  }catch(e){
    toast("LINEを開けませんでした。URLを確認してください。");
  }
}

/* ---------- PDF (Japanese) ---------- */
let lastPdfBlob = null;

async function ensureJapaneseFont(){
  if(state.assets.jpFontReady) return true;

  try{
    // フォントを同一オリジンから取得（GitHub Pagesに置く）
    const res = await fetch("./assets/NotoSansJP-Regular.ttf");
    if(!res.ok) throw new Error("font fetch failed");
    const buf = await res.arrayBuffer();
    const b64 = arrayBufferToBase64(buf);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF(); // ここでapi存在チェック

    // jsPDF VFSへ登録
    doc.addFileToVFS("NotoSansJP-Regular.ttf", b64);
    doc.addFont("NotoSansJP-Regular.ttf", state.assets.jpFontName, "normal");

    state.assets.jpFontReady = true;
    return true;
  }catch(e){
    console.error(e);
    toast("日本語フォントが読めません（assets/NotoSansJP-Regular.ttf を配置してください）");
    return false;
  }
}

function arrayBufferToBase64(buffer){
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for(let i=0; i<bytes.length; i+=chunk){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i+chunk));
  }
  return btoa(binary);
}

async function createPDF(){
  const ok = await ensureJapaneseFont();
  if(!ok) return;

  toast("PDF作成中…");

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({orientation:"p", unit:"mm", format:"a4"});
  doc.setFont(state.assets.jpFontName, "normal");

  const d = state.data;

  // レイアウト
  const pageW = 210, pageH = 297;
  const margin = 10;

  // header
  doc.setFontSize(14);
  doc.text("OFA GROUP ドライバー登録シート", margin, 16);

  doc.setFontSize(9);
  const now = new Date();
  const stamp = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
  doc.text(`作成日時：${stamp}`, pageW - margin - 55, 16);
  doc.setTextColor(255,122,0);
  doc.text("One for All, All for One", pageW - margin - 55, 22);
  doc.setTextColor(0,0,0);

  // orange line
  doc.setDrawColor(255,122,0);
  doc.setLineWidth(0.8);
  doc.line(margin, 26, pageW - margin, 26);

  // cards
  const leftX = margin;
  const rightX = pageW/2 + 2;
  const colW = pageW/2 - margin - 2;
  let y = 32;

  const left = [
    ["氏名（漢字）", d.nameKanji],
    ["電話番号", d.phone],
    ["生年月日", d.birthday || "—"],
    ["所属区分", d.affiliation],
    ["車種", d.vehicleType],
    ["黒ナンバー", d.blackPlate],
    ["口座種別", d.accountType],
    ["口座名義（カナ）", d.accountNameKana]
  ];
  const right = [
    ["フリガナ", d.nameKana],
    ["メール", d.email || "—"],
    ["郵便番号", d.zip || "—"],
    ["住所", d.address || "—"],
    ["所属会社名（任意）", d.affiliationCompany || "—"],
    ["車両ナンバー", d.plate || "—"],
    ["銀行", d.bankName],
    ["支店", d.branchName],
    ["口座番号", d.accountNumber]
  ];

  y = drawCardTable(doc, leftX, y, colW, left, 8);
  const y2 = drawCardTable(doc, rightX, 32, colW, right, 8);
  y = Math.max(y, y2) + 6;

  // images title
  doc.setFontSize(11);
  doc.text("提出画像", margin, y + 6);
  y += 10;

  // images area
  const imgW = (pageW - margin*2 - 6) / 2;
  const imgH = 58;

  // 前面（必須）
  if(d.licenseFront){
    const img1 = await dataUrlToImage(d.licenseFront);
    const cropped1 = coverCropToDataURL(img1, imgW, imgH); // 縦長→上下カットで免許証見える
    doc.roundedRect(margin, y, imgW, imgH, 3, 3, "S");
    doc.addImage(cropped1, "JPEG", margin, y, imgW, imgH);
    doc.setFontSize(9);
    doc.text("免許証 表面（必須）", margin, y - 2);
  }else{
    doc.setFontSize(9);
    doc.text("免許証 表面（必須）未提出", margin, y + 8);
  }

  // 裏面（任意）
  if(d.licenseBack){
    const img2 = await dataUrlToImage(d.licenseBack);
    const cropped2 = coverCropToDataURL(img2, imgW, imgH);
    doc.roundedRect(margin + imgW + 6, y, imgW, imgH, 3, 3, "S");
    doc.addImage(cropped2, "JPEG", margin + imgW + 6, y, imgW, imgH);
    doc.setFontSize(9);
    doc.text("免許証 裏面（任意）", margin + imgW + 6, y - 2);
  }else{
    doc.setFontSize(9);
    doc.text("免許証 裏面（任意）未提出", margin + imgW + 6, y + 8);
  }

  // footer note
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text("このPDFを「OFAメンバーシップLINE」へ添付して送信してください。", margin, pageH - 14);
  doc.setTextColor(0);

  // 保存用Blob
  const blob = doc.output("blob");
  lastPdfBlob = blob;

  // 端末によってはダウンロードが確実
  const filename = `OFA_driver_entry_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}_${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}.pdf`;
  doc.save(filename);

  toast("PDFを作成しました");
}

function drawCardTable(doc, x, y, w, rows, fontSize){
  const rowH = 12;
  const pad = 3;
  doc.setFontSize(fontSize);

  rows.forEach(([k,v])=>{
    // box
    doc.setDrawColor(220);
    doc.roundedRect(x, y, w, rowH, 2.5, 2.5, "S");

    // left orange accent
    doc.setDrawColor(255,122,0);
    doc.setLineWidth(1);
    doc.line(x+1.5, y+2, x+1.5, y+rowH-2);
    doc.setLineWidth(0.2);
    doc.setDrawColor(220);

    // text
    doc.setTextColor(90);
    doc.text(String(k), x+pad+3, y+4.8);
    doc.setTextColor(0);

    const val = String(v ?? "—");
    doc.setFontSize(fontSize+1);
    doc.text(truncateText(doc, val, w-10), x+pad+3, y+9.7);
    doc.setFontSize(fontSize);

    y += rowH + 2.5;
  });

  return y;
}

function truncateText(doc, text, maxW){
  // jsPDFで幅を見ながら切る
  let t = text;
  while(doc.getTextWidth(t) > maxW && t.length > 3){
    t = t.slice(0, -2);
  }
  if(t !== text) t += "…";
  return t;
}

function dataUrlToImage(dataUrl){
  return new Promise((resolve,reject)=>{
    const img = new Image();
    img.onload = ()=>resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

/* 画像を“縮小せず”見やすく：coverで上下をカット（免許証が読める） */
function coverCropToDataURL(img, targetWmm, targetHmm){
  // mm→px 変換（適当な解像度）
  const scale = 6; // 1mm = 6px 程度
  const targetW = Math.round(targetWmm*scale);
  const targetH = Math.round(targetHmm*scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  // cover
  const r = Math.max(targetW/iw, targetH/ih);
  const nw = iw*r;
  const nh = ih*r;
  const dx = (targetW - nw)/2;
  const dy = (targetH - nh)/2;

  ctx.fillStyle = "#fff";
  ctx.fillRect(0,0,targetW,targetH);
  ctx.drawImage(img, dx, dy, nw, nh);

  return canvas.toDataURL("image/jpeg", 0.92);
}

async function sharePDF(){
  if(!lastPdfBlob){
    toast("先に「登録PDFを作成」してください");
    return;
  }

  const file = new File([lastPdfBlob], "OFA_driver_entry.pdf", {type:"application/pdf"});

  // Web Share API（Android/一部ブラウザで強い）
  if(navigator.share && navigator.canShare && navigator.canShare({files:[file]})){
    try{
      await navigator.share({
        title:"OFA Driver Entry",
        text:"登録PDFを送信します",
        files:[file]
      });
      toast("共有しました");
      return;
    }catch(e){
      // ユーザーキャンセル等
      console.warn(e);
    }
  }

  // フォールバック：新しいタブで開く
  try{
    const url = URL.createObjectURL(lastPdfBlob);
    window.open(url, "_blank");
    toast("PDFを開きました（共有からLINEへ送信できます）");
  }catch(e){
    toast("共有できませんでした。PDFを作成し、ファイルからLINEへ送ってください。");
  }
}

/* ---------- file -> dataURL ---------- */
function fileToDataURL(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=>resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ---------- main render ---------- */
function render(){
  const app = $("#app");
  app.innerHTML = "";

  let content;
  if(state.step===1) content = renderStep1();
  if(state.step===2) content = renderStep2();
  if(state.step===3) content = renderStep3();
  if(state.step===4) content = renderStep4();
  if(state.step===5) content = renderStep5();
  if(state.step===6) content = renderStep6();
  if(state.step===7) content = renderStep7();
  if(state.step===8) content = renderStep8();

  app.appendChild(renderShell(content));

  // Safari/Chromeで「押せない」対策：スクロールとクリック干渉を減らす
  document.body.style.webkitTouchCallout = "none";
}

window.addEventListener("load", ()=>{
  // ロゴが無い/404でもUI止めない
  render();
});
