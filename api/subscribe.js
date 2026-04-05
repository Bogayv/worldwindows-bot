import { Resend } from 'resend';

const resend = new Resend("re_YRjUCEx2_Pc6xPH9kixGSK6wrohguEpfP");

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST istekleri kabul edilir' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Geçersiz e-posta adresi' });
  }

  try {
    const data = await resend.emails.send({
      from: 'World Windows <onboarding@worldwindows.network>',
      to: email,
      subject: 'Welcome to World Windows Terminal',
      html: `
        <div style="font-family: Georgia, serif; background-color: #080c14; color: #e8e6e0; padding: 40px; text-align: center;">
          <h1 style="color: #c9a96e; font-family: 'Playfair Display', serif; font-size: 32px; letter-spacing: 2px;">WORLD WINDOWS</h1>
          <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
            Thank you for subscribing.<br/>
            You are now connected to the global news terminal.
          </p>
          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #1e2d4a; font-size: 12px; color: #8a9ab0;">
            © 2026 World Windows Network
          </div>
        </div>
      `
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Mail gönderme hatası:', error);
    res.status(500).json({ error: 'Sunucu hatası: Mail gönderilemedi' });
  }
}
