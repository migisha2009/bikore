const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { sendOTP } = require('../services/sms');

// In-memory OTP storage (in production, use Redis or database)
const otpStore = new Map();

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { phone } = req.body;
  
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  try {
    // Check if user exists with that phone
    const { rows } = await pool.query('SELECT id FROM users WHERE phone=$1', [phone]);
    if (!rows.length) {
      return res.status(404).json({ error: 'User with this phone number not found' });
    }

    // Generate random 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Store OTP in memory with expiry
    otpStore.set(phone, { otp, expiresAt });

    // Send SMS via Africa's Talking
    await sendOTP(phone, otp);

    res.json({ message: 'OTP sent' });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  try {
    // Check OTP matches and not expired
    const storedOTP = otpStore.get(phone);
    if (!storedOTP) {
      return res.status(400).json({ error: 'OTP not found or expired' });
    }

    if (storedOTP.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    if (new Date() > storedOTP.expiresAt) {
      otpStore.delete(phone);
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Generate reset token valid for 15 minutes
    const resetToken = jwt.sign(
      { phone, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Clear OTP after successful verification
    otpStore.delete(phone);

    res.json({ valid: true, resetToken });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'Reset token and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  try {
    // Verify reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Hash new password with bcryptjs
    const password_hash = await bcrypt.hash(newPassword, 10);

    // Update user password in database
    const { rows } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE phone = $2 RETURNING id',
      [password_hash, decoded.phone]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password updated' });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    console.error('Error in reset-password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
