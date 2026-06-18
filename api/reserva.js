const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DAILY_LIMIT_MESSAGE = 'Servicio de solicitudes saturado por hoy.';

function jsonResponse(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  })[char]);
}

function buildHtmlEmail(payload) {
  const contact = payload.contact || {};
  const dates = payload.dates || {};
  const selections = payload.selections || {};
  const billing = payload.billing || {};

  const rows = [
    ['Nombre', contact.fullName],
    ['Email', contact.email],
    ['Telefono', contact.phone || 'No indicado'],
    ['Fechas', `${dates.mode || 'Sin indicar'} · ${dates.detail || 'Sin detalle'}`],
    ['Adultos', selections.adults],
    ['Ninos (3-8)', selections.children],
    ['Mascotas', selections.pets],
    ['Vehiculos / elementos', selections.vehicles || 'Sin seleccionar'],
    ['Agua y luz', selections.waterElectricity || 'No'],
    ['Comentarios', selections.notes || 'Sin comentarios'],
    ['Dias facturados', billing.chargedDays],
    ['Total estimado', billing.total],
  ];

  return `
    <div style="margin:0;padding:0;background:#f6f2eb;font-family:Arial,sans-serif;color:#242628;">
      <div style="max-width:720px;margin:0 auto;padding:28px;">
        <div style="background:#c46a2d;color:#fffdf9;border-radius:22px 22px 0 0;padding:26px 28px;">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;font-weight:700;">Camping Los Robles</p>
          <h1 style="margin:0;font-size:30px;line-height:1.1;">Nueva solicitud de reserva</h1>
        </div>
        <div style="background:#fffdf9;border:1px solid rgba(36,38,40,0.12);border-top:0;border-radius:0 0 22px 22px;padding:24px 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
            ${rows.map(([label, value]) => `
              <tr>
                <td style="width:38%;padding:12px 0;border-bottom:1px solid rgba(36,38,40,0.1);color:#5f6469;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;vertical-align:top;">${escapeHtml(label)}</td>
                <td style="padding:12px 0;border-bottom:1px solid rgba(36,38,40,0.1);font-size:16px;font-weight:700;white-space:pre-line;vertical-align:top;">${escapeHtml(value)}</td>
              </tr>
            `).join('')}
          </table>
          <p style="margin:22px 0 0;color:#5f6469;font-size:13px;line-height:1.6;">Esta solicitud se ha enviado desde la web. Revisad disponibilidad antes de confirmar la reserva o enviar enlace de pago.</p>
        </div>
      </div>
    </div>
  `;
}

function buildTextEmail(payload) {
  return [
    'Nueva solicitud de reserva',
    'Camping Los Robles',
    '',
    payload.plainText || '',
    '',
    'Revisad disponibilidad antes de confirmar la reserva o enviar enlace de pago.',
  ].join('\n');
}

function getRequiredEnv() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM,
    to: process.env.RESERVATION_EMAIL_TO || process.env.RESEND_TO,
  };
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    jsonResponse(response, 405, { success: false, code: 'method_not_allowed', message: 'Metodo no permitido.' });
    return;
  }

  const env = getRequiredEnv();
  if (!env.apiKey || !env.from || !env.to) {
    jsonResponse(response, 500, {
      success: false,
      code: 'email_not_configured',
      message: 'El servicio de solicitudes no esta configurado.',
    });
    return;
  }

  let payload = {};
  try {
    payload = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  } catch {
    jsonResponse(response, 400, {
      success: false,
      code: 'invalid_json',
      message: 'Solicitud no valida.',
    });
    return;
  }

  const contact = payload.contact || {};
  const email = String(contact.email || '').trim();
  const fullName = String(contact.fullName || '').trim();

  if (payload.honeypot) {
    jsonResponse(response, 200, { success: true });
    return;
  }

  if (!fullName || !email || !email.includes('@')) {
    jsonResponse(response, 400, {
      success: false,
      code: 'invalid_request',
      message: 'Faltan datos obligatorios.',
    });
    return;
  }

  const subject = String(payload.subject || `Nueva solicitud de reserva · ${fullName}`).slice(0, 180);
  const resendResponse = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.from,
      to: [env.to],
      reply_to: email,
      subject,
      text: buildTextEmail(payload),
      html: buildHtmlEmail(payload),
    }),
  }).catch((error) => ({ ok: false, status: 0, json: async () => ({ message: error.message }) }));

  if (!resendResponse.ok) {
    const errorBody = await resendResponse.json().catch(() => ({}));
    const isLimitError = resendResponse.status === 429 || /limit|quota|rate/i.test(errorBody.message || '');

    jsonResponse(response, isLimitError ? 503 : 502, {
      success: false,
      code: isLimitError ? 'daily_limit' : 'email_send_failed',
      message: isLimitError ? DAILY_LIMIT_MESSAGE : 'No se pudo enviar la solicitud.',
    });
    return;
  }

  jsonResponse(response, 200, { success: true });
};
