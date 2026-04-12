export interface ILandmark {
  name: string;
  zone: 'A' | 'B' | 'C';
  baseFee: number;
}

export const LANDMARKS: ILandmark[] = [
  { name: 'University Gate', zone: 'A', baseFee: 500 },
  { name: 'Main Market', zone: 'A', baseFee: 500 },
  { name: 'Housing Estate', zone: 'B', baseFee: 800 },
  { name: 'Airport Road', zone: 'C', baseFee: 1200 },
  // Add more landmarks as needed
];

export const getRiderFee = (landmarkName: string): number => {
  const landmark = LANDMARKS.find((l) => l.name === landmarkName);
  return landmark ? landmark.baseFee : 1000; // Default fee if not found
};
