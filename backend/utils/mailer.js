// utils/mailer.js
import { farmInfo } from "../config/farmInfo.js";

let transporter;
let nodemailerModulePromise;

const loadNodemailer = async () => {
  if (!nodemailerModulePromise) {
    nodemailerModulePromise = import("nodemailer")
      .then((m) => m.default || m)
      .catch((err) => {
        console.error("Failed to load nodemailer:", err);
        throw err;
      });
  }
  return nodemailerModulePromise;
};

const createTransporter = async () => {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  const missing = [];
  if (!SMTP_HOST) missing.push("SMTP_HOST");
  if (!SMTP_PORT) missing.push("SMTP_PORT");
  
  if (missing.length > 0) {
    console.warn(`Mailer skipped: Missing variables [${missing.join(", ")}]. Order emails will not be sent.`);
    return null;
  }

  const port = Number(SMTP_PORT) || 587;
  const secure =
    typeof SMTP_SECURE === "string"
      ? SMTP_SECURE.toLowerCase() === "true"
      : port === 465;

  const nodemailer = await loadNodemailer();
  
  const config = {
    host: SMTP_HOST,
    port,
    secure,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    // Add a short timeout to prevent hanging
    connectionTimeout: 10000, 
    greetingTimeout: 10000,
    socketTimeout: 10000,
  };

  try {
    const newTransporter = nodemailer.createTransport(config);
    // Verify connection configuration
    await newTransporter.verify();
    console.log("✅ Mailer transporter verified and ready.");
    transporter = newTransporter;
    return transporter;
  } catch (error) {
    if (error.code === 'EAUTH' && SMTP_HOST.includes('gmail.com')) {
      console.error("❌ Gmail Authentication Failed: Google requires an 'App Password' for third-party apps. Your regular password will not work.");
      console.error("👉 Fix: Enable 2-Step Verification and generate an App Password at https://myaccount.google.com/apppasswords");
    } else {
      console.error("❌ Mailer configuration error:", error);
    }
    return null;
  }
};

const resolveFromAddress = () => {
  const fromAddress = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  if (!fromAddress || !fromAddress.includes("@")) {
    console.warn("Mailer skipped: SMTP_FROM_EMAIL or SMTP_USER must be a valid email.");
    return null;
  }
  const brand =
    process.env.INVOICE_BRAND_NAME ||
    process.env.SMTP_FROM_NAME ||
    farmInfo.name ||
    "Smart Farm System";
  return `${brand} <${fromAddress}>`;
};

const resolveBrandName = () =>
  process.env.INVOICE_BRAND_NAME || farmInfo.name || "Smart Farm System";

export const sendOrderEmail = async (order, pdfBuffer) => {
  try {
    if (!order) {
      console.warn("Mailer skipped: order payload is missing.");
      return;
    }
    const to = order?.customer?.email;
    if (!to) {
      console.warn("Mailer skipped: order.customer.email is not available.");
      return;
    }

    const transporterInstance = await createTransporter();
    if (!transporterInstance) {
      console.warn("Mailer skipped: Transporter not initialized.");
      return;
    }

    const from = resolveFromAddress();
    if (!from) {
      console.warn("Mailer skipped: From address could not be resolved.");
      return;
    }

    const brandName = resolveBrandName();
    const orderNumber = order.orderNumber || order.stripeSessionId || order._id || "";
    const customerName = order?.customer?.name || "Customer";

    const subject = `Your ${brandName} order ${orderNumber ? `#${orderNumber}` : ""} invoice`.trim();
    const plainTextBody = [
      `Hi ${customerName},`,
      "",
      "Thank you for your purchase! Attached is the invoice for your recent order.",
      orderNumber ? `Order reference: ${orderNumber}` : null,
      "",
      "Best regards,",
      brandName,
    ]
      .filter(Boolean)
      .join("\n");

    const htmlBody = `
      <p>Hi ${customerName},</p>
      <p>Thank you for your purchase! Attached is the invoice for your recent order${
        orderNumber ? ` <strong>#${orderNumber}</strong>` : ""
      }.</p>
      ${orderNumber ? `<p>Order reference: <strong>${orderNumber}</strong></p>` : ""}
      <p>Best regards,<br/>${brandName}</p>
    `;

    const hasAttachment =
      Buffer.isBuffer(pdfBuffer) || pdfBuffer instanceof Uint8Array;

    const attachments = hasAttachment
      ? [{ filename: `invoice-${orderNumber || "receipt"}.pdf`, content: pdfBuffer }]
      : [];

    console.log(`Attempting to send order email to: ${to}, order: ${orderNumber}`);
    
    const info = await transporterInstance.sendMail({
      from,
      to,
      subject,
      text: plainTextBody,
      html: htmlBody,
      attachments,
    });

    console.log(`Order email sent successfully: ${info.messageId}`);
  } catch (error) {
    console.error("Failed to send order email:", error);
    // Rethrow error to be handled by caller if needed
    throw error;
  }
};
