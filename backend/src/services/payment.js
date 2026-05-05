// Mobile Money Payment Simulation Service
// In production, this would integrate with actual MTN MoMo and Airtel Money APIs

class PaymentService {
  async processPayment(phoneNumber, amount, method, description) {
    // Simulate mobile money payment processing
    console.log(`\n${'='.repeat(50)}`);
    console.log('📱 MOBILE MONEY PAYMENT PROCESSING');
    console.log('='.repeat(50));
    console.log(`Phone: ${phoneNumber}`);
    console.log(`Amount: ${amount} RWF`);
    console.log(`Method: ${method}`);
    console.log(`Description: ${description}`);
    console.log('='.repeat(50));

    // Simulate payment processing time
    await this.delay(2000);

    // Simulate different payment scenarios (90% success rate for demo)
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      const transactionId = this.generateTransactionId();
      console.log(`✅ Payment successful!`);
      console.log(`Transaction ID: ${transactionId}`);
      console.log('='.repeat(50) + '\n');
      
      return {
        success: true,
        transactionId,
        message: 'Payment processed successfully',
        timestamp: new Date().toISOString()
      };
    } else {
      console.log(`❌ Payment failed`);
      console.log('Reason: Insufficient funds or network error');
      console.log('='.repeat(50) + '\n');
      
      return {
        success: false,
        error: 'Payment failed - insufficient funds or network error',
        timestamp: new Date().toISOString()
      };
    }
  }

  generateTransactionId() {
    return 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  validatePhoneNumber(phone, method) {
    // Basic phone number validation for Rwanda
    const rwandaPhoneRegex = /^(250)?7[238]\d{7}$/;
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (!rwandaPhoneRegex.test(cleanPhone)) {
      return {
        valid: false,
        error: 'Invalid Rwanda phone number format'
      };
    }

    // Method-specific validation
    if (method === 'MTN MoMo' && !cleanPhone.startsWith('25078')) {
      return {
        valid: false,
        error: 'MTN MoMo requires a number starting with 078'
      };
    }

    if (method === 'Airtel Money' && !cleanPhone.startsWith('25073')) {
      return {
        valid: false,
        error: 'Airtel Money requires a number starting with 073'
      };
    }

    return { valid: true };
  }

  async checkPaymentStatus(transactionId) {
    // Simulate checking payment status
    await this.delay(1000);
    
    return {
      status: 'completed',
      transactionId,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new PaymentService();
