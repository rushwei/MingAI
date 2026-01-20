import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hhs.mingai',
  appName: 'MingAI',
  webDir: 'capacitor-www',
  server: {
    url: 'https://mingai.fun', // 先用 vercel 的 https://xxx.vercel.app 也行
    cleartext: false,
  },
};

export default config;
