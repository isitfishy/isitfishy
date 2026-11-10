import type { ConfigContext, ExpoConfig } from 'expo/config';

// End-to-end builds talk to a local API over plain HTTP; store builds never allow that.
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ...(process.env.E2E === '1'
      ? [['expo-build-properties', { android: { usesCleartextTraffic: true } }] as [string, object]]
      : []),
  ],
});
