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
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
    .container { max-width: 600px; margin: 0 auto; padding: 16px 12px; }
    .logo { color: #000000; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.05em; margin-bottom: 32px; }
    .dot { color: #3b82f6; }
    .content { background-color: #fcfcfc; border: 1px solid #f0f0f0; padding: 16px; border-radius: 12px; }
    h1 { font-size: 20px; font-weight: 900; color: #111827; margin-top: 0; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.02em; }
    p { color: #6b7280; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
    .button { display: inline-block; background-color: #000000; color: #ffffff !important; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 0.2em; padding: 16px 32px; border-radius: 12px; text-decoration: none; text-align: center; }
    .divider { height: 1px; background-color: #eeeeee; margin: 24px 0; }
    .footer { margin-top: 32px; text-align: center; }
    .footer-text { font-size: 10px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3em; }
    .security { font-size: 12px; color: #9ca3af; line-height: 1.5; }

    /* Study Schedule Specific */
    .schedule-card { background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 20px; }
    .course-item { padding: 16px 0; border-bottom: 1px solid #f3f4f6; }
    .course-item:last-child { border-bottom: none; padding-bottom: 0; }
    .course-item:first-child { padding-top: 0; }
    .course-title { font-weight: 800; color: #111827; font-size: 15px; margin-bottom: 10px; }
    .course-meta { color: #6b7280; font-size: 12px; line-height: 1.8; }
    .course-meta-item { display: block; margin-bottom: 4px; }
    .meta-label { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-size: 10px; color: #9ca3af; margin-right: 8px; }
    .date-banner { font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 8px; }

    /* Desktop styles */
    @media screen and (min-width: 480px) {
      .container { padding: 48px 24px; }
      .content { padding: 40px; border-radius: 24px; }
      .schedule-card { padding: 24px; border-radius: 16px; }
      h1 { font-size: 22px; margin-bottom: 16px; }
      .button { padding: 20px 40px; }
      .divider { margin: 40px 0; }
      .logo { margin-bottom: 40px; }
      .footer { margin-top: 40px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">CodeCampus<span class="dot">.</span>
      <div style="font-size:10px;font-weight:600;color:#9ca3af;letter-spacing:0.15em;text-transform:uppercase;margin-top:2px;">Learn &middot; Build &middot; Achieve</div>
    </div>
    <div class="content">
      <div class="date-banner">${date}</div>
      <h1>Time to Learn, ${recipientName.split(' ')[0]}</h1>
      <p>You have <strong>${courses.length} sessions</strong> scheduled for today, totaling ${totalHours} hours of focused work.</p>
      
      <div class="schedule-card">
        ${courses.map(c => `
        <div class="course-item">
          <div class="course-title">${c.title}</div>
          <div class="course-meta">
            <div class="course-meta-item"><span class="meta-label">Course Code:</span>${c.courseCode}</div>
            <div class="course-meta-item"><span class="meta-label">School:</span>${c.university}</div>
            ${c.startTime ? `<div class="course-meta-item"><span class="meta-label">Time:</span>${c.startTime}</div>` : ''}
            ${c.location ? `<div class="course-meta-item"><span class="meta-label">Location:</span>${c.location}</div>` : ''}
            <div class="course-meta-item"><span class="meta-label">Duration:</span>${c.durationMinutes} minutes</div>
          </div>
        </div>
        `).join('')}
      </div>

      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/study-plan" class="button">Start Session</a>
      
      <div class="divider"></div>
      <div class="security">
        <strong>Daily Insight:</strong> Consistency is the key to mastery. Even a partial session is better than none. Keep your momentum going.
      </div>
    </div>
    <div class="footer">
      <p class="footer-text">CodeCampus &middot; Smart Academic Planner &middot; 2026</p>
    </div>
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

    console.log(`✅ Study reminder sent to ${recipientEmail}`, emailData);
    return { success: true, id: emailData?.id };
  } catch (error) {
    console.error(`❌ Failed to send email to ${recipientEmail}:`, error);
    return { success: false, error };
  }
}
