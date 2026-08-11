import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * `null` when no Supabase project is configured (e.g. local dev without a
 * .env). Callers fall back to the in-memory mock store — see
 * src/shared/data/api.ts.
 *
 * Auth storage is platform-specific: on web, supabase-js defaults to
 * `window.localStorage` (pass `undefined` to keep that default). Native has
 * no `window`, so without an explicit storage adapter the session would
 * silently fail to persist across app restarts — AsyncStorage fills that
 * gap. `detectSessionInUrl` is off since there's no OAuth redirect flow,
 * only the email/password sign-in form.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: Platform.OS === 'web' ? undefined : AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const isSupabaseConfigured = supabase !== null;
