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
    },
  ]
};

const drawSection = (page, font, fontBold, fontSize, x, y, title, lines) => {
  const spacing = 20;
  page.drawText(title, {
    x,
    y,
    size: fontSize + 1,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  y -= spacing + 10;

  let totalLinesHeight = 0;
  lines.forEach(([label, value, delimiter, overrideFont]) => {
    delimiter = delimiter == undefined ? ': ' : delimiter;
    overrideFont = overrideFont == undefined ? font : overrideFont;
    page.drawText(`${label}${delimiter}${value}`, {
      x: x+10,
      y,
      size: fontSize,
      font: overrideFont,
      color: rgb(0, 0, 0),
    });
    y -= spacing;
    totalLinesHeight += spacing;
  });

  page.drawRectangle({
    x: x,
    y: y + totalLinesHeight + 20,
    width: 500,
    height: (totalLinesHeight + 20) * -1,
    borderColor: rgb(0, 0, 0),
    borderWidth: 1.5,
  })

  return y - spacing;
};

const createPdf = async () => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  let x = 50;
  let y = 790;
  const fontSize = 11;

  // Header
  page.drawText(`${metaJson.congregation.officialName} foredragsholdere`, {
    x,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  page.drawText('Page 1', {
    x: 520,
    y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4)
  });
  y -= 30;

  // Sections



  y = drawSection(page, font, fontBold, fontSize, x, y, 'Menighed', [
    ['Navn', metaJson.congregation.officialName],
    ['Nummer', metaJson.congregation.number],
    ['Adresse', metaJson.congregation.address],
    ['Kredsafsnit', metaJson.congregation.circuit],
    ['Mødetider', metaJson.congregation.meetingTime]
  ]);


  y = drawSection(page, font, fontBold, fontSize, x, y, 'Koordinator for ældsterådet', [
    ['Navn', metaJson.elderCoordinator.name],
    ['Email', metaJson.elderCoordinator.email],
    ['Telefon', metaJson.elderCoordinator.phone],
    ['Adresse', metaJson.elderCoordinator.address]
  ]);

  y = drawSection(page, font, fontBold, fontSize, x, y, 'Foredragskoordinator', [
    ['Name', metaJson.talkCoordinator.name],
    ['Email', metaJson.talkCoordinator.email],
    ['Telefon', metaJson.talkCoordinator.phone]
  ]);

  y -= 16;    
  
  page.drawText('Foredragsholdere', {
    x,
    y,
    size: fontSize+1,
    font: fontBold,
    color: rgb(0, 0, 0)
  });
  y -= 16 + 16;

  for (const speaker of metaJson.speakers) {
    const talkLanguages = speaker.talks.filter(t => t.language)
    const talks = speaker.talks.map(t => t.talkNumber).join(', ');
    
    const speakerLines = [
        ['Telefon', speaker.phone],
        ['Begravelse', speaker.funeralTalk ? 'Ja' : 'Nej'],
        ['Bryllup', speaker.weddingTalk ? 'Ja' : 'Nej'],
        ['Mindehøjtid', speaker.memorialTalk ? 'Ja' : 'Nej'],
        ['Foredrag', '', '', fontBold]
      ];

    const talkLines = speaker.talks
                        .sort(t => t.language)
                        .map(t => [t.language, speaker.talks.filter(x => x.language === t.language).sort(x => x.talkNumber).map(x => x.talkNumber).join(', ')])

    y = drawSection(page, font, fontBold, fontSize, x, y, `${speaker.name}`, [...speakerLines, ...talkLines]);
    if (y < 100) {
      y = 790;
    }
  }

  // Embed _meta field
  const form = pdfDoc.getForm();
  const metaField = form.createTextField('_meta');
  metaField.setText(JSON.stringify(metaJson));
  metaField.enableReadOnly();
//   metaField.setHidden(true);
  form.updateFieldAppearances();

  const pdfBytes = await pdfDoc.save();
  await fs.mkdir('./output', { recursive: true });
  await fs.writeFile(outputPath, pdfBytes);

  console.log(`✅ PDF generated at: ${outputPath}`);
};

createPdf();
