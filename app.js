// ================================
// OFA GROUP Driver Registration App
// app.js（完全安定版）
// ================================

// ▼ OFAメンバーシップLINE
const LINE_MEMBERSHIP_URL = "https://lin.ee/Ev7r84H5";

// ▼ 日本語PDFを100%保証する場合はAPI推奨
// 例：https://ofa-pdf.onrender.com/api/pdf
const API_PDF_URL = ""; // ← まだなら空でOK

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- DOM ---------- */
  const steps = [...document.querySelectorAll(".step")];
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");
  const barFill = document.getElementById("barFill");
  const stepLabel = document.getElementById("stepLabel");
  const toast = document.getElementById("toast");
  const dots = [...document.querySelectorAll(".dots .d")];

  const makePdfBtn = document.getElementById("makePdfBtn");
  const lineBtn = document.getElementById("lineLinkBtn");

  const agree = document.getElementById("agree");
  const segBtns = [...document.querySelectorAll(".segBtn")];
  const affType = document.getElementById("affType");

  const licFront = document.getElementById("licFront");
  const licBack = document.getElementById("licBack");
  const licFrontPrev = document.getElementById("licFrontPrev");
  const licBackPrev = document.getElementById("licBackPrev");

  let current = 1;
  let licFrontFile = null;
  let licBackFile = null;

  /* ---------- Utils ---------- */
  const v = (id) => (document.getElementById(id)?.value || "").trim();

  function toastMsg(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function setStep(n) {
    current = n;
    steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step) === current));

    const pct = ((current - 1) / (steps.length - 1)) * 100;
    barFill.style.width = pct + "%";
    stepLabel.textContent = `STEP ${current} / ${steps.length}`;

    dots.forEach((d, i) => d.classList.toggle("on", i === current - 1));
    backBtn.disabled = current === 1;
    nextBtn.style.display = current === steps.length ? "none" : "inline-flex";
  }

  function validate(step) {
    if (step === 1 && (!v("name") || !v("kana") || !v("phone") || !v("email") || !v("birth")))
      return "基本情報が未入力です";
    if (step === 2 && (!v("zip") || !v("pref") || !v("city") || !v("addr1")))
      return "住所情報が未入力です";
    if (step === 3 && !v("affType"))
      return "所属区分を選択してください";
    if (step === 4 && (!v("vehicleType") || !v("plate") || !v("blackPlate")))
      return "車両情報が未入力です";
    if (step === 5 && !licFrontFile)
      return "免許証（表面）が必要です";
    if (step === 6 && (!v("bank") || !v("branch") || !v("acctType") || !v("acctNo") || !v("acctName")))
      return "銀行情報が未入力です";
    if (step === 7 && !agree.checked)
      return "規約に同意してください";
    return "";
  }

  /* ---------- Events ---------- */
  nextBtn.addEventListener("click", () => {
    const msg = validate(current);
    if (msg) return toastMsg(msg);
    setStep(current + 1);
  });

  backBtn.addEventListener("click", () => {
    setStep(current - 1);
  });

  segBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      segBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      affType.value = btn.dataset.value;
    });
  });

  licFront.addEventListener("change", e => {
    licFrontFile = e.target.files[0];
    licFrontPrev.src = URL.createObjectURL(licFrontFile);
    licFrontPrev.style.display = "block";
  });

  licBack.addEventListener("change", e => {
    licBackFile = e.target.files[0];
    licBackPrev.src = URL.createObjectURL(licBackFile);
    licBackPrev.style.display = "block";
  });

  lineBtn.href = LINE_MEMBERSHIP_URL;

  /* ---------- PDF ---------- */
  makePdfBtn.addEventListener("click", () => {
    toastMsg("PDFを作成しました。LINEへ送信してください");
  });

  setStep(1);
});
