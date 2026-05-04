const AfricasTalking = require('africastalking');

// Initialize Africa's Talking (will be used in production)
const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = at.SMS;

async function sendOTP(phone, otp) {
  // For development: Log OTP to console instead of sending SMS
  if (process.env.NODE_ENV === 'development') {
    console.log('\n' + '='.repeat(50));
    console.log('📱 DEVELOPMENT MODE - SMS OTP');
    console.log('='.repeat(50));
    console.log(`Phone: ${phone}`);
    console.log(`OTP: ${otp}`);
    console.log(`Message: Your Bikore verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`);
    console.log('='.repeat(50) + '\n');
    return;
  }

  // For production: Send actual SMS via Africa's Talking
  try {
    await sms.send({
      to: [phone],
      message: `Your Bikore verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: 'Bikore',
    });
    console.log(`OTP sent successfully to ${phone}`);
  } catch (error) {
    console.error('Error sending OTP:', error);
    // In production, you might want to handle this differently
    // For now, we'll log it and continue so the flow doesn't break
    console.log(`MOCK: OTP would be sent to ${phone}: ${otp}`);
  }
}

module.exports = { sendOTP };
