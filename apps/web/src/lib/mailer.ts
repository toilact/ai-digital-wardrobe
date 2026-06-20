import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value.trim();
}

function getTransporter() {
  if (transporter) return transporter;

  const user = requireEnv("EMAIL_USER");
  const pass = requireEnv("EMAIL_APP_PASSWORD");

  const host = process.env.EMAIL_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_PORT || 465);
  const secure = String(process.env.EMAIL_SECURE || "true") === "true";

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });

  return transporter;
}

export async function sendPasswordResetCodeEmail(to: string, code: string) {
  const user = requireEnv("EMAIL_USER");
  const from = process.env.EMAIL_FROM?.trim() || `AI Digital Wardrobe <${user}>`;

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <h2 style="margin-bottom: 12px;">Đặt lại mật khẩu</h2>
      <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản AI Digital Wardrobe.</p>
      <p>Mã xác nhận của bạn là:</p>
      <div style="
        display: inline-block;
        padding: 12px 20px;
        font-size: 28px;
        font-weight: bold;
        letter-spacing: 6px;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 12px;
        color: #1d4ed8;
        margin: 12px 0;
      ">
        ${code}
      </div>
      <p>Mã có hiệu lực trong <strong>10 phút</strong>.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.</p>
    </div>
  `;

  const text = `Ma xac nhan dat lai mat khau cua ban la: ${code}. Ma co hieu luc trong 10 phut.`;

  const tx = getTransporter();

  if (process.env.NODE_ENV !== "production") {
    await tx.verify();
  }

  await tx.sendMail({
    from,
    to,
    subject: "Ma xac nhan dat lai mat khau - AI Digital Wardrobe",
    text,
    html,
  });
}