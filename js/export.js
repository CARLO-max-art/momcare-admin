window.exportPDF = async function () {
  const { jsPDF } = window.jspdf;
  const form = document.querySelector(".form-card");

  // Hide buttons temporarily
  const buttons = document.querySelectorAll("button, .btn");
  buttons.forEach(btn => btn.style.display = "none");

  // Scroll to top for full capture
  window.scrollTo(0, 0);

  await html2canvas(form, { scale: 2 }).then(canvas => {
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save("BHW_Record.pdf");
  });

  // Show buttons again
  buttons.forEach(btn => btn.style.display = "inline-block");
};

window.exportExcel = function () {
  const inputs = document.querySelectorAll("input, select, textarea");
  const data = [];

  inputs.forEach(input => {
    const label = input.previousElementSibling?.innerText || input.name;
    const value = input.value;
    data.push({ Field: label, Value: value });
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "BHW_Record");

  XLSX.writeFile(workbook, "BHW_Record.xlsx");
};
window.printForm = function () {
  const form = document.querySelector(".form-card");

  // Hide all buttons temporarily
  const buttons = document.querySelectorAll("button, .btn");
  buttons.forEach(btn => btn.style.display = "none");

  // Open new window and write the form content
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Print BHW Record</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .row { display: flex; flex-wrap: wrap; margin-bottom: 10px; }
          .col { flex: 1 1 45%; margin: 5px; }
          label { font-weight: bold; display: block; margin-bottom: 4px; }
          input, textarea, select {
            width: 100%;
            padding: 6px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        ${form.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  printWindow.onload = function () {
    printWindow.focus();
    printWindow.print();
    printWindow.close();

    // Show buttons again after printing
    buttons.forEach(btn => btn.style.display = "inline-block");
  };
};

