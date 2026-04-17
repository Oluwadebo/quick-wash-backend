import crypto from 'crypto';

export const generateHandoverCode = (): string => {
  // Generate a 4-digit numeric code
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const verifyHandoverCode = (inputCode: string, actualCode: string): boolean => {
  return inputCode === actualCode;
};
