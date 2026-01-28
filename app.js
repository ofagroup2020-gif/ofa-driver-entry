const steps=document.querySelectorAll('.step');
let cur=0;
const stepNo=document.getElementById('stepNo');
const bar=document.getElementById('bar');

function show(){
  steps.forEach(s=>s.classList.remove('active'));
  steps[cur].classList.add('active');
  stepNo.textContent=cur+1;
  bar.style.width=((cur+1)/8*100)+'%';
}

next.onclick=()=>{
  if(cur===6 && !agree.checked){alert('同意が必要です');return;}
  if(cur<7){cur++;show();}
}
back.onclick=()=>{if(cur>0){cur--;show();}}

document.querySelectorAll('.seg button').forEach(b=>{
  b.onclick=()=>aff.value=b.dataset.val;
});

function preview(input,img){
  input.onchange=()=>{
    const f=input.files[0];
    if(!f)return;
    img.src=URL.createObjectURL(f);
  }
}
preview(licF,prevF);
preview(licB,prevB);

pdfBtn.onclick=async()=>{
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF('p','mm','a4');

  const canvas=await html2canvas(document.body,{scale:2});
  const img=canvas.toDataURL('image/jpeg',1.0);

  const w=210;
  const h=canvas.height*w/canvas.width;
  pdf.addImage(img,'JPEG',0,0,w,h);
  pdf.save('OFA_driver_entry.pdf');
};

show();
