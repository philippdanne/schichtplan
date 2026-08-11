import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AdminScreen } from './AdminScreen';
import { SignInForm } from './SignInForm';
import { useAuth } from '../../shared/auth/AuthContext';
import { isSupabaseConfigured } from '../../shared/supabase/client';
import { colors } from '../../shared/theme/colors';

/**
 * Gates the admin area behind Supabase Auth. The Helfer view never routes
 * through here — it stays open, no login, per the design brief.
 *
 * When no Supabase project is configured (local dev without a .env), we
 * skip the gate rather than lock the admin area out entirely, since there's
 * no way to create a session against a backend that doesn't exist. A banner
 * makes that state visible instead of silent.
 */
export function AdminGate() {
  const { loading, isAdmin } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.devBanner}>
          <Text style={styles.devBannerText}>
            Kein Supabase konfiguriert — Admin-Bereich läuft ungeschützt mit Mock-Daten (siehe .env.example).
          </Text>
        </View>
        <AdminScreen />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return isAdmin ? <AdminScreen /> : <SignInForm />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  devBanner: { backgroundColor: colors.warn, paddingVertical: 6, paddingHorizontal: 16 },
  devBannerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
