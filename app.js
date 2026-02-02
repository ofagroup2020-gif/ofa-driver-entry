let current = 0;
const steps = document.querySelectorAll(".step");

function show() {
  steps.forEach((s, i) => s.classList.toggle("active", i === current));
  document.getElementById("stepNum").textContent = current + 1;
}

function next() {
  if (current < steps.length - 1) current++;
  show();
}

function prev() {
  if (current > 0) current--;
  show();
}

async function createPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  pdf.addFont("assets/NotoSansJP-Regular.ttf", "Noto", "normal");
  pdf.setFont("Noto");

  pdf.text("OFA GROUP ドライバーエントリーシート", 10, 10);
  pdf.save("ofa_driver_entry.pdf");
}

function sharePDF() {
  alert("PDFを作成後、共有してください");
}

show();
