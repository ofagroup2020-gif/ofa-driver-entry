/* ===== STEP UI ===== */
const steps = Array.from(document.querySelectorAll('.step'));
let cur = 0;

const stepNo = document.getElementById('stepNo');
const barFill = document.getElementById('barFill');
const dotsWrap = document.getElementById('dots');
const toast = document.getElementById('toast');

const lineBtn = document.getElementById('lineBtn');
const pdfBtn = document.getElementById('pdfBtn');
const shareBtn = document.getElementById('shareBtn');

const agree = document.getElementById('agree');

const state = {
  pdfBlob: null,
  pdfFileName: null
};

// ★ここをあなたの「OFAメンバーシップLINE」URLに差し替え
// 例：line://ti/p/@xxxxx または https://lin.ee/xxxxx
const LINE_URL = "https://line.me/R/ti/p/@YOUR_LINE_ID";
lineBtn.href = LINE_URL;

/* DOTS生成 */
function buildDots(){
  dotsWrap.innerHTML = '';
  for(let i=0;i<8;i++){
    const d = document.createElement('div');
    d.className = 'd' + (i===0 ? ' on' : '');
    dotsWrap.appendChild(d);
  }
}
buildDots();

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 1500);
}

function updateUI(){
  steps.forEach(s=>s.classList.remove('active'));
  steps[cur].classList.add('active');

  stepNo.textContent = String(cur + 1);
  const pct = ((cur+1)/8)*100;
  barFill.style.width = pct + '%';

  const dots = Array.from(dotsWrap.querySelectorAll('.d'));
  dots.forEach((d, i)=> d.classList.toggle('on', i===cur));

  // DONE以外は、下の3ボタンは表示しない（DONE内にあるのでOK）
}
updateUI();

/* 画面遷移（前/次）用の共通関数 */
function next(){
  // STEP7（index=6）は同意チェック必須
  if(cur === 6 && !agree.checked){
    alert('同意が必要です');
    return;
  }
  if(cur < 7){
    cur++;
    updateUI();
    window.scrollTo({top:0, behavior:'smooth'});
  }
}
function back(){
  if(cur > 0){
    cur--;
    updateUI();
    window.scrollTo({top:0, behavior:'smooth'});
  }
}

/* 「戻る」「次へ」ボタンは（あなたの元UIに合わせて）画面内に置いてないので
   ここではスワイプ/外付け無し。必要なら、各STEP下にボタン追加して next()/back() を呼ぶだけでOK。
*/

/* ===== 所属区分ボタン ===== */
document.querySelectorAll('.segBtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.segBtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('aff').value = btn.dataset.val;
  });
});

/* ===== 画像プレビュー ===== */
function bindPreview(fileInputId, imgId){
  const inp = document.getElementById(fileInputId);
  const img = document.getElementById(imgId);
  inp.addEventListener('change', ()=>{
    const f = inp.files && inp.files[0];
    if(!f){
      img.style.display = 'none';
      img.src = '';
      return;
    }
    img.style.display = 'block';
    img.src = URL.createObjectURL(f);
  });
}
bindPreview('licF','prevF');
bindPreview('licB','prevB');

/* ===== PDF用データ反映（PDFには「所属区分」は出さない方針） ===== */
function buildPdfGrid(){
  const grid = document.getElementById('pdfGrid');
  grid.innerHTML = '';

  const items = [
    ["氏名（漢字）", val('name')],
    ["フリガナ", val('kana')],
    ["電話番号", val('phone')],
    ["メール", val('email')],
    ["生年月日", val('dob')],
    ["住所", `${val('zip')} ${val('pref')}${val('city')}${val('addr1')}${val('addr2')}`.trim()],
    // ★所属区分をPDFに出さない：要望通り
    // ["所属区分", val('aff')],
    ["所属会社名（任意）", val('affCompany')],
    ["車種", val('carType')],
    ["車両ナンバー", val('carNo')],
    ["黒ナンバー", val('blackNo')],
    ["支店", val('branch')],
    ["銀行", val('bank')],
    ["口座種別", val('bankType')],
    ["口座番号", val('bankNo')],
    ["口座名義（カナ）", val('bankName')],
  ];

  items.forEach(([label, value])=>{
    const box = document.createElement('div');
    box.className = 'pdfItem';
    box.innerHTML = `
      <div class="pdfLabel">${escapeHtml(label)}</div>
      <div class="pdfValue">${escapeHtml(value || '')}</div>
    `;
    grid.appendChild(box);
  });
}
function val(id){
  const el = document.getElementById(id);
  if(!el) return '';
  return (el.value || '').trim();
}
function escapeHtml(s){
  return String(s)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

/* ===== 画像をDataURLにしてPDFに載せる ===== */
function fileToDataURL(file){
  return new Promise((resolve)=>{
    if(!file) return resolve('');
    const r = new FileReader();
    r.onload = ()=> resolve(r.result);
    r.onerror = ()=> resolve('');
    r.readAsDataURL(file);
  });
}

/* ===== HTML→Canvas→PDF（A4途切れない、端末差が出にくい） ===== */
async function createPdfBlob(){
  // 必須チェック（最低限）
  const licFront = document.getElementById('licF').files?.[0];
  if(!licFront){
    alert('免許証 表面（必須）をアップロードしてください。');
    return null;
  }

  // PDFに反映
  buildPdfGrid();

  // 日時
  const now = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
  document.getElementById('pdfDate').textContent =
    `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // 画像セット
  const licBack = document.getElementById('licB').files?.[0];
  document.getElementById('pdfImgF').src = await fileToDataURL(licFront);
  document.getElementById('pdfImgB').src = await fileToDataURL(licBack);

  // 少し待つ（画像反映）
  await new Promise(r=>setTimeout(r, 120));

  const paper = document.getElementById('pdfPaper');

  // canvas生成
  const canvas = await html2canvas(paper, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');

  // A4サイズ（mm）
  const pageW = 210;
  const pageH = 297;

  // 画像をA4にフィット
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let y = 0;
  let remain = imgH;

  // 1ページ目
  pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH, '', 'FAST');
  remain -= pageH;

  // 2ページ目以降（もし縦が長い場合）
  while(remain > 0){
    pdf.addPage();
    y = remain - imgH; // 画像全体を上にずらして、次の範囲を見せる
    pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH, '', 'FAST');
    remain -= pageH;
  }

  const fileName = `OFA_driver_entry_${stamp}.pdf`;
  state.pdfFileName = fileName;

  // blob生成
  const blob = pdf.output('blob');
  state.pdfBlob = blob;

  return blob;
}

/* ===== PDFを“開く/保存”（ブラウザ標準で共有/印刷へ行ける） ===== */
function openPdfBlob(blob){
  const url = URL.createObjectURL(blob);
  // 新しいタブで開く → Safari/Chromeの共有/印刷導線が使える
  window.open(url, '_blank');
  setTimeout(()=> URL.revokeObjectURL(url), 60_000);
}

/* ===== Web Share（対応端末ならファイル共有） ===== */
async function sharePdf(blob){
  const fileName = state.pdfFileName || 'OFA_driver_entry.pdf';
  const file = new File([blob], fileName, { type: 'application/pdf' });

  if(navigator.share && navigator.canShare && navigator.canShare({ files: [file] })){
    await navigator.share({
      title: 'OFAドライバー登録PDF',
      text: 'OFAメンバーシップLINEへ送信してください。',
      files: [file]
    });
    return true;
  }
  return false;
}

/* ===== DONE: ボタン動作 ===== */
pdfBtn?.addEventListener('click', async ()=>{
  try{
    pdfBtn.disabled = true;
    pdfBtn.textContent = '作成中...';

    const blob = await createPdfBlob();
    if(!blob) return;

    // まず開いて保存できる状態へ
    openPdfBlob(blob);
    showToast('PDFを作成しました。');

  }catch(e){
    console.error(e);
    alert('PDF作成に失敗しました。Safari/Chromeで開いて再度お試しください。');
  }finally{
    pdfBtn.disabled = false;
    pdfBtn.textContent = 'PDF作成';
  }
});

shareBtn?.addEventListener('click', async ()=>{
  try{
    // まだPDFが無ければ生成してから共有/印刷
    let blob = state.pdfBlob;
    if(!blob){
      shareBtn.disabled = true;
      shareBtn.textContent = '準備中...';
      blob = await createPdfBlob();
      if(!blob) return;
    }

    // 共有できる端末 → 共有シート
    const shared = await sharePdf(blob);
    if(shared){
      showToast('共有を開きました。');
      return;
    }

    // 共有未対応 → PDFを開いて、ブラウザの共有/印刷を使う
    openPdfBlob(blob);
    showToast('PDFを開きました。共有/印刷してください。');

  }catch(e){
    console.error(e);
    alert('共有/印刷の準備に失敗しました。');
  }finally{
    shareBtn.disabled = false;
    shareBtn.textContent = '共有 / 印刷';
  }
});

/* ===== ここ重要：画面遷移の操作方法 =====
   あなたの前の実装に「次へ/戻る」ボタンがある想定なら、
   そのボタンの onclick で next()/back() を呼んでください。
   （例：document.getElementById('nextBtn').onclick = next;）
*/
