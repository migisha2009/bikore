require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/auth';

async function testForgotPasswordFlow() {
  console.log('🧪 Testing Forgot Password Flow...\n');
  
  try {
    // Step 1: Send OTP
    console.log('1. Sending OTP...');
    const phone = '0782526295'; // Using existing user from database
    const otpResponse = await axios.post(`${API_BASE}/forgot-password`, { phone });
    console.log('✓ OTP sent successfully');
    
    // Wait a moment to see the OTP in console logs
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Verify OTP (need to capture the actual OTP from console)
    console.log('\n2. Verifying OTP...');
    console.log('⚠️  Check the console logs above for the actual OTP generated');
    console.log('⚠️  For this test, using a simulated OTP verification...');
    
    // In a real app, the user would read the OTP from their SMS
    // For testing, we'll simulate by checking what OTP was generated
    const otp = '123456'; // This would be the actual OTP from console
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
