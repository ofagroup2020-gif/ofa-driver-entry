/* OFA Driver Entry - Full Version
   - iOS Safari / Android Chrome / LINEブラウザ クリック反応改善
   - PDFは「HTML→Canvas→画像PDF」方式（日本語文字化けしない）
   - 免許証写真は縦長でも上下余白を中心クロップして「免許証が見える」ように出力
   - パスは ./ で統一（GitHub Pages /ofa-driver-entry/ 対応）
*/
(() => {
  const TOTAL = 8;
  let step = 1;
  let pdfBlob = null;
  let pdfFileName = null;

  const LINE_URL = "https://lin.ee/8x437Vt";

  const $ = (id) => document.getElementById(id);

  const els = {
    stepLabel: $("stepLabel"),
    progressFill: $("progressFill"),
    progressDots: $("progressDots"),
    toast: $("toast"),

    // steps nav
    next1: $("next1"), back1: $("back1"),
    next2: $("next2"), back2: $("back2"),
    next3: $("next3"), back3: $("back3"),
    next4: $("next4"), back4: $("back4"),
    next5: $("next5"), back5: $("back5"),
    next6: $("next6"), back6: $("back6"),
    next7: $("next7"), back7: $("back7"),
    back8: $("back8"), restartBtn: $("restartBtn"),

    // done
    openLineBtn: $("openLineBtn"),
    makePdfBtn: $("makePdfBtn"),
    sharePdfBtn: $("sharePdfBtn"),

    // uploads
    licFront: $("licFront"),
    licBack: $("licBack"),
    licFrontPreview: $("licFrontPreview"),
    licBackPreview: $("licBackPreview"),

    // pdf template
    pdfSheet: $("pdfSheet"),
    pdfGrid: $("pdfGrid"),
    pdfDate: $("pdfDate"),
    pdfLicFront: $("pdfLicFront"),
    pdfLicBack: $("pdfLicBack"),
  };

  // ---------- Utils ----------
  function toast(msg, ms=2200){
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { els.toast.hidden = true; }, ms);
  }

  function normalizePhone(v){
    return (v || "").replace(/[^\d+]/g, "");
  }
  function normalizeZip(v){
    return (v || "").replace(/[^\d]/g, "");
  }

  function isValidEmail(v){
    if(!v) return true; // optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function requiredFilled(ids){
    for(const id of ids){
      const el = $(id);
      if(!el) continue;
      if(el.type === "checkbox"){
        if(!el.checked) return false;
      } else {
        const v = (el.value || "").trim();
        if(!v) return false;
      }
    }
    return true;
  }

  function showStep(n){
    step = Math.min(Math.max(1, n), TOTAL);

    document.querySelectorAll(".step").forEach(sec => {
      const s = Number(sec.getAttribute("data-step"));
      sec.hidden = (s !== step);
    });

    els.stepLabel.textContent = `STEP ${step} / ${TOTAL}`;
    const pct = Math.round((step / TOTAL) * 100);
    els.progressFill.style.width = `${pct}%`;

    // dots
    els.progressDots.innerHTML = "";
    for(let i=1;i<=TOTAL;i++){
      const d = document.createElement("div");
      d.className = "dot2" + (i===step ? " active":"");
      els.progressDots.appendChild(d);
    }

    // DONE: reset share button state display
    if(step !== 8){
      // nothing
    }
  }

  // iOS/Android click reliable (touchend + click)
  function bindTap(el, handler){
    if(!el) return;
    const wrapped = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      handler(ev);
    };
    el.addEventListener("click", wrapped, { passive:false });
    el.addEventListener("touchend", wrapped, { passive:false });
  }

  function scrollTopCard(){
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ---------- Validation per step ----------
  function validateStep(n){
    if(n===1){
      const ok = requiredFilled(["nameKanji","nameKana","phone","birthday"]);
      if(!ok){ toast("必須項目を入力してください"); return false; }
      const phone = normalizePhone($("phone").value);
      if(phone.length < 10){ toast("電話番号を確認してください"); return false; }
      const email = $("email").value.trim();
      if(!isValidEmail(email)){ toast("メールアドレス形式が不正です"); return false; }
      return true;
    }
    if(n===2){
      const ok = requiredFilled(["zip","pref","city","addr1"]);
      if(!ok){ toast("住所の必須項目を入力してください"); return false; }
      const zip = normalizeZip($("zip").value);
      if(zip.length !== 7){ toast("郵便番号は7桁で入力してください"); return false; }
      return true;
    }
    if(n===3){
      const ok = requiredFilled(["affType"]);
      if(!ok){ toast("所属区分を選択してください"); return false; }
      return true;
    }
    if(n===4){
      const ok = requiredFilled(["vehicleType","vehicleNumber","blackPlate"]);
      if(!ok){ toast("車両情報の必須項目を入力してください"); return false; }
      return true;
    }
    if(n===5){
      const ok = requiredFilled(["bankName","bankBranch","accountType","accountNumber","accountNameKana"]);
      if(!ok){ toast("口座情報の必須項目を入力してください"); return false; }
      const acc = ($("accountNumber").value || "").replace(/[^\d]/g,"");
      if(acc.length < 6){ toast("口座番号を確認してください"); return false; }
      return true;
    }
    if(n===6){
      // license front required
      if(!els.licFront._dataUrl){
        toast("免許証 表面（必須）をアップロードしてください");
        return false;
      }
      return true;
    }
    if(n===7){
      if(!$("agree").checked){
        toast("同意にチェックしてください");
        return false;
      }
      return true;
    }
    return true;
  }

  // ---------- File handling ----------
  function readImageFile(file){
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  }

  async function handleUpload(inputEl, previewEl, storeKey){
    const f = inputEl.files && inputEl.files[0];
    if(!f) return;

    const dataUrl = await readImageFile(f);
    previewEl.src = dataUrl;
    previewEl.style.display = "block";
    inputEl._dataUrl = dataUrl;
    inputEl._fileName = f.name;

    // store for pdf
    if(storeKey === "front") els.licFront._dataUrl = dataUrl;
    if(storeKey === "back") els.licBack._dataUrl = dataUrl;

    toast("画像を読み込みました");
  }

  // ---------- PDF build (image-based to keep Japanese) ----------
  function buildPdfGridData(){
    const phone = normalizePhone($("phone").value);
    const zip = normalizeZip($("zip").value);

    const addr = `${zip} ${$("pref").value}${$("city").value}${$("addr1").value}${$("addr2").value ? " " + $("addr2").value : ""}`;

    // “削除ゼロ”項目（固定）
    return [
      ["氏名（漢字）", $("nameKanji").value],
      ["フリガナ", $("nameKana").value],
      ["電話番号", phone],
      ["メール", $("email").value || "-"],
      ["生年月日", $("birthday").value || "-"],
      ["住所", addr],
      ["所属区分", $("affType").value],
      ["所属会社名（任意）", $("affCompany").value || "-"],
      ["車種", $("vehicleType").value],
      ["車両ナンバー", $("vehicleNumber").value],
      ["黒ナンバー", $("blackPlate").value],
      ["銀行", $("bankName").value],
      ["銀行支店", $("bankBranch").value],
      ["口座種別", $("accountType").value],
      ["口座番号", $("accountNumber").value],
      ["口座名義（カナ）", $("accountNameKana").value],
      ["備考", ($("note").value || "-")],
    ];
  }

  function setPdfImages(){
    // PDF表示用IMG
    els.pdfLicFront.src = els.licFront._dataUrl || "";
    els.pdfLicBack.src  = els.licBack._dataUrl || "";
  }

  function renderPdfGrid(){
    const data = buildPdfGridData();
    els.pdfGrid.innerHTML = "";
    for(const [k,v] of data){
      const item = document.createElement("div");
      item.className = "pdfItem";
      item.innerHTML = `<div class="pdfKey">${escapeHtml(k)}</div><div class="pdfVal">${escapeHtml(v || "-")}</div>`;
      els.pdfGrid.appendChild(item);
    }
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  // 免許証 “縦長写真の上下余白” を中心クロップしてカードが読めるようにする
  async function applyLicenseCropForPdf(){
    // 目標アスペクト：免許証（横長）に寄せる（約 1.58）
    const TARGET_ASPECT = 1.58;

    async function crop(dataUrl){
      if(!dataUrl) return "";
      const img = new Image();
      img.src = dataUrl;
      await img.decode();

      const sw = img.naturalWidth;
      const sh = img.naturalHeight;

      // source crop rectangle
      let sx=0, sy=0, sW=sw, sH=sh;
      const srcAspect = sw / sh;

      if(srcAspect > TARGET_ASPECT){
        // too wide -> crop left/right
        sW = Math.round(sh * TARGET_ASPECT);
        sx = Math.round((sw - sW) / 2);
      } else {
        // too tall -> crop top/bottom (まさにこれが欲しい)
        sH = Math.round(sw / TARGET_ASPECT);
        sy = Math.round((sh - sH) / 2);
      }

      const canvas = document.createElement("canvas");
      canvas.width = 1400; // high-res output
      canvas.height = Math.round(canvas.width / TARGET_ASPECT);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sW, sH, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.92);
    }

    // front/back
    const frontC = await crop(els.licFront._dataUrl);
    const backC  = await crop(els.licBack._dataUrl);

    if(frontC) els.pdfLicFront.src = frontC;
    if(backC)  els.pdfLicBack.src  = backC;
  }

  async function makePdf(){
    if(!window.html2canvas || !window.jspdf){
      toast("PDFライブラリの読み込み中です。少し待って再試行してください。", 2600);
      return;
    }

    // PDF template update
    const now = new Date();
    const pad = (n)=>String(n).padStart(2,"0");
    const stamp = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    els.pdfDate.textContent = `作成日時：${stamp}`;

    renderPdfGrid();
    setPdfImages();

    // important: crop vertical whitespace to show license readable
    await applyLicenseCropForPdf();

    // render to canvas
    toast("PDF作成中…");

    const sheet = els.pdfSheet;
    sheet.style.left = "0px";
    sheet.style.top = "0px";

    // give layout time
    await new Promise(r => setTimeout(r, 60));

    const canvas = await window.html2canvas(sheet, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    // back offscreen
    sheet.style.left = "-9999px";
    sheet.style.top = "-9999px";

    const imgData = canvas.toDataURL("image/jpeg", 0.92);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // fit image to page
    const imgW = pageW;
    const imgH = (canvas.height / canvas.width) * imgW;

    if(imgH <= pageH){
      pdf.addImage(imgData, "JPEG", 0, 0, imgW, imgH);
    } else {
      // multipage slice
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
    }

    const safeName = ($("nameKanji").value || "driver").replace(/[\\\/:*?"<>|]/g,"_");
    pdfFileName = `OFA_driver_entry_${safeName}_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.pdf`;

    pdfBlob = pdf.output("blob");

    // enable share
    els.sharePdfBtn.disabled = false;

    // auto download
    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = pdfFileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast("PDFを作成しました（ダウンロード開始）");
  }

  async function sharePdf(){
    if(!pdfBlob){
      toast("先に「登録PDFを作成」してください");
      return;
    }

    const file = new File([pdfBlob], pdfFileName || "OFA_driver_entry.pdf", { type: "application/pdf" });

    // Web Share API
    if(navigator.share && navigator.canShare && navigator.canShare({ files:[file] })){
      try{
        await navigator.share({
          title: "OFA 登録PDF",
          text: "OFAメンバーシップLINEへ送信してください。",
          files: [file],
        });
        toast("共有画面を開きました");
        return;
      }catch(e){
        toast("共有をキャンセルしました");
        return;
      }
    }

    // Fallback
    toast("共有に非対応の端末です。PDFを保存→LINEで添付してください", 3200);
  }

  // ---------- Navigation wiring ----------
  function goNext(){
    if(!validateStep(step)) return;
    showStep(step + 1);
    scrollTopCard();
  }
  function goBack(){
    showStep(step - 1);
    scrollTopCard();
  }

  // bind all nav buttons
  const nextButtons = [els.next1,els.next2,els.next3,els.next4,els.next5,els.next6,els.next7];
  nextButtons.forEach(b => bindTap(b, goNext));
  [els.back2,els.back3,els.back4,els.back5,els.back6,els.back7,els.back8].forEach(b => bindTap(b, goBack));

  bindTap(els.restartBtn, () => { pdfBlob=null; pdfFileName=null; els.sharePdfBtn.disabled=true; showStep(1); scrollTopCard(); });

  bindTap(els.openLineBtn, () => {
    // open new tab / same tab depending on in-app
    window.location.href = LINE_URL;
  });

  bindTap(els.makePdfBtn, async () => {
    // PDFは STEP8 で作成する（先に同意まで済んでる前提）
    await makePdf();
  });

  bindTap(els.sharePdfBtn, async () => {
    await sharePdf();
  });

  // ---------- uploads ----------
  els.licFront.addEventListener("change", () => handleUpload(els.licFront, els.licFrontPreview, "front"));
  els.licBack.addEventListener("change", () => handleUpload(els.licBack, els.licBackPreview, "back"));

  // ---------- improve Safari "次へ押せない" 対策 ----------
  // 入力中に iOS がフォーカス残ってクリック無視するケースがあるので
  // 次へ押下時に必ず blur してから進む
  nextButtons.forEach(btn => {
    if(!btn) return;
    btn.addEventListener("click", () => {
      const ae = document.activeElement;
      if(ae && typeof ae.blur === "function") ae.blur();
    });
    btn.addEventListener("touchend", () => {
      const ae = document.activeElement;
      if(ae && typeof ae.blur === "function") ae.blur();
    });
  });

  // normalize on input
  $("phone").addEventListener("input", (e)=> { e.target.value = normalizePhone(e.target.value); });
  $("zip").addEventListener("input", (e)=> { e.target.value = normalizeZip(e.target.value); });
  $("accountNumber").addEventListener("input", (e)=> { e.target.value = (e.target.value||"").replace(/[^\d]/g,""); });

  // initialize
  showStep(1);

  // ---------- Service Worker (optional) ----------
  if("serviceWorker" in navigator){
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(()=>{});
    });
  }
})();
