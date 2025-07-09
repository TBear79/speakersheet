import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';

const outputPath = './output/pdf-skabelon.pdf';

const metaJson = {
  templateVersion: "2025.1.0",
  createdBy: "SpeakerSheet",
  congregation: {
    officialName: "Århus Vestbyen",
    nickname: "Vestbyen",
    number: "12456",
    address: "Vestergade 45, 8000 Århus",
    circuit: "S8",
    meetingTime: "Søndag 10:30"
  },
  elderCoordinator: {
    name: "John Smith",
    email: "john@example.com",
    phone: "+45 12345678",
    address: "Elder Street 5, 1234 City"
  },
  talkCoordinator: {
    name: "Peter Jensen",
    email: "peter@example.com",
    phone: "+45 87654321"
  },
  speakers: [
    {
      name: "Hans Hansen",
      phone: "+45 11223344",
      funeralTalk: true,
      weddingTalk: false,
      memorialTalk: true,
      talks: [
        { talkNumber: 101, language: "Dansk" },
        { talkNumber: 45, language: "Dansk" },
        { talkNumber: 213, language: "Dansk" },
        { talkNumber: 205, language: "Engelsk" }
      ]
    },
    {
      name: "Kristian Kristensen",
      phone: "+45 99887766",
      funeralTalk: false,
      weddingTalk: true,
      memorialTalk: false,
      talks: [
        { talkNumber: 303, language: "Dansk" }
      ]
    }
  ]
};

const drawSection = (page, font, fontBold, fontSize, x, y, title, lines) => {
  const spacing = 20;
  let localY = y;
  page.drawText(title, {
    x,
    y: localY,
    size: fontSize + 1,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  localY -= spacing + 10;

  let totalLinesHeight = 0;
  lines.forEach(([label, value, delimiter, overrideFont]) => {
    delimiter = delimiter == undefined ? ': ' : delimiter;
    overrideFont = overrideFont == undefined ? font : overrideFont;
    page.drawText(`${label}${delimiter}${value}`, {
      x: x + 10,
      y: localY,
      size: fontSize,
      font: overrideFont,
      color: rgb(0, 0, 0),
    });
    localY -= spacing;
    totalLinesHeight += spacing;
  });

  const boxHeight = (totalLinesHeight + 20);
  page.drawRectangle({
    x: x,
    y: y- 10,
    width: 500,
    height: -boxHeight,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1.5,
  });

  return boxHeight + 30;
};

const createPdf = async () => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let x = 50;
  let y = 790;
  const fontSize = 11;
  let pageCount = 1;

  let currentPage = pdfDoc.addPage([595.28, 841.89]);
  const drawHeader = () => {
    currentPage.drawText(`${metaJson.congregation.officialName} foredragsholdere`, {
      x,
      y,
      size: 16,
      font: fontBold,
      color: rgb(0, 0, 0)
    });
    currentPage.drawText(`Side ${pageCount}`, {
      x: 520,
      y,
      size: 10,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });
    y -= 30;
  };
  drawHeader();

  const createNewPage = () => {
    currentPage = pdfDoc.addPage([595.28, 841.89]);
    y = 790;
    pageCount++;
    drawHeader();
  };

  const minY = 100;

  const drawAutoSection = (title, lines) => {
    const estimatedHeight = (lines.length + 1) * 20 + 40;
    if (y - estimatedHeight < minY) createNewPage();
    const used = drawSection(currentPage, font, fontBold, fontSize, x, y, title, lines);
    y -= used;
  };

  drawAutoSection('Menighed', [
    ['Navn', metaJson.congregation.officialName],
    ['Nummer', metaJson.congregation.number],
    ['Adresse', metaJson.congregation.address],
    ['Kredsafsnit', metaJson.congregation.circuit],
    ['Mødetider', metaJson.congregation.meetingTime]
  ]);

  drawAutoSection('Koordinator for ældsterådet', [
    ['Navn', metaJson.elderCoordinator.name],
    ['Email', metaJson.elderCoordinator.email],
    ['Telefon', metaJson.elderCoordinator.phone],
    ['Adresse', metaJson.elderCoordinator.address]
  ]);

  drawAutoSection('Foredragskoordinator', [
    ['Navn', metaJson.talkCoordinator.name],
    ['Email', metaJson.talkCoordinator.email],
    ['Telefon', metaJson.talkCoordinator.phone]
  ]);

  y -= 16;
  currentPage.drawText('Foredragsholdere', {
    x,
    y,
    size: fontSize + 1,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  y -= 32;

  for (const speaker of metaJson.speakers) {
    const speakerLines = [
      ['Telefon', speaker.phone],
      ['Begravelse', speaker.funeralTalk ? 'Ja' : 'Nej'],
      ['Bryllup', speaker.weddingTalk ? 'Ja' : 'Nej'],
      ['Mindehøjtid', speaker.memorialTalk ? 'Ja' : 'Nej'],
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
    drawAutoSection(`${speaker.name}`, [...speakerLines, ...talkLines]);
  }

  currentPage.drawText(JSON.stringify(metaJson), {
    x: -5000,
    y: -5000,
    size: 0.1,
    color: rgb(1, 1, 1)
  });

  const pdfBytes = await pdfDoc.save();
  await fs.mkdir('./output', { recursive: true });
  await fs.writeFile(outputPath, pdfBytes);

  console.log(`✅ PDF generated at: ${outputPath}`);
};

createPdf();