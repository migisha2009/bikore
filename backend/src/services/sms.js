const AfricasTalking = require('africastalking');

const at = AfricasTalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});

const sms = at.SMS;

async function sendOTP(phone, otp) {
  try {
    await sms.send({
      to: [phone],
      message: `Your Bikore verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
      from: 'Bikore',
    });
    console.log(`OTP sent successfully to ${phone}`);
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
}

module.exports = { sendOTP };
