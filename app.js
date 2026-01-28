(() => {
  const steps = Array.from(document.querySelectorAll(".step"));
  let cur = 0;

  const stepNo = document.getElementById("stepNo");
  const bar = document.getElementById("bar");
  const dots = document.getElementById("dots");
  const toast = document.getElementById("toast");

  // inputs
  const $ = (id) => document.getElementById(id);

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
  const affCompany = $("affCompany");

  const carType = $("carType");
  const carNo = $("carNo");
  const blackNo = $("blackNo");

  const bank = $("bank");
  const branch = $("branch"); // ← 入力は残してる（必要なら後で消してOK）
  const accType = $("accType");
  const accNo = $("accNo");
  const accNameKana = $("accNameKana");

  const licF = $("licF");
  const licB = $("licB");
  const prevF = $("prevF");
  const prevB = $("prevB");

  const agree = $("agree");

  const pdfBtn = $("pdfBtn");
  const restart = $("restart");

  // PDF hidden nodes
  const pdfPaper = $("pdfPaper");
  const pdfGrid = $("pdfGrid");
  const pdfDate = $("pdfDate");
  const pdfImgF = $("pdfImgF");
  const pdfImgB = $("pdfImgB");

  // -------- UI: dots ----------
  function renderDots() {
    dots.innerHTML = "";
    for (let i = 0; i < 8; i++) {
      const d = document.createElement("div");
      d.className = "d" + (i === cur ? " on" : "");
      dots.appendChild(d);
    }
  }

  function show() {
    steps.forEach((s) => s.classList.remove("active"));
    steps[cur].classList.add("active");

    stepNo.textContent = String(cur + 1);
    bar.style.width = ((cur + 1) / 8) * 100 + "%";
    renderDots();

    // topへスクロール
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // -------- helpers ----------
  function toastShow(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function cleanPhone(v) {
    return (v || "").replace(/[^\d+]/g, "");
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || "");
  }

  function need(v) {
    return (v || "").trim().length > 0;
  }

  // -------- validation per step ----------
  function validateStep(stepIndex) {
    const s = stepIndex + 1;

    if (s === 1) {
      if (!need(name.value)) return alert("氏名（漢字）を入力してください"), false;
      if (!need(kana.value)) return alert("フリガナを入力してください"), false;
      if (!need(phone.value)) return alert("電話番号を入力してください"), false;
      if (!isEmail(email.value)) return alert("メールアドレスが正しくありません"), false;
      if (!need(birth.value)) return alert("生年月日を入力してください"), false;
    }

    if (s === 2) {
      if (!need(pref.value)) return alert("都道府県を入力してください"), false;
      if (!need(city.value)) return alert("市区町村を入力してください"), false;
      if (!need(addr1.value)) return alert("番地を入力してください"), false;
    }

    if (s === 4) {
      if (!need(carType.value)) return alert("車種を選択してください"), false;
      if (!need(carNo.value)) return alert("車両ナンバーを入力してください"), false;
      if (!need(blackNo.value)) return alert("黒ナンバーを選択してください"), false;
    }

    if (s === 5) {
      if (!need(bank.value)) return alert("銀行を入力してください"), false;
      if (!need(accType.value)) return alert("口座種別を選択してください"), false;
      if (!need(accNo.value)) return alert("口座番号を入力してください"), false;
      if (!need(accNameKana.value)) return alert("口座名義（カナ）を入力してください"), false;
    }

    if (s === 6) {
      if (!licF.files?.[0]) return alert("免許証 表面（必須）をアップロードしてください"), false;
    }

    if (s === 7) {
      if (!agree.checked) return alert("同意が必要です"), false;
    }

    return true;
  }

  function goNext() {
    if (!validateStep(cur)) return;
    if (cur < 7) cur++;
    show();
  }

  function goBack() {
    if (cur > 0) cur--;
    show();
  }

  // -------- button wiring（各STEPごとに） ----------
  // STEP1
  $("next").addEventListener("click", (e) => { e.preventDefault(); goNext(); });
  $("back").addEventListener("click", (e) => { e.preventDefault(); goBack(); });

  // STEP2
  $("next2").addEventListener("click", (e) => { e.preventDefault(); goNext(); });
  $("back2").addEventListener("click", (e) => { e.preventDefault(); goBack(); });

  // STEP3
  $("next3").addEventListener("click", (e) => { e.preventDefault(); goNext(); });
  $("back3").addEventListener("click", (e) => { e.preventDefault(); goBack(); });

  // STEP4
  $("next4").addEventListener("click", (e) => { e.preventDefault(); goNext(); });
  $("back4").addEventListener("click", (e) => { e.preventDefault(); goBack(); });

  // STEP5
  $("next5").addEventListener("click", (e) => { e.preventDefault(); goNext(); });
  $("back5").addEventListener("click", (e) => { e.preventDefault(); goBack(); });

  // STEP6
  $("next6").addEventListener("click", (e) => { e.preventDefault(); goNext(); });
  $("back6").addEventListener("click", (e) => { e.preventDefault(); goBack(); });

  // STEP7
  $("next7").addEventListener("click", (e) => { e.preventDefault(); goNext(); });
  $("back7").addEventListener("click", (e) => { e.preventDefault(); goBack(); });

  // STEP8
  $("back8").addEventListener("click", (e) => { e.preventDefault(); goBack(); });
  restart.addEventListener("click", () => { cur = 0; show(); });

  // -------- affiliation buttons ----------
  document.querySelectorAll(".segBtn").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".segBtn").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      aff.value = b.dataset.val || "";
    });
  });

  // -------- preview ----------
  function setPreview(file, imgEl) {
    if (!file) {
      imgEl.style.display = "none";
      imgEl.removeAttribute("src");
      return;
    }
    const url = URL.createObjectURL(file);
    imgEl.src = url;
    imgEl.style.display = "block";
    imgEl.onload = () => URL.revokeObjectURL(url);
  }

  licF.addEventListener("change", () => setPreview(licF.files?.[0], prevF));
  licB.addEventListener("change", () => setPreview(licB.files?.[0], prevB));

  // -------- PDF: 免許証「上下余白だけ」自動カット ----------
  async function cropTopBottomOnly(file){
    const img = await fileToImage(file);
    const { canvas, ctx } = makeCanvas(img.naturalWidth, img.naturalHeight);
    ctx.drawImage(img, 0, 0);

    const w = canvas.width;
    const h = canvas.height;

    const isBg = (r,g,b,a) => a < 20 || (r > 235 && g > 235 && b > 235);

    const data = ctx.getImageData(0,0,w,h).data;

    const rowHasContent = (y) => {
      let cnt = 0;
      const threshold = Math.max(30, Math.floor(w * 0.02));
      for(let x=0; x<w; x++){
        const i = (y*w + x) * 4;
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if(!isBg(r,g,b,a)) cnt++;
        if(cnt > threshold) return true;
      }
      return false;
    };

    let top = 0;
    while(top < h-1 && !rowHasContent(top)) top++;

    let bottom = h-1;
    while(bottom > 0 && !rowHasContent(bottom)) bottom--;

    const margin = Math.floor(h * 0.02);
    top = Math.max(0, top - margin);
    bottom = Math.min(h-1, bottom + margin);

    const cropH = Math.max(1, bottom - top + 1);
    if(cropH < h * 0.4){
      return await fileToDataURL(file);
    }

    const out = document.createElement("canvas");
    out.width = w;
    out.height = cropH;
    const octx = out.getContext("2d");
    octx.drawImage(canvas, 0, top, w, cropH, 0, 0, w, cropH);

    return out.toDataURL("image/jpeg", 0.92);
  }

  function makeCanvas(w,h){
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    return { canvas:c, ctx:c.getContext("2d") };
  }
  function fileToImage(file){
    return new Promise((res, rej)=>{
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = ()=>{ URL.revokeObjectURL(url); res(img); };
      img.onerror = (e)=>{ URL.revokeObjectURL(url); rej(e); };
      img.src = url;
    });
  }
  function fileToDataURL(file){
    return new Promise((res, rej)=>{
      const r = new FileReader();
      r.onload = ()=>res(r.result);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // -------- PDF build helpers ----------
  function pdfItem(label, value){
    const div = document.createElement("div");
    div.className = "pdfItem";
    div.innerHTML = `<div class="pdfLabel">${escapeHtml(label)}</div><div class="pdfValue">${escapeHtml(value || "")}</div>`;
    return div;
  }

  function escapeHtml(s){
    return String(s ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function makeDateStr(){
    const d = new Date();
    const pad = (n)=> String(n).padStart(2,"0");
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function makePdfAndOpen(){
    // 1) PDF用DOMを埋める
    pdfDate.textContent = "作成日時： " + makeDateStr();

    pdfGrid.innerHTML = "";

    // ★支店いらない → PDFには出さない（入力欄は残してるが出力しない）
    const items = [
      ["氏名（漢字）", name.value],
      ["フリガナ", kana.value],
      ["電話番号", cleanPhone(phone.value)],
      ["メール", email.value],
      ["生年月日", birth.value],
      ["住所", `${zip.value ? zip.value + " " : ""}${pref.value}${city.value}${addr1.value}${addr2.value ? " " + addr2.value : ""}`],
      ["所属区分", aff.value],                // 表示いらないと言ってたので、必要ならここを消してOK
      ["所属会社名（任意）", affCompany.value],
      ["車種", carType.value],
      ["車両ナンバー", carNo.value],
      ["黒ナンバー", blackNo.value],
      ["銀行", bank.value],
      ["口座種別", accType.value],
      ["口座番号", accNo.value],
      ["口座名義（カナ）", accNameKana.value],
    ];

    items.forEach(([l,v]) => pdfGrid.appendChild(pdfItem(l,v)));

    // 免許証画像：上下余白だけカットして “縮小で読めない” を防ぐ
    if(licF.files?.[0]) pdfImgF.src = await cropTopBottomOnly(licF.files[0]);
    else pdfImgF.removeAttribute("src");

    if(licB.files?.[0]) pdfImgB.src = await cropTopBottomOnly(licB.files[0]);
    else pdfImgB.removeAttribute("src");

    // 2) html2canvas → jsPDF
    const { jsPDF } = window.jspdf;

    const canvas = await html2canvas(pdfPaper, {
      scale: 2,          // 文字と免許証をくっきり
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // canvas(px)→PDF(mm) fit
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    let y = 0;
    if (imgH <= pageH) {
      pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH, "", "FAST");
    } else {
      // 複数ページ対応
      let remaining = imgH;
      let position = 0;
      while (remaining > 0) {
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH, "", "FAST");
        remaining -= pageH;
        if (remaining > 0) {
          pdf.addPage();
          position -= pageH;
        }
      }
    }

    // 3) 端末差対策：blob URL で新しいタブに開く（Safari/Chrome）
    const blob = pdf.output("blob");
    const blobUrl = URL.createObjectURL(blob);

    // まずは“開く”を優先（印刷・共有が同じボタンに乗る）
    window.open(blobUrl, "_blank");

    // ついでにDLも試みる（出ない端末は開くだけになる）
    try{
      pdf.save(`OFA_driver_entry_${makeDateStr().replace(/[\/: ]/g,"")}.pdf`);
    }catch(e){}

    toastShow("PDFを開きました（保存・共有・印刷OK）");
  }

  // PDFボタン
  pdfBtn.addEventListener("click", async () => {
    // STEP8で押された前提だけど、念のため最終チェック
    if (!licF.files?.[0]) return alert("免許証 表面（必須）がありません");
    await makePdfAndOpen();
  });

  // 初期表示
  show();
})();
