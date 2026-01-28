(() => {
  const steps = Array.from(document.querySelectorAll('.step'));
  let cur = 0;

  const stepNo = document.getElementById('stepNo');
  const bar = document.getElementById('bar');
  const dots = document.getElementById('dots');

  // dots build
  dots.innerHTML = '';
  for (let i = 0; i < 8; i++) {
    const d = document.createElement('div');
    d.className = 'd' + (i === 0 ? ' on' : '');
    dots.appendChild(d);
  }
  const dotEls = Array.from(dots.querySelectorAll('.d'));

  function toast(msg){
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 1800);
  }

  function show() {
    steps.forEach(s => s.classList.remove('active'));
    steps[cur].classList.add('active');
    stepNo.textContent = String(cur + 1);
    bar.style.width = ((cur + 1) / 8 * 100) + '%';
    dotEls.forEach((d, i) => d.classList.toggle('on', i === cur));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('next').onclick = () => {
    if (cur === 6 && !document.getElementById('agree').checked) {
      alert('同意が必要です');
      return;
    }
    if (cur < 7) { cur++; show(); }
  };

  document.getElementById('back').onclick = () => {
    if (cur > 0) { cur--; show(); }
  };

  // affiliation segmented
  const segBtns = Array.from(document.querySelectorAll('.segBtn'));
  segBtns.forEach(b => {
    b.onclick = () => {
      segBtns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      document.getElementById('aff').value = b.dataset.val;
    };
  });

  // LINE link（ここはあなたのLINE URLに差し替え）
  const lineBtn = document.getElementById('lineBtn');
  // 例：LINE公式/オープンチャット/友だち追加URLなど
  lineBtn.href = "https://line.me/R/ti/p/@YOUR_LINE_ID";

  // previews
  const licF = document.getElementById('licF');
  const licB = document.getElementById('licB');
  const prevF = document.getElementById('prevF');
  const prevB = document.getElementById('prevB');

  function setPreview(fileInput, imgEl){
    const f = fileInput.files && fileInput.files[0];
    if(!f){ imgEl.style.display='none'; return; }
    const url = URL.createObjectURL(f);
    imgEl.src = url;
    imgEl.style.display='block';
    imgEl.onload = () => URL.revokeObjectURL(url);
  }
  licF.addEventListener('change', ()=>setPreview(licF, prevF));
  licB.addEventListener('change', ()=>setPreview(licB, prevB));

  // ====== PDF: 画像を「縮小しない」で中央トリミングして貼る ======
  async function fileToCroppedDataURL(file, outW = 1400, outH = 900){
    if(!file) return '';
    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise((res, rej) => {
      img.onload = () => res();
      img.onerror = rej;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');

    // cover crop
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(outW / iw, outH / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const dx = (outW - sw) / 2;
    const dy = (outH - sh) / 2;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,outW,outH);
    ctx.drawImage(img, dx, dy, sw, sh);

    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/jpeg', 0.92);
  }

  function addPdfItem(grid, label, value){
    const box = document.createElement('div');
    box.className = 'pdfItem';
    box.innerHTML = `
      <div class="pdfLabel">${label}</div>
      <div class="pdfValue">${value || ''}</div>
    `;
    grid.appendChild(box);
  }

  document.getElementById('pdfBtn').onclick = async () => {
    try{
      // pdf paper fill
      const g = document.getElementById('pdfGrid');
      g.innerHTML = '';

      const v = (id)=>document.getElementById(id)?.value?.trim() || '';

      const now = new Date();
      const pad = (n)=>String(n).padStart(2,'0');
      const dateStr = `${now.getFullYear()}/${pad(now.getMonth()+1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
      document.getElementById('pdfDate').textContent = `作成日時：${dateStr}`;

      addPdfItem(g, '氏名（漢字）', v('name'));
      addPdfItem(g, 'フリガナ', v('kana'));
      addPdfItem(g, '電話番号', v('phone'));
      addPdfItem(g, 'メール', v('email'));
      addPdfItem(g, '生年月日', v('birth'));

      addPdfItem(g, '住所', `${v('zip')} ${v('pref')}${v('city')}${v('addr1')}${v('addr2')}`);
      addPdfItem(g, '所属区分', v('aff'));
      addPdfItem(g, '所属会社名（任意）', v('company'));

      addPdfItem(g, '車種', v('carType'));
      addPdfItem(g, '車両ナンバー', v('carNo'));
      addPdfItem(g, '黒ナンバー', v('kuro'));

      addPdfItem(g, '銀行', v('bank'));
      addPdfItem(g, '支店', v('branch'));
      addPdfItem(g, '口座種別', v('accType'));
      addPdfItem(g, '口座番号', v('accNo'));
      addPdfItem(g, '口座名義（カナ）', v('accName'));

      // images (cropped)
      const front = await fileToCroppedDataURL(licF.files?.[0], 1600, 1000);
      const back  = await fileToCroppedDataURL(licB.files?.[0], 1600, 1000);

      const pdfImgF = document.getElementById('pdfImgF');
      const pdfImgB = document.getElementById('pdfImgB');
      pdfImgF.src = front || '';
      pdfImgB.src = back || '';

      // render to canvas
      const paper = document.getElementById('pdfPaper');

      // iOS対策：一瞬表示を確実に描画させる
      await new Promise(r=>setTimeout(r, 80));

      const canvas = await html2canvas(paper, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: true
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);

      // jsPDF A4（余白を必ず取って1ページに収める）
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF('p','mm','a4');
      const pageW = 210;
      const pageH = 297;

      // 余白（mm）
      const margin = 10;
      const maxW = pageW - margin*2;
      const maxH = pageH - margin*2;

      // canvas比率で“必ず収める”
      const imgW = maxW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let drawH = imgH;
      if (drawH > maxH) {
        drawH = maxH;
      }

      const drawW = (canvas.width * drawH) / canvas.height;

      const x = (pageW - drawW)/2;
      const y = margin;

      pdf.addImage(imgData, 'JPEG', x, y, drawW, drawH, '', 'FAST');

      // 端末により「保存/共有/印刷」はOSのPDFビュー側のボタンで全部できる
      pdf.save(`OFA_driver_entry_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.pdf`);

      toast('PDFを保存しました。共有→LINE送信／印刷が可能です。');

    }catch(e){
      console.error(e);
      alert('PDF作成に失敗しました。Safari/Chromeで開き直して再実行してください。');
    }
  };

  show();
})();
