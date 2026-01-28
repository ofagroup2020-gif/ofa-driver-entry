const steps = document.querySelectorAll('.step');
let cur = 0;

const stepNo = document.getElementById('stepNo');
const bar = document.getElementById('bar');

function show() {
  steps.forEach(s=>s.classList.remove('active'));
  steps[cur].classList.add('active');
  stepNo.textContent = cur + 1;
  bar.style.width = ((cur+1)/8*100)+'%';
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

document.querySelectorAll('.seg button').forEach(b=>{
  b.onclick = ()=> document.getElementById('aff').value = b.dataset.val;
});

document.getElementById('pdfBtn').onclick = async () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');

  let y = 20;
  const line = (t)=>{ pdf.text(t,20,y); y+=8; if(y>270){pdf.addPage();y=20;} };

  line('OFA GROUP ドライバー登録シート');
  line(`氏名：${name.value}`);
  line(`電話：${phone.value}`);
  line(`住所：${pref.value}${city.value}${addr1.value}${addr2.value}`);

  const addImage = (file)=>{
    return new Promise(r=>{
      if(!file) return r();
      const img = new Image();
      img.onload = ()=>{
        const w = 170;
        const h = img.height * (w/img.width);
        if (y+h>270){pdf.addPage();y=20;}
        pdf.addImage(img,'JPEG',20,y,w,h,'','FAST');
        y+=h+10;
        r();
      };
      img.src = URL.createObjectURL(file);
    });
  };

  await addImage(licF.files[0]);
  await addImage(licB.files[0]);

  pdf.save('OFA_driver_entry.pdf');
};

show();
