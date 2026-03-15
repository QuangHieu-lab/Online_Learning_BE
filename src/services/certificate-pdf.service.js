const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const CERTIFICATE_DIR = path.join(__dirname, '../../uploads/certificates');

function ensureCertificateDir() {
  fs.mkdirSync(CERTIFICATE_DIR, { recursive: true });
}

function getCertificateFilename(serialNumber) {
  return `${serialNumber}.pdf`;
}

function getCertificatePdfAbsolutePath(serialNumber) {
  return path.join(CERTIFICATE_DIR, getCertificateFilename(serialNumber));
}

function getCertificateViewPath(certificateId) {
  return `/api/certificates/${certificateId}/file`;
}

function getCertificateDownloadPath(certificateId) {
  return `/api/certificates/${certificateId}/download`;
}

function formatIssuedDate(issuedAt) {
  return new Date(issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function drawCertificateLayout(doc, payload) {
  const {
    studentName,
    courseTitle,
    instructorName,
    issuedAt,
    serialNumber,
    grade,
  } = payload;

  doc.rect(36, 36, 720, 540).lineWidth(2).stroke('#D4AF37');
  doc.rect(52, 52, 688, 508).lineWidth(1).stroke('#E6D5A3');

  doc.font('Helvetica-Bold').fontSize(30).fillColor('#1A202C').text('Certificate of Completion', 0, 88, {
    align: 'center',
  });

  doc.font('Helvetica').fontSize(14).fillColor('#4A5568').text('This certificate is proudly presented to', 0, 152, {
    align: 'center',
  });

  doc.font('Helvetica-Bold').fontSize(28).fillColor('#111827').text(studentName, 0, 188, {
    align: 'center',
  });

  doc.moveTo(220, 228).lineTo(572, 228).lineWidth(1).stroke('#D1D5DB');

  doc.font('Helvetica').fontSize(14).fillColor('#4A5568').text('for successfully completing the course', 0, 256, {
    align: 'center',
  });

  doc.font('Helvetica-Bold').fontSize(24).fillColor('#1F2937').text(courseTitle, 90, 292, {
    align: 'center',
    width: 612,
  });

  doc.font('Helvetica').fontSize(13).fillColor('#4B5563');
  doc.text(`Instructor: ${instructorName}`, 96, 382);
  doc.text(`Completed: ${formatIssuedDate(issuedAt)}`, 96, 406);
  doc.text(`Grade: ${Number(grade).toFixed(1)}%`, 96, 430);
  doc.text(`Serial Number: ${serialNumber}`, 96, 454);

  doc.moveTo(96, 515).lineTo(260, 515).lineWidth(1).stroke('#111827');
  doc.font('Helvetica').fontSize(12).fillColor('#6B7280').text('BeeEnglish Platform', 96, 522);

  doc.circle(630, 490, 52).lineWidth(2).stroke('#D4AF37');
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#D4AF37').text('CERTIFIED', 593, 482);
  doc.font('Helvetica').fontSize(10).fillColor('#6B7280').text('ONLINE LEARNING', 582, 500);
}

async function generateCertificatePdf(payload) {
  ensureCertificateDir();

  const targetPath = getCertificatePdfAbsolutePath(payload.serialNumber);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 36, bottom: 36, left: 36, right: 36 },
    });

    const stream = fs.createWriteStream(targetPath);
    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);
    drawCertificateLayout(doc, payload);
    doc.end();
  });

  return targetPath;
}

module.exports = {
  generateCertificatePdf,
  getCertificatePdfAbsolutePath,
  getCertificateViewPath,
  getCertificateDownloadPath,
};
