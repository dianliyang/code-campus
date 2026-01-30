// Test script to send a study reminder email
// Run with: npx tsx -r dotenv/config src/scripts/test-email.ts dotenv_config_path=.env.local

import { sendStudyReminderEmail } from '../lib/email';

async function testEmail() {
  console.log('📧 Sending test email...');
  
  const result = await sendStudyReminderEmail({
    recipientEmail: 'opposed_leaps_8k@icloud.com',
    recipientName: 'Dianli',
    courses: [
      {
        title: 'Introduction to Machine Learning',
        courseCode: 'CS229',
        university: 'Stanford',
        durationMinutes: 120,
        startTime: '09:00',
        location: 'Gates Computer Science Building'
      },
      {
        title: 'Operating Systems',
        courseCode: 'CS162',
        university: 'Berkeley',
        durationMinutes: 120,
        startTime: '13:00',
        location: 'Soda Hall'
      }
    ],
    date: 'Wednesday, January 29, 2026'
  });

  if (result.success) {
    console.log('✅ Email sent successfully!', result);
  } else {
    console.error('❌ Failed to send email:', result.error);
  }
}

testEmail().catch(console.error);
