// Mock MTN MoMo and Airtel Money integration
// Replace with real APIs when credentials available

async function initiateMoMoPayment({ phone, amount, reference }) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Validate phone number (Rwanda format)
  if (!phone.match(/^(\+250|07)[0-9]{8}$/)) {
    throw new Error('Invalid phone number format');
  }
  
  // Simulate payment initiation
  return {
    status: 'PENDING',
    referenceId: 'MOMO_' + Date.now(),
    message: `Payment request sent to ${phone}. Please enter your MTN MoMo PIN to complete.`,
    provider: 'MTN_MOMO'
  };
}

async function initiateAirtelPayment({ phone, amount, reference }) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Validate phone number (Rwanda format)
  if (!phone.match(/^(\+250|07)[0-9]{8}$/)) {
    throw new Error('Invalid phone number format');
  }
  
  // Simulate payment initiation
  return {
    status: 'PENDING',
    referenceId: 'AIRTEL_' + Date.now(),
    message: `Payment request sent to ${phone}. Please enter your Airtel Money PIN to complete.`,
    provider: 'AIRTEL_MONEY'
  };
}

async function checkMoMoStatus(referenceId) {
  // Simulate checking payment status
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For demo purposes, return success after a short delay
  // In real implementation, this would call the actual MTN MoMo API
  return { 
    status: 'SUCCESSFUL',
    completed_at: new Date().toISOString()
  };
}

async function checkAirtelStatus(referenceId) {
  // Simulate checking payment status
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For demo purposes, return success after a short delay
  // In real implementation, this would call the actual Airtel Money API
  return { 
    status: 'SUCCESSFUL',
    completed_at: new Date().toISOString()
  };
}

// Helper function to validate phone numbers
function validatePhoneNumber(phone) {
  // Remove any spaces or dashes
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // Check Rwanda phone formats: +250788123456 or 0788123456
  const rwandaPhoneRegex = /^(\+250|07)[0-9]{8}$/;
  
  return rwandaPhoneRegex.test(cleanPhone) ? cleanPhone : null;
}

// Helper function to format phone number for display
function formatPhoneNumber(phone) {
  if (phone.startsWith('+250')) {
    return phone;
  }
  if (phone.startsWith('07')) {
    return '+250' + phone.substring(1);
  }
  return phone;
}

// Helper function to generate payment reference
function generatePaymentReference(prefix = 'PAY') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${prefix}_${timestamp}_${random}`;
}

module.exports = {
  initiateMoMoPayment,
  initiateAirtelPayment,
  checkMoMoStatus,
  checkAirtelStatus,
  validatePhoneNumber,
  formatPhoneNumber,
  generatePaymentReference
};
