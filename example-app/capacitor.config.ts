import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bluecortex.palforparents.mobile.dev.poc',
  appName: 'Parent Pal PowerSync POC',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    loggingBehavior: 'debug',
  },
  ios: {
    loggingBehavior: 'debug',
    includePlugins: ['@blue-cortex/capacitor-powersync-supabase'],
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
    },
  },
};

export default config;
