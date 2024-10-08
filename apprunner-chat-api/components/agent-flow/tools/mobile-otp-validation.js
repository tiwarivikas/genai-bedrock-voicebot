const { v4: uuidv4 } = require('uuid');

const tool = async (params) => {
  const { phoneNumber, otp } = params;

  // Simulate OTP validation (replace with actual implementation)
  const isValid = Math.random() < 0.8; // 80% chance of success

  if (isValid) {
    return {
      status: 'success',
      message: 'OTP validated successfully',
      validationId: uuidv4()
    };
  } else {
    return {
      status: 'failure',
      message: 'Invalid OTP'
    };
  }
};

module.exports = {
  tool,
  config: {
    name: 'mobile-otp-validation',
    description: 'Validate a mobile OTP (One-Time Password)',
    parameters: {
      type: 'object',
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'The phone number to validate the OTP for'
        },
        otp: {
          type: 'string',
          description: 'The OTP to validate'
        }
      },
      required: ['phoneNumber', 'otp']
    }
  }
};