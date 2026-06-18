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

function compactValue(value, fallback = 'No indicado') {
  if (value === 0) return '0';
  const text = String(value || '').trim();
  return text || fallback;
}

function detailRows(rows) {
  return rows
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([label, value]) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #eadfd3;color:#6b625a;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;vertical-align:top;">${escapeHtml(label)}</td>
        <td style="padding:10px 0;border-bottom:1px solid #eadfd3;color:#242628;font-size:16px;font-weight:700;text-align:right;vertical-align:top;white-space:pre-line;">${escapeHtml(value)}</td>
      </tr>
    `)
    .join('');
}

function section(title, rows, intro = '') {
  return `
    <div style="margin:0 0 18px;padding:20px;border:1px solid #eadfd3;border-radius:18px;background:#fffdfa;">
      <h2 style="margin:0 0 12px;color:#b35f2a;font-size:15px;line-height:1.2;letter-spacing:0.12em;text-transform:uppercase;">${escapeHtml(title)}</h2>
      ${intro ? `<p style="margin:0 0 12px;color:#5f6469;font-size:14px;line-height:1.5;">${escapeHtml(intro)}</p>` : ''}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${detailRows(rows)}
      </table>
    </div>
  `;
}

function buildHtmlEmail(payload) {
  const contact = payload.contact || {};
  const dates = payload.dates || {};
  const selections = payload.selections || {};
  const billing = payload.billing || {};
  const hasNotes = String(selections.notes || '').trim();
  const total = compactValue(billing.total, 'Sin calcular');

  return `
    <div style="margin:0;padding:0;background:#f6f2eb;font-family:Arial,Helvetica,sans-serif;color:#242628;">
      <div style="max-width:760px;margin:0 auto;padding:28px 16px;">
        <div style="overflow:hidden;border-radius:24px;background:#fffdf9;border:1px solid #eadfd3;box-shadow:0 18px 48px rgba(36,38,40,0.12);">
          <div style="background:#c46a2d;color:#fffdf9;padding:28px 30px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;">Camping Los Robles</p>
            <h1 style="margin:0;font-size:32px;line-height:1.1;">Nueva solicitud de reserva</h1>
            <p style="margin:12px 0 0;font-size:16px;line-height:1.5;color:#fff4eb;">Revisad disponibilidad antes de confirmar la reserva o enviar el enlace de pago.</p>
          </div>
          <div style="padding:24px 30px 30px;background:#fff8ef;">
            <div style="margin:0 0 18px;padding:18px 20px;border-radius:18px;background:#242628;color:#fffdf9;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
                <tr>
                  <td style="font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#d8d2cb;">Total estimado</td>
                  <td style="font-size:30px;font-weight:800;text-align:right;color:#fffdf9;">${escapeHtml(total)}</td>
                </tr>
              </table>
            </div>
            ${section('Contacto', [
              ['Nombre', compactValue(contact.fullName)],
              ['Email', compactValue(contact.email)],
              ['Teléfono', compactValue(contact.phone)],
            ])}
            ${section('Fechas', [
              ['Tipo', compactValue(dates.mode, 'Sin indicar')],
              ['Detalle', compactValue(dates.detail, 'Sin detalle')],
            ])}
            ${section('Selecciones', [
              ['Adultos', compactValue(selections.adults, '0')],
              ['Niños (3-8)', compactValue(selections.children, '0')],
              ['Mascotas', compactValue(selections.pets, '0')],
              ['Vehículos / elementos', compactValue(selections.vehicles, 'Sin seleccionar')],
              ['Acceso a luz', compactValue(selections.waterElectricity, 'No')],
              ...(hasNotes ? [['Comentarios', selections.notes]] : []),
            ])}
            ${section('Facturación', [
              ['Días facturados', compactValue(billing.chargedDays, '0')],
              ['Precio total', total],
            ])}
            <p style="margin:20px 0 0;color:#6b625a;font-size:13px;line-height:1.6;">Solicitud enviada desde la web. Este mensaje no confirma la reserva automáticamente.</p>
          </div>
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
