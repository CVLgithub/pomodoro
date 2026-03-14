import * as Clipboard from 'expo-clipboard';

export const copyToClipboard = async (value: string): Promise<void> => {
  await Clipboard.setStringAsync(value);
};

