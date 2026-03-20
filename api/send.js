const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { to, subject, html, text, secret } = req.body;

  // Block unauthorized use
  const expectedSecret = process.env.EMAIL_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!to || !subject || !html) {
    return res.status(400).json({ error: "to, subject, html are required" });
  }

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "465");
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromName = process.env.FROM_NAME  || "Surer";
  const fromEmail= process.env.FROM_EMAIL || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.error("[email-server] SMTP credentials not configured");
    return res.status(500).json({ error: "Email service not configured" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host:   smtpHost,
      port:   smtpPort,
      secure: smtpPort === 465, // true for 465, false for 587
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // needed for some shared hosting SMTP servers
      },
    });

    await transporter.sendMail({
      from:    `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
    });

    console.log(`[email-server] Sent to ${to}: ${subject}`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("[email-server] Error:", err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};