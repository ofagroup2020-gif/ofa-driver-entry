// app.js（全文貼り替え）
// STEP制 1/8〜8/8 + 同意チェック + PDF(日本語)を"印刷用ページ"で生成（保存/共有/印刷を同一導線）

(() => {
  const steps = Array.from(document.querySelectorAll(".step"));
  const TOTAL = steps.length || 8;

  let cur = 0;

  // ====== 必須DOM ======
  const stepNo = document.getElementById("stepNo");
  const bar = document.getElementById("bar");

  const nextBtn = document.getElementById("next");
  const backBtn = document.getElementById("back");

  const agree = document.getElementById("agree");
  const pdfBtn = document.getElementById("pdfBtn");

  // ====== 入力DOM ======
  const el = (id) => document.getElementById(id);

  const nameEl  = el("name");
  const kanaEl  = el("kana");
  const phoneEl = el("phone");
  const emailEl = el("email");
  const birthEl = el("birth");

  const zipEl   = el("zip");
  const prefEl  = el("pref");
  const cityEl  = el("city");
  const addr1El = el("addr1");
  const addr2El = el("addr2");

  const affEl   = el("aff"); // hidden
  const companyEl = el("company");

  const vehicleTypeEl = el("vehicleType");
  const plateEl       = el("plate");
  const blackPlateEl  = el("blackPlate");

  const bankEl     = el("bank");
  const branchEl   = el("branch");
  const acctTypeEl = el("acctType");
  const acctNoEl   = el("acctNo");
  const acctNameEl = el("acctName");

  // file inputs
  const licF = el("licF");
  const licB = el("licB");

  // ====== util ======
  const toast = (msg) => {
    // 既存UIにトーストがあればそれを使う。なければalert
    const t = document.getElementById("toast");
    if (t) {
      t.textContent = msg;
      t.style.opacity = "1";
      t.style.transform = "translateY(0)";
      clearTimeout(toast._tm);
      toast._tm = setTimeout(() => {
        t.style.opacity = "0";
        t.style.transform = "translateY(6px)";
      }, 2000);
    } else {
      alert(msg);
    }
  };

  const setProgress = () => {
    const current = cur + 1;
    if (stepNo) stepNo.textContent = String(current);
    if (bar) bar.style.width = `${(current / TOTAL) * 100}%`;
    // 任意：STEP x/8 表示がある場合
    const stepLabel = document.getElementById("stepLabel");
    if (stepLabel) stepLabel.textContent = `STEP ${current} / ${TOTAL}`;
  };

  const show = () => {
    steps.forEach((s) => s.classList.remove("active"));
    if (steps[cur]) steps[cur].classList.add("active");
    setProgress();

    // ボタン制御
    if (backBtn) backBtn.disabled = cur === 0;

    // 最終STEPではNextを隠す/無効化（HTML側の設計に合わせる）
    if (nextBtn) {
      if (cur >= TOTAL - 1) {
        nextBtn.disabled = true;
        nextBtn.style.opacity = "0.4";
      } else {
        nextBtn.disabled = false;
        nextBtn.style.opacity = "1";
      }
    }
  };

  // ====== validation ======
  const isEmpty = (v) => !v || !String(v).trim();

  const validateStep = (stepIndex) => {
    const s = stepIndex + 1;

    // 必須は最低限だけ（現場で詰まらないように）
    if (s === 1) {
      if (isEmpty(nameEl?.value)) return "氏名（漢字）を入力してください";
      if (isEmpty(phoneEl?.value)) return "電話番号を入力してください";
      if (isEmpty(birthEl?.value)) return "生年月日を入力してください";
    }
    if (s === 2) {
      if (isEmpty(prefEl?.value) || isEmpty(cityEl?.value) || isEmpty(addr1El?.value))
        return "住所（都道府県・市区町村・番地）を入力してください";
    }
    if (s === 3) {
      if (isEmpty(affEl?.value)) return "所属区分を選択してください（協力会社 / FC / 個人）";
    }
    if (s === 4) {
      if (isEmpty(vehicleTypeEl?.value)) return "車種を選択してください";
      if (isEmpty(blackPlateEl?.value)) return "黒ナンバー（あり/なし）を選択してください";
    }
    if (s === 5) {
      if (!licF?.files?.[0]) return "免許証（表面）の画像が必要です";
    }
    if (s === 6) {
      if (isEmpty(bankEl?.value) || isEmpty(branchEl?.value) || isEmpty(acctTypeEl?.value) || isEmpty(acctNoEl?.value) || isEmpty(acctNameEl?.value))
        return "銀行振込先（銀行/支店/種別/番号/名義）を入力してください";
    }
    if (s === 7) {
      if (!agree?.checked) return "規約への同意が必要です";
    }
    return "";
  };

  // ====== seg buttons ======
  document.querySelectorAll(".seg button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll(".seg button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on");
      if (affEl) affEl.value = b.dataset.val || "";
    });
  });

  // ====== nav ======
  nextBtn?.addEventListener("click", () => {
    const msg = validateStep(cur);
    if (msg) return toast(msg);

    if (cur < TOTAL - 1) {
      cur++;
      show();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  backBtn?.addEventListener("click", () => {
    if (cur > 0) {
      cur--;
      show();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // ====== PDF: ブラウザ印刷（日本語・端末差最小） ======
  const fileToDataURL = (file) =>
    new Promise((resolve) => {
      if (!file) return resolve("");
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.readAsDataURL(file);
    });

  const esc = (s) =>
    String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const nowJST = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${y}/${m}/${day} ${hh}:${mm}`;
  };

  const buildPrintHTML = async () => {
    const front = await fileToDataURL(licF?.files?.[0]);
    const back  = await fileToDataURL(licB?.files?.[0]);

    const address =
      `${esc(zipEl?.value)} ${esc(prefEl?.value)}${esc(cityEl?.value)}${esc(addr1El?.value)}${esc(addr2El?.value ? " " + addr2El.value : "")}`.trim();

    // 画像は「拡大しすぎない」「小さすぎない」→ A4に収まる固定枠 + object-fit:cover で上下カット
    // ※ 横向き撮影ならさらに綺麗に収まるのでPDF内にも注意書き出す
    return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>OFA GROUP ドライバー登録シート</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin:0; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", "Yu Gothic", "Meiryo", system-ui, sans-serif; color:#111; }
  .sheet { width: 190mm; margin: 0 auto; }
  .head { display:flex; align-items:flex-end; justify-content:space-between; padding: 2mm 0 3mm; border-bottom: 1mm solid #f08a00; }
  .title { font-weight: 900; font-size: 14pt; }
  .meta { font-size: 9pt; color:#444; text-align:right; }
  .motto { font-weight: 800; color:#f08a00; font-size: 9pt; }

  .grid { margin-top: 5mm; display:grid; grid-template-columns: 1fr 1fr; gap: 4mm; }
  .card { border: 0.3mm solid #e8e8e8; border-radius: 4mm; padding: 3.5mm; }
  .label { font-size: 8.5pt; color:#555; margin-bottom: 1mm; font-weight:700; }
  .value { font-size: 11pt; font-weight: 800; line-height: 1.3; }
  .accent { border-left: 2mm solid #f08a00; padding-left: 3mm; }

  .full { grid-column: 1 / -1; }

  .section { margin-top: 6mm; font-weight: 900; font-size: 12pt; }
  .imgGrid { margin-top: 3mm; display:grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .imgBox { border: 0.3mm solid #e8e8e8; border-radius: 4mm; padding: 3mm; }
  .imgTitle { font-size: 9pt; font-weight: 900; margin-bottom: 2mm; color:#333; }
  .frame { width: 100%; height: 70mm; border-radius: 3mm; overflow:hidden; background:#f6f6f6; border: 0.25mm solid #eee; }
  .frame img { width: 100%; height: 100%; object-fit: cover; display:block; }
  .hint { margin-top: 2mm; font-size: 8.5pt; color:#666; }

  .foot { margin-top: 6mm; font-size: 9pt; color:#333; }
  .printNote { margin-top: 2mm; font-size: 9pt; color:#333; }
  .btns { display:none; } /* 印刷UIは隠す（必要なら表示も可） */

  /* 画面表示（スマホ）では幅を100%に */
  @media screen {
    .sheet { width: min(980px, 92vw); }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="title">OFA GROUP ドライバー登録シート</div>
      <div class="meta">
        <div>作成日時：${esc(nowJST())}</div>
        <div class="motto">One for All, All for One</div>
      </div>
    </div>

    <div class="grid">
      <div class="card accent">
        <div class="label">氏名（漢字）</div>
        <div class="value">${esc(nameEl?.value)}</div>
      </div>
      <div class="card accent">
        <div class="label">フリガナ</div>
        <div class="value">${esc(kanaEl?.value)}</div>
      </div>

      <div class="card accent">
        <div class="label">電話番号</div>
        <div class="value">${esc(phoneEl?.value)}</div>
      </div>
      <div class="card accent">
        <div class="label">メール</div>
        <div class="value">${esc(emailEl?.value)}</div>
      </div>

      <div class="card accent">
        <div class="label">生年月日</div>
        <div class="value">${esc(birthEl?.value)}</div>
      </div>
      <div class="card accent">
        <div class="label">住所</div>
        <div class="value">${esc(address)}</div>
      </div>

      <div class="card accent">
        <div class="label">所属区分</div>
        <div class="value">${esc(affEl?.value)}</div>
      </div>
      <div class="card accent">
        <div class="label">所属会社名（任意）</div>
        <div class="value">${esc(companyEl?.value)}</div>
      </div>

      <div class="card accent">
        <div class="label">車種</div>
        <div class="value">${esc(vehicleTypeEl?.value)}</div>
      </div>
      <div class="card accent">
        <div class="label">車両ナンバー</div>
        <div class="value">${esc(plateEl?.value)}</div>
      </div>

      <div class="card accent">
        <div class="label">黒ナンバー</div>
        <div class="value">${esc(blackPlateEl?.value)}</div>
      </div>
      <div class="card accent">
        <div class="label">銀行</div>
        <div class="value">${esc(bankEl?.value)} / ${esc(branchEl?.value)}</div>
      </div>

      <div class="card accent">
        <div class="label">口座種別</div>
        <div class="value">${esc(acctTypeEl?.value)}</div>
      </div>
      <div class="card accent">
        <div class="label">口座番号</div>
        <div class="value">${esc(acctNoEl?.value)}</div>
      </div>

      <div class="card accent full">
        <div class="label">口座名義（カナ）</div>
        <div class="value">${esc(acctNameEl?.value)}</div>
      </div>
    </div>

    <div class="section">提出画像</div>
    <div class="imgGrid">
      <div class="imgBox">
        <div class="imgTitle">免許証 表面（必須）</div>
        <div class="frame">${front ? `<img src="${front}" alt="">` : ""}</div>
        <div class="hint">※ 見やすい撮影のコツ：できれば“横向き”で、文字が読める距離で撮影してください。</div>
      </div>

      <div class="imgBox">
        <div class="imgTitle">免許証 裏面（任意）</div>
        <div class="frame">${back ? `<img src="${back}" alt="">` : ""}</div>
        <div class="hint">※ 画像はA4枠に合わせて“上下左右を自動カット（拡大は最小）”で配置しています。</div>
      </div>
    </div>

    <div class="foot">
      このPDFを「OFAメンバーシップLINE」へ添付して送信してください。
      <div class="printNote">保存 / 共有 / 印刷：ブラウザの「共有」または「印刷」から行えます。</div>
    </div>
  </div>
</body>
</html>`;
  };

  const openPrintPage = async () => {
    // 最終STEP(8)にいる前提でも、どこからでも押せるようにする
    // ただし未入力は止める（最低限）
    const mustMsg = validateStep(6); // 規約直前までが揃ってる想定
    if (mustMsg) return toast(mustMsg);

    const html = await buildPrintHTML();

    // iOS Safari/Chrome対策：別タブで開く
    const w = window.open("", "_blank");
    if (!w) {
      toast("ポップアップがブロックされました。ブラウザ設定で許可してください。");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();

    // 自動印刷は端末によってブロックされるので基本しない。
    // 代わりに案内だけ出す。
    toast("PDFページを開きました。共有/印刷から保存してください。");
  };

  pdfBtn?.addEventListener("click", openPrintPage);

  // 初期表示
  show();
})();
