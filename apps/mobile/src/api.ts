import { createApiClient } from '@isitfishy/api-client';
import Constants from 'expo-constants';

const API_PORT = 3000;

/**
 * An explicit EXPO_PUBLIC_API_URL wins. In development the app falls back to the machine
 * running the Expo dev server, so a phone on the same Wi-Fi reaches the local API.
 */
export function resolveApiUrl(explicit: string | undefined, devHostUri: string | undefined) {
  if (explicit) return explicit;
  const host = devHostUri?.split(':')[0];
  return `http://${host || 'localhost'}:${API_PORT}`;
}

export const API_URL = resolveApiUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.hostUri,
);

export const api = createApiClient({ baseUrl: API_URL });
