import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

interface StudyReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  courses: Array<{
    title: string;
    courseCode: string;
    university: string;
    durationMinutes: number;
    location?: string;
    startTime?: string;
  }>;
  date: string;
}

interface WorkoutReminderEmailData {
  recipientEmail: string;
  recipientName: string;
  workoutTitle: string;
  provider: string;
  bookingUrl: string;
  bookingOpensLabel: string;
  location?: string | null;
}

export async function sendStudyReminderEmail(data: StudyReminderEmailData) {
  const { recipientEmail, recipientName, courses, date } = data;
  
  const totalMinutes = courses.reduce((sum, c) => sum + c.durationMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #fafaf9;
      color: #1c1917;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-text-size-adjust: 100%;
    }
    .shell {
      max-width: 640px;
      margin: 0 auto;
      padding: 24px 14px;
    }
    .brand {
      display: inline-block;
      margin-bottom: 18px;
      color: #1c1917;
      font-size: 28px;
      line-height: 1;
      letter-spacing: -0.03em;
      font-family: Newsreader, Georgia, serif;
      text-decoration: none;
    }
    .panel {
      border: 1px solid #d6d3d1;
      background: #ffffff;
    }
    .panel-top {
      border-bottom: 1px solid #e7e5e4;
      background: #f5f5f4;
      padding: 10px 14px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #78716c;
      font-family: "JetBrains Mono", SFMono-Regular, Menlo, monospace;
    }
    .panel-body {
      padding: 20px 16px;
    }
    .eyebrow {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.16em;
      color: #78716c;
      margin-bottom: 10px;
      font-family: "JetBrains Mono", SFMono-Regular, Menlo, monospace;
    }
    h1 {
      margin: 0 0 10px 0;
      font-size: 32px;
      line-height: 1.05;
      font-weight: 400;
      letter-spacing: -0.02em;
      color: #1c1917;
      font-family: Newsreader, Georgia, serif;
    }
    .lead {
      margin: 0 0 18px 0;
      font-size: 14px;
      line-height: 1.65;
      color: #57534e;
    }
    .schedule {
      border: 1px solid #e7e5e4;
      background: #fafaf9;
    }
    .row {
      padding: 12px;
      border-bottom: 1px solid #e7e5e4;
    }
    .row:last-child {
      border-bottom: none;
    }
    .title {
      margin: 0 0 6px 0;
      font-size: 15px;
      line-height: 1.35;
      color: #1c1917;
      font-weight: 600;
    }
    .meta {
      margin: 0;
      font-size: 12px;
      line-height: 1.65;
      color: #57534e;
    }
    .meta strong {
      color: #292524;
      font-weight: 600;
    }
    .cta {
      display: inline-block;
      margin-top: 16px;
      border: 1px solid #1c1917;
      background: #1c1917;
      color: #ffffff !important;
      text-decoration: none;
      padding: 11px 16px;
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      font-family: "JetBrains Mono", SFMono-Regular, Menlo, monospace;
    }
    .note {
      margin-top: 16px;
      padding-top: 14px;
      border-top: 1px solid #e7e5e4;
      font-size: 12px;
      line-height: 1.6;
      color: #78716c;
    }
    .footer {
      margin-top: 14px;
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #a8a29e;
      font-family: "JetBrains Mono", SFMono-Regular, Menlo, monospace;
    }
    @media screen and (min-width: 560px) {
      .shell { padding: 42px 20px; }
      .panel-body { padding: 28px 24px; }
      .row { padding: 14px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="brand">Athena</div>
    <div class="panel">
      <div class="panel-top">Daily Schedule / ${date}</div>
      <div class="panel-body">
        <div class="eyebrow">Study Reminder</div>
        <h1>Focus block for ${recipientName.split(" ")[0]}</h1>
        <p class="lead">
          You have <strong>${courses.length} sessions</strong> today, totaling <strong>${totalHours} hours</strong> of planned learning time.
        </p>

        <div class="schedule">
          ${courses.map((c) => `
            <div class="row">
              <p class="title">${c.title}</p>
              <p class="meta"><strong>Code</strong> ${c.courseCode} &nbsp;·&nbsp; <strong>School</strong> ${c.university}</p>
              ${c.startTime ? `<p class="meta"><strong>Time</strong> ${c.startTime}</p>` : ""}
              ${c.location ? `<p class="meta"><strong>Location</strong> ${c.location}</p>` : ""}
              <p class="meta"><strong>Duration</strong> ${c.durationMinutes} minutes</p>
            </div>
          `).join("")}
        </div>

        <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/roadmap" class="cta">Open Athena</a>

        <div class="note">
          Consistency compounds. Even partial completion keeps your execution momentum alive.
        </div>
      </div>
    </div>
    <div class="footer">Athena · Smart Academic Planner · 2026</div>
  </div>
</body>
</html>
  `;

  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn(`⚠️ Email not configured (RESEND_API_KEY missing), skipping email to ${recipientEmail}`);
      return { success: false, error: 'Email service not configured' };
    }

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: recipientEmail,
      subject: `📚 Today's Study Plan: ${courses.length} course${courses.length > 1 ? 's' : ''} scheduled`,
      html,
    });

    if (error) {
      console.error(`❌ Failed to send email to ${recipientEmail}:`, error);
      return { success: false, error };
    }

    console.log(`✅ Study reminder sent to ${recipientEmail} (id=${emailData?.id || "n/a"})`);
    return { success: true, id: emailData?.id };
  } catch (error) {
    console.error(`❌ Failed to send email to ${recipientEmail}:`, error);
    return { success: false, error };
  }
}

export async function sendWorkoutReminderEmail(data: WorkoutReminderEmailData) {
  const {
    recipientEmail,
    recipientName,
    workoutTitle,
    provider,
    bookingUrl,
    bookingOpensLabel,
    location,
  } = data;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <style>
    body { margin: 0; padding: 0; background: #fafaf9; color: #1c1917; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .shell { max-width: 640px; margin: 0 auto; padding: 24px 14px; }
    .brand { display: inline-block; margin-bottom: 18px; color: #1c1917; font-size: 28px; line-height: 1; letter-spacing: -0.03em; font-family: Newsreader, Georgia, serif; text-decoration: none; }
    .panel { border: 1px solid #d6d3d1; background: #ffffff; }
    .panel-top { border-bottom: 1px solid #e7e5e4; background: #f5f5f4; padding: 10px 14px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #78716c; font-family: "JetBrains Mono", SFMono-Regular, Menlo, monospace; }
    .panel-body { padding: 20px 16px; }
    .eyebrow { font-size: 10px; text-transform: uppercase; letter-spacing: 0.16em; color: #78716c; margin-bottom: 10px; font-family: "JetBrains Mono", SFMono-Regular, Menlo, monospace; }
    h1 { margin: 0 0 10px 0; font-size: 32px; line-height: 1.05; font-weight: 400; letter-spacing: -0.02em; color: #1c1917; font-family: Newsreader, Georgia, serif; }
    .lead { margin: 0 0 18px 0; font-size: 14px; line-height: 1.65; color: #57534e; }
    .meta { border: 1px solid #e7e5e4; background: #fafaf9; padding: 14px; }
    .meta p { margin: 0 0 8px 0; font-size: 13px; line-height: 1.6; color: #57534e; }
    .meta p:last-child { margin-bottom: 0; }
    .meta strong { color: #292524; font-weight: 600; }
    .cta { display: inline-block; margin-top: 16px; border: 1px solid #1c1917; background: #1c1917; color: #ffffff !important; text-decoration: none; padding: 11px 16px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-family: "JetBrains Mono", SFMono-Regular, Menlo, monospace; }
    .note { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e7e5e4; font-size: 12px; line-height: 1.6; color: #78716c; }
  </style>
</head>
<body>
  <div class="shell">
    <div class="brand">Athena</div>
    <div class="panel">
      <div class="panel-top">Workout Reminder</div>
      <div class="panel-body">
        <div class="eyebrow">Booking Opens Soon</div>
        <h1>${workoutTitle}</h1>
        <p class="lead">Hi ${recipientName.split(" ")[0]}, booking opens in 15 minutes. Use the booking link below when the slot opens.</p>
        <div class="meta">
          <p><strong>Provider</strong> ${provider}</p>
          <p><strong>Booking opens</strong> ${bookingOpensLabel}</p>
          ${location ? `<p><strong>Location</strong> ${location}</p>` : ""}
        </div>
        <a href="${bookingUrl}" class="cta">Open Booking</a>
        <div class="note">This reminder uses the website timezone Europe/Berlin.</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn(`⚠️ Email not configured (RESEND_API_KEY missing), skipping email to ${recipientEmail}`);
      return { success: false, error: "Email service not configured" };
    }

    const { data: emailData, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || "onboarding@resend.dev",
      to: recipientEmail,
      subject: `Workout booking opens soon: ${workoutTitle}`,
      html,
    });

    if (error) {
      console.error(`❌ Failed to send workout reminder to ${recipientEmail}:`, error);
      return { success: false, error };
    }

    return { success: true, id: emailData?.id };
  } catch (error) {
    console.error(`❌ Failed to send workout reminder to ${recipientEmail}:`, error);
    return { success: false, error };
  }
}
