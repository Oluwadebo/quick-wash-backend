import axios from 'axios';

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'QuickWash';

export const sendSMS = async (to: string, message: string) => {
  if (!TERMII_API_KEY) {
    console.log(`[MOCK SMS to ${to}]: ${message}`);
    return { status: 'mock_success' };
  }

  try {
    const response = await axios.post('https://api.ng.termii.com/api/sms/send', {
      to,
      from: TERMII_SENDER_ID,
      sms: message,
      type: 'plain',
      channel: 'generic',
      api_key: TERMII_API_KEY,
    });
    return response.data;
  } catch (error: any) {
    console.error('Termii SMS Error:', error.response?.data || error.message);
    throw new Error('Failed to send SMS', { cause: error });
  }
};

export const sendOTP = async (to: string, otp: string) => {
  const message = `Your Quick-Wash verification code is: ${otp}. Valid for 10 minutes.`;
  return await sendSMS(to, message);
};
