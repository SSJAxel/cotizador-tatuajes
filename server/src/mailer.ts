import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST ?? "localhost";
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 1025;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
});

export async function enviarMailResetPassword(email: string, slug: string, link: string): Promise<void> {
  await transporter.sendMail({
    from: '"Cotizador Tatuajes" <no-reply@cotizador-tatuajes.local>',
    to: email,
    subject: `Restablecer contraseña — ${slug}`,
    text: `Alguien pidió restablecer la contraseña de "${slug}". Si fuiste vos, abrí este link (vence en 1 hora):\n\n${link}\n\nSi no fuiste vos, ignorá este mail.`,
    html: `<p>Alguien pidió restablecer la contraseña de <strong>${slug}</strong>.</p><p>Si fuiste vos, abrí este link (vence en 1 hora):</p><p><a href="${link}">${link}</a></p><p>Si no fuiste vos, ignorá este mail.</p>`,
  });
}
