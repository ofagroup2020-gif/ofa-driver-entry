import { jsPDF } from "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.es.min.js";

/* ===== フォント読み込み ===== */
async function loadFont(doc) {
  const font = await fetch("./fonts/NotoSansJP-Regular.ttf").then(r => r.arrayBuffer());
  doc.addFileToVFS("NotoSansJP-Regular.ttf", btoa(
    new Uint8Array(font).reduce((d,b)=>d+String.fromCharCode(b),'')
  ));
  doc.addFont("NotoSansJP-Regular.ttf", "NotoSansJP", "normal");
  doc.setFont("NotoSansJP");
}

/* ===== 画像をbase64に ===== */
function fileToDataURL(file) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.readAsDataURL(file);
  });
}

/* ===== PDF生成 ===== */
document.getElementById("makePdf").onclick = async () => {

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await loadFont(doc);

  let y = 15;

  const line = (label, value) => {
    doc.setFontSize(10);
    doc.text(label, 15, y);
    doc.setFontSize(11);
    doc.text(value || "―", 60, y);
    y += 7;
  };

  /* タイトル */
  doc.setFontSize(16);
  doc.text("OFA GROUP ドライバー登録シート", 15, y);
  y += 10;

  /* 基本情報 */
  doc.setFontSize(13);
  doc.text("■ ドライバー基本情報", 15, y); y += 8;

  line("氏名", document.getElementById("name").value);
  line("フリガナ", document.getElementById("kana").value);
  line("電話番号", document.getElementById("phone").value);
  line("メール", document.getElementById("email").value);
  line("生年月日", document.getElementById("birth").value);

  y += 5;
  doc.text("■ 住所", 15, y); y += 8;

  line("郵便番号", document.getElementById("zip").value);
  line("都道府県", document.getElementById("pref").value);
  line("市区町村", document.getElementById("city").value);
  line("番地", document.getElementById("addr1").value);
  line("建物名", document.getElementById("addr2").value);

  y += 5;
  doc.text("■ 車両情報", 15, y); y += 8;

  line("車種", document.getElementById("vehicleType").value);
  line("ナンバー", document.getElementById("plate").value);
  line("黒ナンバー", document.getElementById("blackPlate").value);

  y += 5;
  doc.text("■ 振込先", 15, y); y += 8;

  line("銀行名", document.getElementById("bank").value);
  line("支店名", document.getElementById("branch").value);
  line("口座種別", document.getElementById("acctType").value);
  line("口座番号", document.getElementById("acctNo").value);
  line("口座名義", document.getElementById("acctName").value);

  /* 写真ページ */
  const front = document.getElementById("licFront").files[0];
  const back  = document.getElementById("licBack").files[0];

  if (front || back) {
    doc.addPage();
    doc.setFontSize(13);
    doc.text("■ 運転免許証", 15, 15);

    let iy = 25;

    if (front) {
      const img = await fileToDataURL(front);
      doc.text("表面", 15, iy);
      doc.addImage(img, "JPEG", 15, iy + 5, 80, 50);
    }

    if (back) {
      const img = await fileToDataURL(back);
      doc.text("裏面", 110, iy);
      doc.addImage(img, "JPEG", 110, iy + 5, 80, 50);
    }
  }

  /* 保存 */
  doc.save("OFA_Driver_Entry.pdf");
};
