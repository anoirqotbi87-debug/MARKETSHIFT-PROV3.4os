import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.marketshift.pro',
  appName: 'MarketShift Pro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
