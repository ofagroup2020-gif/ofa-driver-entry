// ================================
// OFA GROUP Driver Registration App
// GitHub Pages 完結版（Render不要）
// PDF：日本語フォント埋め込み + 免許証画像入り
// ================================

const LINE_MEMBERSHIP_URL = "https://lin.ee/Ev7r84H5";
const FONT_URL = "./assets/NotoSansJP-Regular.ttf";

document.addEventListener("DOMContentLoaded", () => {
  const steps = [...document.querySelectorAll(".step")];
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const barFill = document.getElementById("barFill");
  const stepLabel = document.getElementById("stepLabel");
  const toastEl = document.getElementById("toast");
  const dots = [...document.querySelectorAll(".dots .d")];

  const makePdfBtn = document.getElementById("makePdfBtn");
  const lineLinkBtn = document.getElementById("lineLinkBtn");

  const segBtns = [...document.querySelectorAll(".segBtn")];
  const affTypeHidden = document.getElementById("affType");

  const licFrontInput = document.getElementById("licFront");
  const licBackInput = document.getElementById("licBack");
  const licFrontPrev = document.getElementById("licFrontPrev");
  const licBackPrev = document.getElementById("licBackPrev");

  const agree = document.getElementById("agree");

  let current = 1;
  let licFrontFile = null;
  let licBackFile = null;

  // ----------------
  // Helpers
  // ----------------
  const SV = (id) => (document.getElementById(id)?.value || "").trim();

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 1600);
  }

  function setStep(n) {
    current = n;
    steps.forEach((s) => s.classList.toggle("active", Number(s.dataset.step) === current));

    const pct = ((current - 1) / (steps.length - 1)) * 100;
    barFill.style.width = pct + "%";
    stepLabel.textContent = `STEP ${current} / ${steps.length}`;

    dots.forEach((d, i) => d.classList.toggle("on", i === current - 1));

    backBtn.disabled = current === 1;
    nextBtn.style.display = current === steps.length ? "none" : "inline-flex";
  }

  function validate(stepNo) {
    // iPhone対策：dateの値が空なら必ず止める（ここで止まるのが「次へ動かない」の正体）
    if (stepNo === 1) {
      if (!SV("name") || !SV("kana") || !SV("phone") || !SV("email") || !SV("birth")) {
        return "STEP1：未入力があります（氏名/フリガナ/電話/メール/生年月日）";
      }
    }
    if (stepNo === 2) {
      if (!SV("zip") || !SV("pref") || !SV("city") || !SV("addr1")) {
        return "STEP2：未入力があります（郵便番号/都道府県/市区町村/番地）";
      }
    }
    if (stepNo === 3) {
      if (!SV("affType")) return "STEP3：所属区分を選択してください";
    }
    if (stepNo === 4) {
      if (!SV("vehicleType") || !SV("plate") || !SV("blackPlate")) {
        return "STEP4：未入力があります（車種/車両ナンバー/黒ナンバー）";
      }
    }
    if (stepNo === 5) {
      if (!licFrontFile) return "STEP5：免許証（表面）が必要です";
    }
    if (stepNo === 6) {
      if (!SV("bank") || !SV("branch") || !SV("acctType") || !SV("acctNo") || !SV("acctName")) {
        return "STEP6：未入力があります（銀行/支店/種別/番号/名義）";
      }
    }
    if (stepNo === 7) {
      if (!agree.checked) return "STEP7：規約に同意してください";
    }
    return "";
  }

  function collectData() {
    return {
      name: SV("name"),
      kana: SV("kana"),
      phone: SV("phone"),
      email: SV("email"),
      birth: SV("birth"),
      zip: SV("zip"),
      pref: SV("pref"),
      city: SV("city"),
      addr1: SV("addr1"),
      addr2: SV("addr2"),
      affType: SV("affType"),
      company: SV("company"),
      vehicleType: SV("vehicleType"),
      plate: SV("plate"),
      blackPlate: SV("blackPlate"),
      bank: SV("bank"),
      branch: SV("branch"),
      acctType: SV("acctType"),
      acctNo: SV("acctNo"),
      acctName: SV("acctName")
    };
  }

  // ArrayBuffer -> base64（jsPDFの日本語フォントに必要）
  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ----------------
  // Events
  // ----------------
  nextBtn.addEventListener("click", () => {
    const msg = validate(current);
    if (msg) return toast(msg);
    setStep(current + 1);
  });

  backBtn.addEventListener("click", () => setStep(current - 1));

  segBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      segBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      affTypeHidden.value = btn.dataset.value;
    });
  });

  licFrontInput.addEventListener("change", (e) => {
    licFrontFile = e.target.files?.[0] || null;
    if (!licFrontFile) return;
    const url = URL.createObjectURL(licFrontFile);
    licFrontPrev.src = url;
    licFrontPrev.style.display = "block";
    licFrontPrev.onload = () => URL.revokeObjectURL(url);
  });

  licBackInput.addEventListener("change", (e) => {
    licBackFile = e.target.files?.[0] || null;
    if (!licBackFile) {
      licBackPrev.style.display = "none";
      licBackPrev.src = "";
      return;
    }
    const url = URL.createObjectURL(licBackFile);
    licBackPrev.src = url;
    licBackPrev.style.display = "block";
    licBackPrev.onload = () => URL.revokeObjectURL(url);
  });

  lineLinkBtn.href = LINE_MEMBERSHIP_URL;

  // ----------------
  // PDF（日本語 + 画像）
  // ----------------
  async function makePdf() {
    // 1〜7全チェック
    for (let i = 1; i <= 7; i++) {
      const msg = validate(i);
      if (msg) {
        setStep(i);
        toast(msg);
        return;
      }
    }

    const data = collectData();

    toast("PDF作成中…");

    // フォント読み込み
    let fontBase64 = "";
    try {
      const fontBuf = await fetch(FONT_URL).then((r) => {
        if (!r.ok) throw new Error("font fetch failed");
        return r.arrayBuffer();
      });
      fontBase64 = arrayBufferToBase64(fontBuf);
    } catch {
      toast("フォントが見つかりません：assets/NotoSansJP-Regular.ttf");
      return;
    }

    // 画像（DataURL）
    const frontUrl = await fileToDataURL(licFrontFile);
    const backUrl = await fileToDataURL(licBackFile);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 36;

    // 日本語フォント埋め込み
    doc.addFileToVFS("NotoSansJP-Regular.ttf", fontBase64);
    doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
    doc.setFont("NotoSansJP", "normal");

    // ヘッダ
    doc.setFontSize(16);
    doc.text("OFA GROUP ドライバー登録シート", M, 54);

    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`作成日時：${new Date().toLocaleString("ja-JP")}`, M, 72);

    // ブランドライン（オレンジ）
    doc.setDrawColor(255, 122, 0);
    doc.setLineWidth(3);
    doc.line(M, 84, W - M, 84);

    // 本文
    doc.setTextColor(20);
    doc.setFontSize(12);

    let y = 112;
    const row = (label, value) => {
      doc.setTextColor(90);
      doc.setFontSize(10);
      doc.text(label, M, y);
      doc.setTextColor(20);
      doc.setFontSize(12);
      doc.text(String(value || "—"), M + 150, y);
      y += 18;
    };

    row("氏名", `${data.name}${data.kana ? `（${data.kana}）` : ""}`);
    row("電話番号", data.phone);
    row("メール", data.email);
    row("生年月日", data.birth);

    y += 8;
    const addr = `${data.zip} ${data.pref}${data.city}${data.addr1} ${data.addr2}`.trim();
    row("住所", addr);

    y += 8;
    row("所属区分", data.affType);
    row("所属会社名", data.company);

    y += 8;
    row("車種", data.vehicleType);
    row("車両ナンバー", data.plate);
    row("黒ナンバー", data.blackPlate);

    y += 8;
    row("銀行名", data.bank);
    row("支店名", data.branch);
    row("口座種別", data.acctType);
    row("口座番号", data.acctNo);
    row("口座名義（カナ）", data.acctName);

    // 画像エリア
    let imgTop = Math.max(y + 8, 420);
    doc.setTextColor(20);
    doc.setFontSize(12);
    doc.text("運転免許証（画像）", M, imgTop);

    imgTop += 10;

    const boxW = 250;
    const boxH = 160;
    const gap = 20;

    // 表面
    doc.setTextColor(90);
    doc.setFontSize(10);
    doc.text("表面（必須）", M, imgTop);
    doc.setDrawColor(220);
    doc.setLineWidth(1);
    doc.rect(M, imgTop + 8, boxW, boxH);

    if (frontUrl) {
      // jpeg/png両対応（DataURLの先頭で判定）
      const isPng = frontUrl.startsWith("data:image/png");
      doc.addImage(frontUrl, isPng ? "PNG" : "JPEG", M + 6, imgTop + 14, boxW - 12, boxH - 12);
    }

    // 裏面
    const rx = M + boxW + gap;
    doc.setTextColor(90);
    doc.setFontSize(10);
    doc.text("裏面（任意）", rx, imgTop);
    doc.setDrawColor(220);
    doc.rect(rx, imgTop + 8, boxW, boxH);

    if (backUrl) {
      const isPng2 = backUrl.startsWith("data:image/png");
      doc.addImage(backUrl, isPng2 ? "PNG" : "JPEG", rx + 6, imgTop + 14, boxW - 12, boxH - 12);
    } else {
      doc.setTextColor(120);
      doc.setFontSize(12);
      doc.text("未提出", rx + 95, imgTop + 92);
    }

    // フッタ
    doc.setTextColor(120);
    doc.setFontSize(10);
    doc.text("© OFA GROUP", M, H - 24);
    doc.text("One for All, All for One", W - M - 165, H - 24);

    // 保存
    const ymd = new Date().toISOString().slice(0, 10);
    const filename = `OFA_登録_${data.name}_${ymd}.pdf`;
    doc.save(filename);

    toast("PDFを保存しました。LINEへ送信してください");
    setStep(8);
  }

  makePdfBtn.addEventListener("click", makePdf);

  // 初期化
  setStep(1);
});
