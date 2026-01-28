/* =========================
   CONFIG
========================= */
const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/8x437Vt";

/* =========================
   ELEMENTS
========================= */
const steps = Array.from(document.querySelectorAll(".step"));
let cur = 0;

const stepNo = document.getElementById("stepNo");
const bar = document.getElementById("bar");
const dots = document.getElementById("dots");
const toast = document.getElementById("toast");

const $ = (id) => document.getElementById(id);

/* inputs */
const name = $("name");
const kana = $("kana");
const phone = $("phone");
const email = $("email");
const birth = $("birth");

const zip = $("zip");
const pref = $("pref");
const city = $("city");
const addr1 = $("addr1");
const addr2 = $("addr2");

const aff = $("aff");
const company = $("company");

const carType = $("carType");
const carNo = $("carNo");
const black = $("black");

const bank = $("bank");
const branch = $("branch");
const acctType = $("acctType");
const acctNo = $("acctNo");
const acctName = $("acctName");

const licF = $("licF");
const licB = $("licB");
const prevF = $("prevF");
const prevB = $("prevB");

const agree = $("agree");

/* done */
const lineBtn = $("lineBtn");
const pdfBtn = $("pdfBtn");
const restartBtn = $("restartBtn");
const finishBtn = $("finishBtn");

/* pdf paper */
const pdfPaper = $("pdfPaper");
const pdfGrid = $("pdfGrid");
const pdfDate = $("pdfDate");
const pdfImgF = $("pdfImgF");
const pdfImgB = $("pdfImgB");

/* =========================
   INIT UI
========================= */
function buildDots(){
  dots.innerHTML = "";
  for(let i=0;i<8;i++){
    const d = document.createElement("div");
    d.className = "d" + (i===0 ? " on" : "");
    dots.appendChild(d);
  }
}
buildDots();

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 1200);
}

function show(){
  steps.forEach(s => s.classList.remove("active"));
  steps[cur].classList.add("active");

  stepNo.textContent = String(cur + 1);
  bar.style.width = ((cur+1)/8*100) + "%";

  const ds = Array.from(dots.children);
  ds.forEach((d,i)=> d.classList.toggle("on", i===cur));
}

/* =========================
   VALIDATION
========================= */
function val(v){ return (v || "").toString().trim(); }

function requireStep(stepIndex){
  // stepIndex: 0-based
  if(stepIndex === 0){
    if(!val(name.value)) return "氏名を入力してください";
    if(!val(kana.value)) return "フリガナを入力してください";
    if(!val(phone.value)) return "電話番号を入力してください";
    if(!val(email.value)) return "メールアドレスを入力してください";
    if(!val(birth.value)) return "生年月日を入力してください";
  }
  if(stepIndex === 1){
    if(!val(zip.value)) return "郵便番号を入力してください";
    if(!val(pref.value)) return "都道府県を入力してください";
    if(!val(city.value)) return "市区町村を入力してください";
    if(!val(addr1.value)) return "番地を入力してください";
  }
  if(stepIndex === 2){
    if(!val(aff.value)) return "所属区分を選択してください";
  }
  if(stepIndex === 3){
    if(!val(carType.value)) return "車種を選択してください";
    if(!val(carNo.value)) return "車両ナンバーを入力してください";
    if(!val(black.value)) return "黒ナンバーを選択してください";
  }
  if(stepIndex === 4){
    if(!val(bank.value)) return "銀行を入力してください";
    if(!val(branch.value)) return "支店を入力してください";
    if(!val(acctType.value)) return "口座種別を選択してください";
    if(!val(acctNo.value)) return "口座番号を入力してください";
    if(!val(acctName.value)) return "口座名義（カナ）を入力してください";
  }
  if(stepIndex === 5){
    if(!licF.files || !licF.files[0]) return "免許証（表面）の画像をアップロードしてください";
  }
  if(stepIndex === 6){
    if(!agree.checked) return "同意が必要です";
  }
  return "";
}

/* =========================
   NAV BUTTONS
========================= */
function goNext(){
  const err = requireStep(cur);
  if(err){
    alert(err);
    return;
  }
  if(cur < 7){
    cur++;
    show();
  }
}
function goBack(){
  if(cur > 0){
    cur--;
    show();
  }
}

for(let i=1;i<=8;i++){
  const b = $("back"+i);
  if(b) b.addEventListener("click", goBack);
  const n = $("next"+i);
  if(n) n.addEventListener("click", goNext);
}

/* =========================
   AFF BUTTONS
========================= */
document.querySelectorAll(".segBtn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".segBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    aff.value = btn.dataset.val || "";
  });
});

/* =========================
   PREVIEW
========================= */
function setPreview(file, imgEl){
  if(!file){
    imgEl.style.display = "none";
    imgEl.src = "";
    return;
  }
  const url = URL.createObjectURL(file);
  imgEl.src = url;
  imgEl.style.display = "block";
}

licF.addEventListener("change", ()=> setPreview(licF.files[0], prevF));
licB.addEventListener("change", ()=> setPreview(licB.files[0], prevB));

/* =========================
   DONE ACTIONS
========================= */
lineBtn.href = OFA_MEMBERSHIP_LINE_URL;

/* PDF: “開く”＝Safari/Chromeの共有/印刷導線がそのまま使える */
async function makePdfAndOpen(){
  try{
    pdfBtn.disabled = true;
    pdfBtn.textContent = "PDF作成中…";

    // PDF用の内容を組み立て
    pdfDate.textContent = new Date().toLocaleString("ja-JP");

    const items = [
      ["氏名（漢字）", val(name.value)],
      ["フリガナ", val(kana.value)],
      ["電話番号", val(phone.value)],
      ["メール", val(email.value)],
      ["生年月日", val(birth.value)],
      ["住所", `${val(zip.value)} ${val(pref.value)}${val(city.value)}${val(addr1.value)} ${val(addr2.value)}`.trim()],
      ["所属区分", val(aff.value)],
      ["所属会社名（任意）", val(company.value)],
      ["車種", val(carType.value)],
      ["車両ナンバー", val(carNo.value)],
      ["黒ナンバー", val(black.value)],
      ["銀行", val(bank.value)],
      ["支店", val(branch.value)],
      ["口座種別", val(acctType.value)],
      ["口座番号", val(acctNo.value)],
      ["口座名義（カナ）", val(acctName.value)]
    ];

    pdfGrid.innerHTML = items.map(([k,v])=>`
      <div class="pdfItem">
        <div class="pdfLabel">${k}</div>
        <div class="pdfValue">${(v || "").replaceAll("<","&lt;").replaceAll(">","&gt;")}</div>
      </div>
    `).join("");

    // 画像はobject-fit:coverで上下余白を自動カット（PDF側CSSで設定済み）
    if(licF.files[0]) pdfImgF.src = URL.createObjectURL(licF.files[0]);
    else pdfImgF.removeAttribute("src");

    if(licB.files[0]) pdfImgB.src = URL.createObjectURL(licB.files[0]);
    else pdfImgB.removeAttribute("src");

    // 画像の読み込み待ち
    await waitImagesLoaded([pdfImgF, pdfImgB]);

    // html2canvas → jsPDF
    const canvas = await html2canvas(pdfPaper, {
      scale: 2,                // 高精細
      backgroundColor: "#ffffff",
      useCORS: true
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p","mm","a4");

    const pageW = 210, pageH = 297;
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 0;
    // 1枚で収まらない時はページ分割
    if(imgH <= pageH){
      pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH, "", "FAST");
    }else{
      let remaining = imgH;
      let pos = 0;
      while(remaining > 0){
        pdf.addImage(imgData, "JPEG", 0, pos, imgW, imgH, "", "FAST");
        remaining -= pageH;
        pos -= pageH;
        if(remaining > 0) pdf.addPage();
      }
    }

    const fileName = `OFA_driver_entry_${stamp()}.pdf`;

    // ★重要：iPhoneで「出ない」対策 → blobURLを新規タブで開く
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);

    // 新規タブで開く（Safari/Chromeの共有/印刷が使える）
    const w = window.open(blobUrl, "_blank");
    if(!w){
      // ポップアップブロック等の時は保存
      pdf.save(fileName);
      showToast("PDFを保存しました");
      return;
    }

    // ついでにダウンロードもできるように（端末によっては必要）
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    showToast("PDFを作成しました（共有/印刷OK）");
  }catch(e){
    console.error(e);
    alert("PDF作成に失敗しました。Safari/Chromeで開き直して再度お試しください。");
  }finally{
    pdfBtn.disabled = false;
    pdfBtn.textContent = "PDF作成";
  }
}

function stamp(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,"0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function waitImagesLoaded(imgEls){
  return Promise.all(imgEls.map(img=>{
    return new Promise(res=>{
      if(!img || !img.getAttribute("src")) return res();
      if(img.complete) return res();
      img.onload = ()=>res();
      img.onerror = ()=>res();
    });
  }));
}

pdfBtn.addEventListener("click", async ()=>{
  // 完了画面は「LINE→PDF」導線
  // PDFはいつでも作れるが、LINE未追加だと共有に出ない事があるので案内を強める
  if(!confirm("先にOFAメンバーシップLINEを追加しましたか？\n（未追加だと共有先にLINEが出ない場合があります）")){
    // 追加してないならLINEへ
    window.open(OFA_MEMBERSHIP_LINE_URL, "_blank");
    return;
  }
  await makePdfAndOpen();
});

restartBtn.addEventListener("click", ()=>{
  // reset
  steps.forEach(s=>s.classList.remove("active"));
  cur = 0;

  // clear inputs
  [name,kana,phone,email,birth,zip,pref,city,addr1,addr2,company,carNo,bank,branch,acctNo,acctName].forEach(i=> i.value="");
  carType.value = "";
  black.value = "";
  acctType.value = "";
  aff.value = "";
  agree.checked = false;

  // seg UI reset
  document.querySelectorAll(".segBtn").forEach(b=>b.classList.remove("active"));

  // files reset
  licF.value = "";
  licB.value = "";
  setPreview(null, prevF);
  setPreview(null, prevB);

  show();
});

finishBtn.addEventListener("click", ()=>{
  showToast("完了しました");
});

/* =========================
   FIX: “次へ行けない”対策
   - ボタンは全て type=button
   - step遷移は goNext/goBack で統一
========================= */

show();
