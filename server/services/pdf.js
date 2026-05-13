import PDFDocument from 'pdfkit';

const TEAL = '#0F6E56';
const BLACK = '#111111';
const GRAY = '#6B7280';
const LIGHT = '#F3F4F6';

export function generateInvoicePDF(invoice, client, settings, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  if (res) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${invoice.invoice_number}.pdf"`);
    doc.pipe(res);
  }

  const pageWidth = doc.page.width - 100;

  // Header
  doc.fontSize(28).fillColor(TEAL).font('Helvetica-Bold').text('DOCKET', 50, 50);
  doc.fontSize(10).fillColor(GRAY).font('Helvetica').text(settings.business_name || '', 50, 85);
  doc.fontSize(10).fillColor(GRAY).text(settings.email || '', 50, 100);
  if (settings.phone) doc.text(settings.phone, 50, 115);
  if (settings.address) doc.text(settings.address, 50, 130);

  doc.fontSize(22).fillColor(BLACK).font('Helvetica-Bold').text('INVOICE', 0, 50, { align: 'right' });
  doc.fontSize(10).fillColor(GRAY).font('Helvetica');
  doc.text(`Invoice #: ${invoice.invoice_number}`, 0, 80, { align: 'right' });
  doc.text(`Issue Date: ${formatDate(invoice.created_at)}`, 0, 95, { align: 'right' });
  doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 0, 110, { align: 'right' });

  // Divider
  doc.moveTo(50, 165).lineTo(doc.page.width - 50, 165).strokeColor(TEAL).lineWidth(2).stroke();

  // Bill To
  doc.y = 185;
  doc.fontSize(9).fillColor(TEAL).font('Helvetica-Bold').text('BILL TO', 50);
  doc.fontSize(11).fillColor(BLACK).font('Helvetica-Bold').text(client.name, 50, doc.y + 4);
  doc.fontSize(10).fillColor(GRAY).font('Helvetica');
  if (client.company) doc.text(client.company, 50);
  if (client.email) doc.text(client.email, 50);
  if (client.phone) doc.text(client.phone, 50);
  if (client.address) doc.text(client.address, 50);

  // Line items table
  const tableTop = doc.y + 30;
  const colDesc = 50;
  const colQty = 320;
  const colUnit = 390;
  const colTotal = 470;

  // Table header
  doc.rect(50, tableTop, pageWidth, 24).fill(TEAL);
  doc.fontSize(9).fillColor('white').font('Helvetica-Bold');
  doc.text('DESCRIPTION', colDesc + 5, tableTop + 7);
  doc.text('QTY', colQty, tableTop + 7, { width: 60, align: 'center' });
  doc.text('UNIT PRICE', colUnit, tableTop + 7, { width: 70, align: 'right' });
  doc.text('TOTAL', colTotal, tableTop + 7, { width: 75, align: 'right' });

  // Line items
  const lineItems = typeof invoice.line_items === 'string'
    ? JSON.parse(invoice.line_items)
    : invoice.line_items || [];

  let y = tableTop + 24;
  lineItems.forEach((item, i) => {
    const rowBg = i % 2 === 0 ? 'white' : LIGHT;
    doc.rect(50, y, pageWidth, 22).fill(rowBg);
    doc.fontSize(10).fillColor(BLACK).font('Helvetica');
    doc.text(item.description || '', colDesc + 5, y + 5, { width: 260 });
    doc.text(String(item.quantity || 1), colQty, y + 5, { width: 60, align: 'center' });
    doc.text(formatZAR(item.unitPrice || 0), colUnit, y + 5, { width: 70, align: 'right' });
    doc.text(formatZAR((item.quantity || 1) * (item.unitPrice || 0)), colTotal, y + 5, { width: 75, align: 'right' });
    y += 22;
  });

  // Totals
  y += 15;
  doc.fontSize(10).fillColor(GRAY).font('Helvetica');
  doc.text('Subtotal', colUnit, y, { width: 70, align: 'right' });
  doc.fillColor(BLACK).text(formatZAR(invoice.subtotal || 0), colTotal, y, { width: 75, align: 'right' });

  y += 18;
  doc.fillColor(GRAY).text(`VAT (${invoice.vat_rate || 15}%)`, colUnit, y, { width: 70, align: 'right' });
  doc.fillColor(BLACK).text(formatZAR(invoice.vat_amount || 0), colTotal, y, { width: 75, align: 'right' });

  y += 5;
  doc.moveTo(colUnit, y).lineTo(doc.page.width - 50, y).strokeColor(TEAL).lineWidth(1).stroke();
  y += 8;

  doc.rect(colUnit - 10, y, pageWidth - colUnit + 60, 28).fill(TEAL);
  doc.fontSize(12).fillColor('white').font('Helvetica-Bold');
  doc.text('TOTAL DUE', colUnit, y + 7, { width: 70, align: 'right' });
  doc.text(formatZAR(invoice.total || 0), colTotal, y + 7, { width: 75, align: 'right' });

  // Bank details
  if (settings.bank_name || settings.bank_account) {
    y += 50;
    doc.fontSize(9).fillColor(TEAL).font('Helvetica-Bold').text('PAYMENT DETAILS', 50, y);
    doc.fontSize(9).fillColor(GRAY).font('Helvetica');
    if (settings.bank_name) doc.text(`Bank: ${settings.bank_name}`, 50, y + 14);
    if (settings.bank_account) doc.text(`Account: ${settings.bank_account}`, 50, y + 26);
    if (settings.bank_branch) doc.text(`Branch: ${settings.bank_branch}`, 50, y + 38);
    if (settings.vat_number) doc.text(`VAT No: ${settings.vat_number}`, 50, y + 50);
  }

  // Footer
  const footerY = doc.page.height - 60;
  doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor(LIGHT).lineWidth(1).stroke();
  doc.fontSize(9).fillColor(GRAY).font('Helvetica');
  doc.text(`Payment due ${formatDate(invoice.due_date)}. Thank you for your business.`, 50, footerY + 10, {
    align: 'center', width: pageWidth
  });

  doc.end();
  return doc;
}

function formatZAR(amount) {
  return `R ${Number(amount).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}
