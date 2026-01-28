const { jsPDF } = window.jspdf;

function preview(input, img){
  input.addEventListener("change", e=>{
    const file = e.target.files[0];
    if(!file) return;
    const url = URL.createObjectURL(file);
    img.src = url;
  });
}

preview(licFront, licFrontPrev);
preview(licBack, licBackPrev);

makePdfBtn.addEventListener("click", async ()=>{

  const pdf = new jsPDF({ unit:"mm", format:"a4" });

  const page = document.createElement("div");
  page.style.width = "210mm";
  page.style.padding = "14mm";
  page.style.background = "#fff";

  page.innerHTML = `
    <h2>OFA GROUP ドライバー登録シート</h2>
    <p>作成日時：${new Date().toLocaleString("ja-JP")}</p>
    <p>氏名：${name.value}</p>
    <p>フリガナ：${kana.value}</p>
    <p>電話番号：${phone.value}</p>
    <p>メール：${email.value}</p>
    <p>生年月日：${birth.value}</p>
    <p>住所：${zip.value} ${pref.value}${city.value}${addr1.value}${addr2.value}</p>
  `;

  if(licFrontPrev.src){
    const img = document.createElement("img");
    img.src = licFrontPrev.src;
    img.style.width = "100%";
    img.style.height = "120mm";
    img.style.objectFit = "cover";
    page.appendChild(img);
  }

  document.body.appendChild(page);

  const canvas = await html2canvas(page,{scale:2});
  const imgData = canvas.toDataURL("image/jpeg",0.95);

  pdf.addImage(imgData,"JPEG",0,0,210,297);
  pdf.save(`OFA_ドライバー登録.pdf`);

  document.body.removeChild(page);
});
