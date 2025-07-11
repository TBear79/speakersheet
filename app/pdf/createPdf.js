import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function createPdf(metaJson) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const fontSize = 11;
  const lineSpacing = 20;
  const minY = 100;

  let y = pageHeight - margin;
  let pageCount = 1;
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight]);

  const drawHeader = () => {
    currentPage.drawText(`${metaJson.congregation.officialName} foredragsholdere`, {
      x: margin,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    currentPage.drawText(`Side ${pageCount}`, {
      x: pageWidth - margin - 50,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });
    y -= 30;
  };

  const createNewPage = () => {
    currentPage = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
    pageCount++;
    drawHeader();
  };

  const drawSection = (title, lines) => {
    const boxHeight = (lines.length + 1) * lineSpacing + 20;
    if (y - boxHeight < minY) createNewPage();

    let localY = y;

    currentPage.drawText(title, {
      x: margin,
      y: localY,
      size: fontSize + 1,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    localY -= lineSpacing + 10;

    lines.forEach(([label, value, delimiter = ': ', overrideFont = font]) => {
      currentPage.drawText(`${label}${delimiter}${value}`, {
        x: margin + 10,
        y: localY,
        size: fontSize,
        font: overrideFont,
        color: rgb(0, 0, 0),
      });
      localY -= lineSpacing;
    });

    currentPage.drawRectangle({
      x: margin,
      y: y - 10,
      width: 500,
      height: -boxHeight + 25,
      borderColor: rgb(0.5, 0.5, 0.5),
      borderWidth: 1.5,
    });

    y -= boxHeight + 10;
  };

  const createHiddenJsonField = () => {
    const form = pdfDoc.getForm();
    const hiddenField = form.createTextField('_meta');
    hiddenField.setText(JSON.stringify(metaJson));
    hiddenField.enableReadOnly();
      
    // Gem det lille felt nederst i margin og uden visning
    hiddenField.addToPage(currentPage, {
      x: -5000,
      y: -5000,
      width: 0.1,
      height: 0.1,
      borderWidth: 0,
      textColor: rgb(1, 1, 1), // hvid tekst
    });
  }

  drawHeader();

  drawSection('Menighed', [
    ['Navn', metaJson.congregation.officialName],
    ['Nummer', metaJson.congregation.number],
    ['Adresse', metaJson.congregation.address],
    ['Kredsafsnit', metaJson.congregation.circuit],
    ['Mødetider', metaJson.congregation.meetingTime]
  ]);

  y -= 16;

  drawSection('Koordinator for ældsterådet', [
    ['Navn', metaJson.elderCoordinator.name],
    ['Email', metaJson.elderCoordinator.email],
    ['Telefon', metaJson.elderCoordinator.phone],
    ['Adresse', metaJson.elderCoordinator.address]
  ]);

  y -= 16;

  drawSection('Foredragskoordinator', [
    ['Navn', metaJson.talkCoordinator.name],
    ['Email', metaJson.talkCoordinator.email],
    ['Telefon', metaJson.talkCoordinator.phone]
  ]);

  y -= 16;
  currentPage.drawText('Foredragsholdere', {
    x: margin,
    y,
    size: fontSize + 1,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  y -= 25;

  for (const speaker of metaJson.speakers) {
    const speakerLines = [
      ['Telefon', speaker.phone],
      ['Begravelsesforedrag', speaker.funeralTalk ? 'Ja' : 'Nej'],
      ['Bryllupsforedrag', speaker.weddingTalk ? 'Ja' : 'Nej'],
      ['Mindehøjtidsforedrag', speaker.memorialTalk ? 'Ja' : 'Nej'],
      ['Foredrag', '', '', fontBold]
    ];

    const distinctLanguages = [...new Set(speaker.talks.map(t => t.language))];
    const talkLines = distinctLanguages
      .sort((a, b) => a.localeCompare(b))
      .map(l => [
        l,
        speaker.talks
          .filter(t => t.language === l)
          .sort((a, b) => a.talkNumber - b.talkNumber)
          .map(t => t.talkNumber)
          .join(', ')
      ]);

    drawSection(`${speaker.name}`, [...speakerLines, ...talkLines]);
  }

  createHiddenJsonField();

  return await pdfDoc.save(); // Returnerer som buffer
}
