/* ===== STEP UI ===== */
const steps = Array.from(document.querySelectorAll('.step'));
let cur = 0;

const stepNo = document.getElementById('stepNo');
const barFill = document.getElementById('barFill');
const dotsWrap = document.getElementById('dots');
const toast = document.getElementById('toast');

const agree = document.getElementById('agree');

const state = { pdfBlob: null, pdfFileName: null };

// ★ここをあなたのLINEに差し替え
const LINE_URL = "https://line.me/R/ti/p/@YOUR_LINE_ID";

/* ========= ユーティリティ ========= */
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

function showToast(msg){
  if(!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'), 1500);
}

/* ========= DOTS生成 ========= */
function buildDots(){
  if(!dotsWrap) return;
  dotsWrap.innerHTML = '';
  for(let i=0;i<8;i++){
    const d = document.createElement('div');
    d.className = 'd' + (i===0 ? ' on' : '');
    dotsWrap.appendChild(d);
  }
}
buildDots();

/* ========= 画面更新 ========= */
function updateUI(){
  steps.forEach(s=>s.classList.remove('active'));
  steps[cur]?.classList.add('active');

  if(stepNo) stepNo.textContent = String(cur + 1);

  if(barFill){
    const pct = ((cur+1)/8)*100;
    barFill.style.width = pct + '%';
  }

  if(dotsWrap){
    const dots = $all('#dots .d');
    dots.forEach((d, i)=> d.classList.toggle('on', i===cur));
  }

  window.scrollTo({top:0, behavior:'smooth'});
}

/* ========= 遷移 ========= */
function validateStep(index){
  // 例：最低限の必須チェック（必要なら追加）
  if(index === 0){
    // 1/8：氏名・電話・メールだけ必須にする例
    const name = ($('#name')?.value || '').trim();
    const phone = ($('#phone')?.value || '').trim();
    const email = ($('#email')?.value || '').trim();

    if(!name || !phone || !email){
      alert('氏名・電話番号・メールアドレスは必須です。');
      return false;
    }
  }

  if(index === 6){
    if(agree && !agree.checked){
      alert('同意が必要です');
      return false;
    }
  }
  return true;
}

function next(){
  if(!validateStep(cur)) return;
  if(cur < 7){
    cur++;
    updateUI();
  }
}
function back(){
  if(cur > 0){
    cur--;
    updateUI();
  }
}

/* ========= 「次へ」「戻る」ボタンを“自動で拾って”紐づけ =========
   - 既存HTMLのボタンIDが違っても動く
   - 無ければ下部に自動生成
*/
function hookNavButtons(){
  // 1) まず典型IDを探す
  let nextBtn =
    document.getElementById('next') ||
    document.getElementById('nextBtn') ||
    document.getElementById('btnNext');

  let backBtn =
    document.getElementById('back') ||
    document.getElementById('backBtn') ||
    document.getElementById('btnBack');

  // 2) 見た目/文言から探す（「次へ」「戻る」）
  if(!nextBtn){
    nextBtn = $all('button, a').find(el => (el.textContent || '').trim() === '次へ');
  }
  if(!backBtn){
    backBtn = $all('button, a').find(el => (el.textContent || '').trim() === '戻る');
  }

  // 3) それでも無ければ自動生成（下部固定）
  if(!nextBtn || !backBtn){
    let nav = document.createElement('div');
    nav.className = 'nav';
    nav.style.position = 'sticky';
    nav.style.bottom = '0';
    nav.style.background = 'transparent';
    nav.style.paddingBottom = '8px';

    const b1 = document.createElement('button');
    b1.type = 'button';
    b1.className = 'btnGhost';
    b1.textContent = '戻る';

    const b2 = document.createElement('button');
    b2.type = 'button';
    b2.className = 'btnPrimary';
    b2.textContent = '次へ';

    nav.appendChild(b1);
    nav.appendChild(b2);

    // cardの最後に追加
    const card = $('.card');
    if(card) card.appendChild(nav);

    backBtn = backBtn || b1;
    nextBtn = nextBtn || b2;
  }

  // DONE(8/8)は next/back を押さない設計なら、DONEでは非表示にする
  const toggle = ()=>{
    const onDone = (cur === 7);
    if(backBtn) backBtn.style.display = onDone ? 'none' : '';
    if(nextBtn) nextBtn.style.display = onDone ? 'none' : '';
  };

  // クリック紐づけ（既存イベントがあっても上書きで確実に動かす）
  if(nextBtn){
    nextBtn.onclick = (e)=>{ e.preventDefault(); next(); toggle(); };
  }
  if(backBtn){
    backBtn.onclick = (e)=>{ e.preventDefault(); back(); toggle(); };
  }

  toggle();
}

/* ========= 所属区分ボタン ========= */
$all('.segBtn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    $all('.segBtn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    const aff = document.getElementById('aff');
    if(aff) aff.value = btn.dataset.val;
  });
});

/* ========= 画像プレビュー ========= */
function bindPreview(fileInputId, imgId){
  const inp = document.getElementById(fileInputId);
  const img = document.getElementById(imgId);
  if(!inp || !img) return;

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

/* ========= DONEの3ボタン（LINE / PDF / 共有印刷） ========= */
const lineBtn = document.getElementById('lineBtn');
if(lineBtn) lineBtn.href = LINE_URL;

const pdfBtn = document.getElementById('pdfBtn');
const shareBtn = document.getElementById('shareBtn');

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

function buildPdfGrid(){
  const grid = document.getElementById('pdfGrid');
  if(!grid) return;
  grid.innerHTML = '';

  const items = [
    ["氏名（漢字）", val('name')],
    ["フリガナ", val('kana')],
    ["電話番号", val('phone')],
    ["メール", val('email')],
    ["生年月日", val('dob')],
    ["住所", `${val('zip')} ${val('pref')}${val('city')}${val('addr1')}${val('addr2')}`.trim()],
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

function fileToDataURL(file){
  return new Promise((resolve)=>{
    if(!file) return resolve('');
    const r = new FileReader();
    r.onload = ()=> resolve(r.result);
    r.onerror = ()=> resolve('');
    r.readAsDataURL(file);
  });
}

async function createPdfBlob(){
  const licFront = document.getElementById('licF')?.files?.[0];
  if(!licFront){
    alert('免許証 表面（必須）をアップロードしてください。');
    return null;
  }

  buildPdfGrid();

  const now = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;

  const pdfDate = document.getElementById('pdfDate');
  if(pdfDate){
    pdfDate.textContent = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  const licBack = document.getElementById('licB')?.files?.[0];
  const pdfImgF = document.getElementById('pdfImgF');
  const pdfImgB = document.getElementById('pdfImgB');

  if(pdfImgF) pdfImgF.src = await fileToDataURL(licFront);
  if(pdfImgB) pdfImgB.src = await fileToDataURL(licBack);

  await new Promise(r=>setTimeout(r, 120));

  const paper = document.getElementById('pdfPaper');
  if(!paper){
    alert('PDFテンプレートが見つかりません（pdfPaper）。');
    return null;
  }

  const canvas = await html2canvas(paper, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/jpeg', 0.92);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');

  const pageW = 210, pageH = 297;
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  let remain = imgH;
  pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH, '', 'FAST');
  remain -= pageH;

  while(remain > 0){
    pdf.addPage();
    const y = remain - imgH;
    pdf.addImage(imgData, 'JPEG', 0, y, imgW, imgH, '', 'FAST');
    remain -= pageH;
  }

  const fileName = `OFA_driver_entry_${stamp}.pdf`;
  state.pdfFileName = fileName;

  const blob = pdf.output('blob');
  state.pdfBlob = blob;
  return blob;
}

function openPdfBlob(blob){
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  setTimeout(()=> URL.revokeObjectURL(url), 60_000);
}

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

pdfBtn?.addEventListener('click', async ()=>{
  try{
    pdfBtn.disabled = true;
    pdfBtn.textContent = '作成中...';
    const blob = await createPdfBlob();
    if(!blob) return;
    openPdfBlob(blob);
    showToast('PDFを作成しました。');
  }catch(e){
    console.error(e);
    alert('PDF作成に失敗しました。Safari/Chromeで再度お試しください。');
  }finally{
    pdfBtn.disabled = false;
    pdfBtn.textContent = 'PDF作成';
  }
});

shareBtn?.addEventListener('click', async ()=>{
  try{
    let blob = state.pdfBlob;
    if(!blob){
      shareBtn.disabled = true;
      shareBtn.textContent = '準備中...';
      blob = await createPdfBlob();
      if(!blob) return;
    }
    const shared = await sharePdf(blob);
    if(shared){
      showToast('共有を開きました。');
      return;
    }
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

/* ========= 起動 ========= */
hookNavButtons();
updateUI();
