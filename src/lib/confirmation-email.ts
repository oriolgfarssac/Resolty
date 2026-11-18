import { contactEmail } from './contact.ts';
import type { Locale } from './i18n';

const messages = {
  en: {
    subject: 'Your Resolty early-access request is confirmed',
    text: 'Thanks for requesting early access to Resolty. We’ve saved your request and will email you when we have news about early testing. If you have a question, reply to this email.\n\nThe Resolty team',
  },
  es: {
    subject: 'Hemos recibido tu solicitud de acceso anticipado a Resolty',
    text: 'Gracias por solicitar acceso anticipado a Resolty. Hemos guardado tu solicitud y te escribiremos cuando haya novedades sobre las primeras pruebas. Si tienes alguna pregunta, responde a este correo.\n\nEl equipo de Resolty',
  },
  ca: {
    subject: 'Hem rebut la teva sol·licitud d’accés anticipat a Resolty',
    text: 'Gràcies per sol·licitar accés anticipat a Resolty. Hem desat la teva sol·licitud i t’escriurem quan hi hagi novetats sobre les primeres proves. Si tens cap pregunta, respon a aquest correu.\n\nL’equip de Resolty',
  },
} satisfies Record<Locale, { subject: string; text: string }>;

export async function sendConfirmationEmail(email: string, locale: Locale) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Resolty <${contactEmail}>`,
        to: [email],
        reply_to: contactEmail,
        ...messages[locale],
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) console.error('Confirmation email rejected by provider', response.status);
  } catch {
    console.error('Confirmation email could not reach provider');
  }
}
