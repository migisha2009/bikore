const axios = require('axios');

const AIRTEL_API_URL = process.env.AIRTEL_API_URL || 'https://sandbox.airtel.com/api';
const AIRTEL_API_KEY = process.env.AIRTEL_API_KEY || 'sandbox_key';
const AIRTEL_SECRET = process.env.AIRTEL_SECRET || 'sandbox_secret';

/**
 * Mock Airtel Money service for Rwanda
 * In production, this would integrate with Airtel's actual API
 */

class AirtelService {
  /**
   * Initiate a mobile money payment
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.phoneNumber - Recipient phone number (Rwanda format: +250...)
   * @param {number} paymentData.amount - Amount in RWF
   * @param {string} paymentData.reference - Payment reference
   * @returns {Promise<Object>} - Payment result
   */
  static async initiatePayment(paymentData) {
    const { phoneNumber, amount, reference } = paymentData;

    try {
      // Validate phone number (Rwanda format)
      if (!phoneNumber || !phoneNumber.match(/^\+2507\d{8}$/)) {
        throw new Error('Invalid Rwanda phone number format');
      }

      // Validate amount
      if (!amount || amount < 100) {
        throw new Error('Minimum amount is 100 RWF');
      }

      // Mock API call - in production, this would be actual Airtel API call
      const mockResponse = {
        success: true,
        transactionId: `AIRTEL_${Date.now()}`,
        reference: reference,
        amount: amount,
        phoneNumber: phoneNumber,
        status: 'pending',
        message: 'Payment initiated successfully'
      };

      console.log('Airtel Payment Initiated:', mockResponse);
      
      return mockResponse;

    } catch (error) {
      console.error('Airtel Payment Error:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Check payment status
   * @param {string} transactionId - Transaction ID from initiatePayment
   * @returns {Promise<Object>} - Payment status
   */
  static async checkPaymentStatus(transactionId) {
    try {
      // Mock status check - in production, this would query Airtel API
      const mockStatuses = ['pending', 'processing', 'completed', 'failed'];
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];

      const mockResponse = {
        success: randomStatus === 'completed',
        transactionId: transactionId,
        status: randomStatus,
        timestamp: new Date().toISOString(),
        message: `Payment ${randomStatus}`
      };

      console.log('Airtel Payment Status:', mockResponse);
      
      return mockResponse;

    } catch (error) {
      console.error('Airtel Status Check Error:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  /**
   * Validate Rwanda phone number for Airtel
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} - Valid phone number
   */
  static validatePhoneNumber(phoneNumber) {
    // Rwanda Airtel numbers start with +2507
    const airtelRegex = /^\+2507[3-9]\d{7}$/;
    return airtelRegex.test(phoneNumber);
  }

  /**
   * Format phone number to Rwanda format
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} - Formatted phone number
   */
  static formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add Rwanda country code if missing
    if (cleaned.startsWith('250')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('07')) {
      cleaned = '+250' + cleaned.substring(1);
    } else if (cleaned.length === 9 && cleaned.startsWith('7')) {
      cleaned = '+250' + cleaned;
    }

    return cleaned;
  }

  /**
   * Get service fees
   * @param {number} amount - Transaction amount
   * @returns {Object} - Fee structure
   */
  static getTransactionFees(amount) {
    // Mock fee structure - adjust based on actual Airtel fees
    let fee = 0;
    
    if (amount <= 1000) {
      fee = 50; // 50 RWF for transactions ≤ 1000
    } else if (amount <= 5000) {
      fee = 100; // 100 RWF for transactions ≤ 5000
    } else if (amount <= 10000) {
      fee = 200; // 200 RWF for transactions ≤ 10000
    } else {
      fee = Math.floor(amount * 0.02); // 2% for larger amounts
    }

    return {
      fee,
      totalAmount: amount + fee,
      feePercentage: ((fee / amount) * 100).toFixed(2)
    };
  }

  /**
   * Refund payment (if supported)
   * @param {string} transactionId - Transaction ID to refund
   * @param {string} reason - Refund reason
   * @returns {Promise<Object>} - Refund result
   */
  static async refundPayment(transactionId, reason) {
    try {
      // Mock refund - in production, this would call Airtel refund API
      const mockResponse = {
        success: true,
        transactionId: transactionId,
        refundId: `REFUND_${Date.now()}`,
        amount: null, // Would be populated in real implementation
        status: 'processing',
        reason: reason,
        message: 'Refund initiated successfully'
      };

      console.log('Airtel Refund Initiated:', mockResponse);
      
      return mockResponse;

    } catch (error) {
      console.error('Airtel Refund Error:', error.message);
      return {
        success: false,
        error: error.message,
        status: 'failed'
      };
    }
  }
}

module.exports = AirtelService;
