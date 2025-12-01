// Set placeholder colors
document.getElementById('sysSwatch').style.background = '#000';
document.getElementById('diaSwatch').style.background = '#000';

// Maternal Record button
document.getElementById("btnMaternal").addEventListener("click", () => {
  window.location.href = "maternal_record.html";
});

// BHW Record button
document.getElementById("btnBhw").addEventListener("click", () => {
  window.location.href = "bhw_record.html";
});
