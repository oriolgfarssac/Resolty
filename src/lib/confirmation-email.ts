import { contactEmail } from './contact.ts';
import { copy, spending, type Locale } from './i18n';

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

type Message = { subject: string; text: string };
type Registration = {
  name: string;
  email: string;
  company: string;
  spend: string;
  choices: string[];
  use: string;
  lang: Locale;
};

const legacySpending: Record<string, string> = {
  under_100: 'Menos de 100 €',
  '100_500': '100–500 €',
  '250_500': '250–500 €',
  '500_1000': '500–1.000 €',
  over_1000: 'Más de 1.000 €',
};

function registrationNotice(registration: Registration): Message {
  const { name, email, company, spend, choices, use, lang } = registration;
  const labels = copy.es.form;
  const range = labels.ranges[spending.indexOf(spend)] ?? legacySpending[spend] ?? spend;
  const selectedTools = choices.map((tool) => {
    if (tool === 'other') return labels.toolChoices[0];
    if (tool === 'none') return labels.toolChoices[1];
    return tool;
  });
  return {
    subject: 'Nuevo registro de acceso anticipado',
    text: [
      `Nombre: ${name}`,
      `Correo: ${email}`,
      `Empresa: ${company}`,
      `Gasto mensual estimado: ${range}`,
      `Herramientas de IA: ${selectedTools.join(', ') || 'Sin indicar'}`,
      `Idioma del formulario: ${lang.toUpperCase()}`,
      '',
      'Uso principal de la IA:',
      use || 'Sin indicar',
    ].join('\n'),
  };
}

async function sendEmail(key: string, to: string, message: Message, purpose: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Resolty <${contactEmail}>`,
        to: [to],
        reply_to: contactEmail,
        ...message,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) console.error('Early-access email rejected by provider', purpose, response.status);
  } catch {
    console.error('Early-access email could not reach provider', purpose);
  }
}

export async function sendEarlyAccessEmails(registration: Registration) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return;

  await Promise.all([
    sendEmail(key, registration.email, messages[registration.lang], 'confirmation'),
    sendEmail(key, contactEmail, registrationNotice(registration), 'registration notice'),
  ]);
}
