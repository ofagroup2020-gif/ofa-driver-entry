const steps = document.querySelectorAll(".step");
const bar = document.getElementById("bar");
const label = document.getElementById("stepLabel");

let current = 1;

function setStep(n){
  current = n;
  steps.forEach(s => s.classList.toggle("active", Number(s.dataset.step)===n));
  bar.style.width = ((n-1)/(steps.length-1))*100 + "%";
  label.textContent = `STEP ${n} / ${steps.length}`;
}

document.getElementById("next").onclick = () => {
  if(current===7 && !document.getElementById("agree").checked){
    alert("規約に同意してください");
    return;
  }
  if(current < steps.length) setStep(current+1);
};

document.getElementById("back").onclick = () => {
  if(current > 1) setStep(current-1);
};

document.querySelectorAll(".selectBtn").forEach(btn=>{
  btn.onclick = () => {
    document.querySelectorAll(".selectBtn").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("affType").value = btn.dataset.value;
  };
});

setStep(1);
