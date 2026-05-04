require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/auth';

async function testForgotPasswordFlow() {
  console.log('🧪 Testing Forgot Password Flow...\n');
  
  try {
    // Step 1: Send OTP
    console.log('1. Sending OTP...');
    const phone = '+250788100001';
    const otpResponse = await axios.post(`${API_BASE}/forgot-password`, { phone });
    console.log('✓ OTP sent successfully');
    
    // Wait a moment to see the OTP in console logs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Verify OTP (using a common test OTP)
    console.log('\n2. Verifying OTP...');
    const otp = '123456'; // This would be shown in console in real flow
    const verifyResponse = await axios.post(`${API_BASE}/verify-otp`, { phone, otp });
    console.log('✓ OTP verified successfully');
    console.log('Reset token received');
    
    // Step 3: Reset Password
    console.log('\n3. Resetting password...');
    const resetToken = verifyResponse.data.resetToken;
    const newPassword = 'newpassword123';
    const resetResponse = await axios.post(`${API_BASE}/reset-password`, {
      resetToken,
      newPassword
    });
    console.log('✓ Password reset successfully');
    console.log('Message:', resetResponse.data.message);
    
    console.log('\n🎉 Forgot password flow completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testForgotPasswordFlow();
