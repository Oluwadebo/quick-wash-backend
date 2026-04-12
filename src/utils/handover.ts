import crypto from 'crypto';

export const generateHandoverCode = (): string => {
  // Generate a 6-digit numeric code
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verifyHandoverCode = (inputCode: string, actualCode: string): boolean => {
  return inputCode === actualCode;
};
