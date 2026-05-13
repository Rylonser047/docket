import { Resend } from 'resend';

const resend = new Resend('re_gTRkG12b_Jnn4bML9u7bccAFFT8bVHxqR');
const FROM = 'Docket <onboarding@resend.dev>';

export async function sendInvoiceEmail(invoice, client, settings, pdfBuffer) {
  const subject = `Invoice ${invoice.invoice_number} from ${settings.business_name} — R${Number(invoice.total).toFixed(2)} due ${formatDate(invoice.due_date)}`;
  await resend.emails.send({
    from: FROM,
    to: client.email,
    subject,
    html: invoiceEmailHTML(invoice, client, settings),
    attachments: pdfBuffer ? [{
      filename: `${invoice.invoice_number}.pdf`,
      content: pdfBuffer.toString('base64'),
    }] : [],
  });
}

export async function sendReminderEmail(invoice, client, settings, reminderNum, pdfBuffer) {
  const subjects = {
    1: `Just a reminder — Invoice ${invoice.invoice_number} is due ${formatDate(invoice.due_date)}`,
    2: `Invoice ${invoice.invoice_number} is now overdue — please arrange payment`,
    3: `Final notice — Invoice ${invoice.invoice_number} requires immediate payment`,
  };

  await resend.emails.send({
    from: FROM,
    to: client.email,
    subject: subjects[reminderNum] || subjects[3],
    html: reminderEmailHTML(invoice, client, settings, reminderNum),
    attachments: reminderNum >= 2 && pdfBuffer ? [{
      filename: `${invoice.invoice_number}.pdf`,
      content: pdfBuffer.toString('base64'),
    }] : [],
  });
}

export async function sendTestimonialRequest(client, settings, token, baseUrl) {
  const reviewUrl = `${baseUrl}/review/${token}`;
  await resend.emails.send({
    from: FROM,
    to: client.email,
    subject: `How did we do? Leave ${settings.business_name} a quick review`,
    html: testimonialEmailHTML(client, settings, reviewUrl),
  });
}

export async function sendProposalEmail(proposal, client, settings, pdfBuffer) {
  await resend.emails.send({
    from: FROM,
    to: client.email,
    subject: `Proposal: ${proposal.title} from ${settings.business_name}`,
    html: proposalEmailHTML(proposal, client, settings),
    attachments: pdfBuffer ? [{
      filename: `proposal-${proposal.id}.pdf`,
      content: pdfBuffer.toString('base64'),
    }] : [],
  });
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function invoiceEmailHTML(invoice, client, settings) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0F6E56;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">DOCKET</h1>
        <p style="color:#a7f3d0;margin:4px 0 0">${settings.business_name}</p>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p>Hi ${client.name},</p>
        <p>Please find attached invoice <strong>${invoice.invoice_number}</strong> for <strong>R${Number(invoice.total).toFixed(2)}</strong>.</p>
        <p>Payment is due by <strong>${formatDate(invoice.due_date)}</strong>.</p>
        ${settings.bank_name ? `<div style="background:#f9fafb;padding:16px;border-radius:6px;margin:24px 0">
          <strong>Payment Details</strong><br>
          Bank: ${settings.bank_name}<br>
          Account: ${settings.bank_account}<br>
          ${settings.bank_branch ? `Branch: ${settings.bank_branch}<br>` : ''}
        </div>` : ''}
        <p>Thank you for your business!</p>
        <p style="color:#6b7280;font-size:14px">${settings.name}<br>${settings.business_name}</p>
      </div>
    </div>`;
}

function reminderEmailHTML(invoice, client, settings, num) {
  const tones = {
    1: `This is a friendly reminder that invoice <strong>${invoice.invoice_number}</strong> for <strong>R${Number(invoice.total).toFixed(2)}</strong> is due on <strong>${formatDate(invoice.due_date)}</strong>. Please arrange payment at your earliest convenience.`,
    2: `Invoice <strong>${invoice.invoice_number}</strong> for <strong>R${Number(invoice.total).toFixed(2)}</strong> is now overdue. Please arrange payment immediately. A copy of the invoice is attached.`,
    3: `This is a final notice regarding invoice <strong>${invoice.invoice_number}</strong> for <strong>R${Number(invoice.total).toFixed(2)}</strong>. This amount is significantly overdue. Please arrange payment immediately to avoid further action.`,
  };
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0F6E56;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">DOCKET</h1>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p>Hi ${client.name},</p>
        <p>${tones[num] || tones[3]}</p>
        ${settings.bank_name ? `<div style="background:#f9fafb;padding:16px;border-radius:6px;margin:24px 0">
          <strong>Payment Details</strong><br>
          Bank: ${settings.bank_name}<br>
          Account: ${settings.bank_account}
        </div>` : ''}
        <p style="color:#6b7280;font-size:14px">${settings.name}<br>${settings.business_name}</p>
      </div>
    </div>`;
}

function testimonialEmailHTML(client, settings, reviewUrl) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0F6E56;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">DOCKET</h1>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;text-align:center">
        <h2>How did we do?</h2>
        <p>Hi ${client.name}, we'd love to hear your feedback on working with <strong>${settings.business_name}</strong>.</p>
        <a href="${reviewUrl}" style="display:inline-block;background:#0F6E56;color:white;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0">Leave a Review</a>
        <p style="color:#6b7280;font-size:13px">Takes less than a minute.</p>
      </div>
    </div>`;
}

function proposalEmailHTML(proposal, client, settings) {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#111">
      <div style="background:#0F6E56;padding:24px 32px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:24px">DOCKET</h1>
        <p style="color:#a7f3d0;margin:4px 0 0">${settings.business_name}</p>
      </div>
      <div style="padding:32px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p>Hi ${client.name},</p>
        <p>Please find attached our proposal for <strong>${proposal.title}</strong>.</p>
        <p>We look forward to working with you. Please don't hesitate to reach out if you have any questions.</p>
        <p style="color:#6b7280;font-size:14px">${settings.name}<br>${settings.business_name}</p>
      </div>
    </div>`;
}
