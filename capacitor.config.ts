import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9297b92c18f945a6a379f41ed3650e44',
  appName: 'Nudge',
  webDir: 'dist',
  server: {
    url: 'https://9297b92c-18f9-45a6-a379-f41ed3650e44.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
