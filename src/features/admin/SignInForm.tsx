import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { useAuth } from '../../shared/auth/AuthContext';
import { colors } from '../../shared/theme/colors';

// Functional placeholder — the real sign-in screen design is being generated
// separately (see conversation with the design session). This just wires
// Supabase Auth so the admin gate works end to end in the meantime.
export function SignInForm() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    const message = await signIn(email.trim(), password);
    setSubmitting(false);
    if (message) setError(message);
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Admin-Anmeldung</Text>
        <Text style={styles.hint}>Platzhalter-Formular — finales Auth-UI folgt separat.</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-Mail"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Passwort"
          secureTextEntry
          style={styles.input}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {submitting ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
        ) : (
          <Button label="Anmelden" variant="primary" onPress={handleSubmit} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, padding: 24 },
  card: {
    width: 340,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  hint: { fontSize: 12, color: colors.textMuted, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  error: { fontSize: 12.5, color: colors.danger },
});
