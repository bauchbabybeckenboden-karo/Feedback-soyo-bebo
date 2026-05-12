// netlify/functions/feedback-notification.js
// Sendet das Kurs-Feedback per Resend-E-Mail an Kay.
// Umgebungsvariable: RESEND_API_KEY (in Netlify → Site settings → Environment variables)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY nicht gesetzt');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  // ── HTML-E-Mail aufbauen ──
  const stars = (n) => n && n !== '–' ? '★'.repeat(Number(n)) + '☆'.repeat(5 - Number(n)) : '–';
  const row = (label, value) =>
    `<tr>
      <td style="padding:8px 16px 8px 0;color:#7a5c4a;font-size:13px;font-weight:500;vertical-align:top;white-space:nowrap;">${label}</td>
      <td style="padding:8px 0;color:#2a1a1a;font-size:14px;font-weight:300;line-height:1.6;">${value || '–'}</td>
    </tr>`;

  const section = (title, rows) =>
    `<div style="margin-bottom:32px;">
      <h3 style="font-family:Georgia,serif;font-size:18px;font-weight:400;color:#5c2d2d;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #ede5dc;">${title}</h3>
      <table style="width:100%;border-collapse:collapse;">${rows}</table>
    </div>`;

  const html = `<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"/></head>
<body style="background:#f7f2ee;margin:0;padding:32px 16px;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(92,45,45,0.08);">

  <!-- Header -->
  <div style="background:#7a3f3f;padding:32px 36px;">
    <p style="margin:0 0 6px;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c4a882;font-weight:300;">Bauch · Baby · Beckenboden</p>
    <h1 style="margin:0;font-family:Georgia,serif;font-size:26px;font-weight:300;color:#f7f2ee;">Neues Kurs-Feedback</h1>
    <p style="margin:10px 0 0;font-size:14px;color:rgba(247,242,238,0.65);font-weight:300;">
      <strong style="color:#c4a882;">${data.kurs}</strong> &nbsp;·&nbsp; ${data.eingereicht_am}
    </p>
  </div>

  <!-- Body -->
  <div style="padding:36px;">

    ${section('🏡 Räumlichkeit', [
      row('Wohlfühlen', stars(data.raum_wohl)),
      row('Temperatur', data.raum_temp),
      row('Platz auf Matte', data.raum_platz),
      row('Verbesserungen', data.raum_feedback),
    ].join(''))}

    ${section('🕯️ Beleuchtung', [
      row('Passend (1–5)', data.licht_skala),
      row('Wunsch', data.licht_wunsch),
      row('Kommentar', data.licht_kommentar),
    ].join(''))}

    ${section('🌿 Körpergefühl & Übungen', [
      row('Schmerzen', data.schmerz),
      row('Details Schmerzen', data.schmerz_detail),
      row('Unangenehme Übungen', data.unangenehm),
      row('Modifikationen', stars(data.modifikation)),
      row('Tempo', data.tempo),
    ].join(''))}

    ${section('✨ Verbesserungen', [
      row('Mehr wünschen', data.mehr),
      row('Weniger / anders', data.weniger),
      row('Gesamtbewertung', stars(data.gesamt)),
      row('Weiterempfehlung', data.empfehlen),
    ].join(''))}

    ${section('🌸 Über die Teilnehmerin', [
      row('Vorerfahrung', data.erfahrung),
      row('Nachgefühl', data.nachher),
      row('Altersgruppe', data.alter),
    ].join(''))}

    ${section('💬 Freier Raum', [
      row('Berührt / überrascht', data.beruehrt),
      row('Wunschthemen', data.wunschthemen),
      row('Sonstiges', data.sonstiges),
    ].join(''))}

  </div>

  <div style="padding:20px 36px 28px;background:#f7f2ee;text-align:center;">
    <p style="margin:0;font-size:12px;color:#8a7060;font-style:italic;font-weight:300;">
      Dieses Feedback wurde anonym über das Kurs-Feedback-Formular auf bauch-baby-beckenboden.de eingereicht.
    </p>
  </div>
</div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Kurs-Feedback <onboarding@resend.dev>',
        to: ['Bauch.baby.beckenboden@gmail.com'],
        subject: `📋 Neues Feedback: ${data.kurs} – ${data.eingereicht_am}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend Fehler:', err);
      return { statusCode: 502, body: 'Mail delivery failed' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('Netzwerkfehler beim Mailversand:', err);
    return { statusCode: 500, body: 'Internal error' };
  }
};
