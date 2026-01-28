(() => {
  const steps = Array.from(document.querySelectorAll('.step'));
  const TOTAL = steps.length; // 8
  const stepNowEl = document.getElementById('stepNow');
  const stepTotalEl = document.getElementById('stepTotal');
  const barFill = document.getElementById('barFill');
  const dotsWrap = document.getElementById('dots');
  const toast = document.getElementById('toast');

  stepTotalEl.textContent = String(TOTAL);

  // ====== dots生成 ======
  const dots = [];
  for (let i = 0; i < TOTAL; i++) {
    const d = document.createElement('div');
    d.className = 'd';
    dotsWrap.appendChild(d);
    dots.push(d);
  }

  let cur = 0; // 0-based

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1500);
  }

  function setActive(index){
    cur = Math.max(0, Math.min(TOTAL - 1, index));
    steps.forEach(s => s.classList.remove('active'));
    steps[cur].classList.add('active');

    // step表示
    stepNowEl.textContent = String(cur + 1);

    // progress bar
    const pct = ((cur + 1) / TOTAL) * 100;
    barFill.style.width = pct + '%';

    // dots
    dots.forEach((d, i) => d.classList.toggle('on', i === cur));

    // 先頭STEPで「戻る」を無効にしたい場合はここでやる（今回は押しても変化なしにする）
  }

  // ====== 入力取得 ======
  const $ = (id) => document.getElementById(id);

  const name = $('name');
  const kana = $('kana');
  const phone = $('phone');
  const email = $('email');
  const dob = $('dob');

  const zip = $('zip');
  const pref = $('pref');
  const city = $('city');
  const addr1 = $('addr1');
  const addr2 = $('addr2');

  const aff = $('aff'); // hidden
  const company = $('company');

  const carType = $('carType');
  const carNo = $('carNo');
  const blackNo = $('blackNo');

  const bankName = $('bankName');
  const bankBranch = $('bankBranch');
  const bankType = $('bankType');
  const bankNo = $('bankNo');
  const bankKana = $('bankKana');

  const licF = $('licF');
  const licB = $('licB');
  const prevF = $('prevF');
  const prevB = $('prevB');

  // ====== プレビュー ======
  function previewFile(fileInput, imgEl){
    const f = fileInput.files && fileInput.files[0];
    if (!f) {
      imgEl.style.display = 'none';
      imgEl.src = '';
      return;
    }
    const url = URL.createObjectURL(f);
    imgEl.src = url;
    imgEl.style.display = 'block';
  }
  licF.addEventListener('change', () => previewFile(licF, prevF));
  licB.addEventListener('change', () => previewFile(licB, prevB));

  // ====== 所属ボタン ======
  document.querySelectorAll('.segBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.segBtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aff.value = btn.dataset.aff || '';
    });
  });

  // ====== 必須チェック（最小限） ======
  function requireFilled(list){
    for (const el of list){
      if (!el) continue;
      const v = (el.value || '').trim();
      if (!v) return false;
    }
    return true;
  }

  function canGoNext(){
    // stepごとの最低限チェック（厳しくしすぎない）
    const stepNo = cur + 1;

    if (stepNo === 1) {
      return requireFilled([name, kana, phone, email, dob]);
    }
    if (stepNo === 2) {
      return requireFilled([zip, pref, city, addr1]);
    }
    if (stepNo === 3) {
      // 所属は必須（ボタン）
      return (aff.value || '').trim().length > 0;
    }
    if (stepNo === 4) {
      return requireFilled([carType, carNo, blackNo]);
    }
    if (stepNo === 5) {
      return requireFilled([bankName, bankBranch, bankType, bankNo, bankKana]);
    }
    if (stepNo === 6) {
      // 表面は必須
      return !!(licF.files && licF.files[0]);
    }
    if (stepNo === 7) {
      // 同意必須
      return $('agree').checked;
    }
    return true;
  }

  function next(){
    if (!canGoNext()){
      showToast('未入力があります');
      return;
    }
    setActive(cur + 1);
  }

  function back(){
    setActive(cur - 1);
  }

  // ====== ナビボタン（ID固定） ======
  const bindNav = (id, fn) => {
    const el = $(id);
    if (el) el.addEventListener('click', fn);
  };

  // step1
  bindNav('backBtn', back);
  bindNav('nextBtn', next);

  // step2
  bindNav('backBtn2', back);
  bindNav('nextBtn2', next);

  // step3
  bindNav('backBtn3', back);
  bindNav('nextBtn3', next);

  // step4
  bindNav('backBtn4', back);
  bindNav('nextBtn4', next);

  // step5
  bindNav('backBtn5', back);
  bindNav('nextBtn5', next);

  // step6
  bindNav('backBtn6', back);
  bindNav('nextBtn6', next);

  // step7
  bindNav('backBtn7', back);
  bindNav('nextBtn7', next);

  // step8
  bindNav('backBtn8', back);
  bindNav('restartBtn', () => setActive(0));

  // ====== STEP8 ボタン（導線：LINE → PDF） ======
  // ★ここにあなたの「OFAメンバーシップLINE」友だち追加URLを入れる
  // 例）https://lin.ee/xxxxx  または  https://line.me/R/ti/p/@xxxxx
  const OFA_MEMBERSHIP_LINE_URL = "https://lin.ee/xxxxx"; // ←必ず差し替え

  $('lineBtn').addEventListener('click', () => {
    // iPhoneのin-appブラウザだと詰まるので、まず普通に開く
    window.open(OFA_MEMBERSHIP_LINE_URL, '_blank');
    showToast('LINEを追加/開きました');
  });

  $('howToBtn').addEventListener('click', () => {
    alert(
`【送信手順】
1) 先に「OFAメンバーシップLINE」を追加/開く
2) 「登録PDF作成」を押してPDFを開く/保存
3) 共有ボタン → LINE → 「OFAメンバーシップLINE」へ送信
※ 印刷は共有 → 印刷でOK`
    );
  });

  // ====== PDF作成（html2canvas → jsPDF） ======
  const pdfPaper = $('pdfPaper');
  const pdfGrid = $('pdfGrid');
  const pdfDate = $('pdfDate');
  const pdfImgF = $('pdfImgF');
  const pdfImgB = $('pdfImgB');

  function nowString(){
    const d = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function pdfItem(label, value){
    const div = document.createElement('div');
    div.className = 'pdfItem';
    div.innerHTML = `<div class="pdfLabel">${label}</div><div class="pdfValue">${escapeHtml(value || '')}</div>`;
    return div;
  }

  function escapeHtml(str){
    return String(str)
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");
  }

  async function fileToDataURL(file){
    if (!file) return '';
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(file);
    });
  }

  function buildPdfPaper(){
    pdfDate.textContent = nowString();
    pdfGrid.innerHTML = '';

    pdfGrid.appendChild(pdfItem('氏名（漢字）', name.value));
    pdfGrid.appendChild(pdfItem('フリガナ', kana.value));
    pdfGrid.appendChild(pdfItem('電話番号', phone.value));
    pdfGrid.appendChild(pdfItem('メール', email.value));

    pdfGrid.appendChild(pdfItem('生年月日', dob.value));

    const fullAddr = `${zip.value} ${pref.value}${city.value}${addr1.value}${addr2.value ? ' ' + addr2.value : ''}`;
    pdfGrid.appendChild(pdfItem('住所', fullAddr));

    pdfGrid.appendChild(pdfItem('所属区分', aff.value));
    pdfGrid.appendChild(pdfItem('所属会社名（任意）', company.value));

    pdfGrid.appendChild(pdfItem('車種', carType.value));
    pdfGrid.appendChild(pdfItem('車両ナンバー', carNo.value));
    pdfGrid.appendChild(pdfItem('黒ナンバー', blackNo.value));

    pdfGrid.appendChild(pdfItem('銀行', bankName.value));
    pdfGrid.appendChild(pdfItem('支店', bankBranch.value));
    pdfGrid.appendChild(pdfItem('口座種別', bankType.value));
    pdfGrid.appendChild(pdfItem('口座番号', bankNo.value));
    pdfGrid.appendChild(pdfItem('口座名義（カナ）', bankKana.value));
  }

  async function createPdf(){
    // 端末差でPDF出ない問題の回避：Safari/Chrome推奨（コード側は最大限安定化）
    buildPdfPaper();

    // 画像をPDF用に差し込む（DataURL）
    const fFront = licF.files && licF.files[0];
    const fBack  = licB.files && licB.files[0];

    pdfImgF.src = await fileToDataURL(fFront);
    pdfImgB.src = fBack ? await fileToDataURL(fBack) : '';

    // 画像読み込み待ち
    await Promise.all([waitImg(pdfImgF), waitImg(pdfImgB)]);

    // canvas化（A4 794px 幅）
    const canvas = await html2canvas(pdfPaper, {
      scale: 2, // 画質UP
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');

    // A4(mm) 210 x 297
    const pageW = 210;
    const pageH = 297;

    // canvas比率から高さ計算
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    // 1ページで収まる前提（収まらない場合は縮める）
    let drawH = imgH;
    if (drawH > pageH) drawH = pageH;

    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, drawH, undefined, 'FAST');

    const fileName = `OFA_driver_entry_${stamp()}.pdf`;

    // ★iPhoneで「保存/共有/印刷」しやすいように、まず開いてから保存
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);

    // 新しいタブでPDFを開く（印刷もここから）
    window.open(url, '_blank');

    // ついでにダウンロード（Chromeは下に出る）
    pdf.save(fileName);

    showToast('PDFを作成しました');
  }

  function waitImg(img){
    return new Promise((r) => {
      if (!img || !img.src) return r();
      if (img.complete) return r();
      img.onload = () => r();
      img.onerror = () => r();
    });
  }

  function stamp(){
    const d = new Date();
    const pad = (n) => String(n).padStart(2,'0');
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
  }

  $('pdfBtn').addEventListener('click', async () => {
    try{
      // LINE導線のため、先にLINE追加を促す（強制はしない）
      if (!OFA_MEMBERSHIP_LINE_URL || OFA_MEMBERSHIP_LINE_URL.includes('xxxxx')){
        alert('app.js の OFA_MEMBERSHIP_LINE_URL を本物のURLに差し替えてください。');
        return;
      }
      await createPdf();
    }catch(e){
      console.error(e);
      alert('PDF作成に失敗しました。Safari/Chromeで開き直して再度お試しください。');
    }
  });

  // ====== 初期表示 ======
  setActive(0);

  // ====== Service Worker（キャッシュで反映されない対策） ======
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=20260129-2').catch(()=>{});
  }
})();
