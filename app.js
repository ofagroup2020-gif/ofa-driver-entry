/* ===============================
   OFA GROUP Driver Entry App
   PDF Generator（Safari / Chrome対応）
=============================== */

const { jsPDF } = window.jspdf;

document.getElementById("makePdfBtn").addEventListener("click", async () => {

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const page = document.createElement("div");
  page.className = "pdfPage";

  page.innerHTML = `
    <div class="pdfHeader">
      <div class="pdfTitle">OFA GROUP ドライバー登録シート</div>
      <div class="pdfDate">
        作成日時：${new Date().toLocaleString("ja-JP")}
        <br>One for All, All for One
      </div>
    </div>

    <div class="pdfGrid">
      ${box("氏名（漢字）", v("name"))}
      ${box("フリガナ", v("kana"))}
      ${box("電話番号", v("phone"))}
      ${box("メール", v("email"))}
      ${box("生年月日", v("birth"))}
      ${box("住所", fullAddr())}
      ${box("所属区分", v("affType"))}
      ${box("所属会社名", v("company"))}
      ${box("車種", v("vehicleType"))}
      ${box("車両ナンバー", v("plate"))}
      ${box("黒ナンバー", v("blackPlate"))}
      ${box("銀行", v("bank"))}
      ${box("支店", v("branch"))}
      ${box("口座番号", v("acctNo"))}
      ${box("口座名義", v("acctName"))}
    </div>

    <div class="pdfImgWrap">
      <div class="pdfImgTitle">提出画像</div>
      <div class="pdfImgGrid">
        ${imgBox("免許証 表面", "licFrontPrev")}
        ${imgBox("免許証 裏面", "licBackPrev")}
      </div>
    </div>

    <div class="pdfFooter">
      このPDFを「OFAメンバーシップLINE」へ添付して送信してください。
    </div>
  `;

  document.body.appendChild(page);

  await html2canvas(page, {
    scale: 3,                 // 🔥 高解像度
    useCORS: true,
    backgroundColor: "#ffffff"
  }).then(canvas => {
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    pdf.addImage(imgData, "JPEG", 0, 0, 210, 297);
  });

  pdf.save(`OFA_ドライバー登録_${v("name")}.pdf`);
  document.body.removeChild(page);

  alert("PDFを保存しました。共有・印刷が可能です。");
});

/* ===== Helpers ===== */
function v(id){
  const el = document.getElementById(id);
  return el ? el.value || "未入力" : "未入力";
}

function fullAddr(){
  return `${v("zip")} ${v("pref")} ${v("city")} ${v("addr1")} ${v("addr2")}`;
}

function box(label, value){
  return `
    <div class="pdfBox">
      <div class="pdfLabel">${label}</div>
      <div class="pdfValue">${value}</div>
    </div>
  `;
}

function imgBox(label, imgId){
  const img = document.getElementById(imgId);
  if(!img || !img.src) return `<div class="pdfBox">未提出</div>`;
  return `
    <div class="pdfImgBox">
      <img src="${img.src}">
    </div>
  `;
}
