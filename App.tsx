import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Header, type Mode } from './src/components/Header';
import { AdminGate } from './src/features/admin/AdminGate';
import { HelferScreen } from './src/features/helfer/HelferScreen';
import { AuthProvider } from './src/shared/auth/AuthContext';
import { colors } from './src/shared/theme/colors';
import { getSharedEventId } from './src/shared/data/shareLink';

// A "share" link (see ShareLinkModal) is just this app's URL with
// ?event=<id> appended — computed once at load, not re-read afterwards,
// so switching to the Admin tab and back doesn't fight the user.
const sharedEventId = getSharedEventId();

export default function App() {
  const [mode, setMode] = useState<Mode>(sharedEventId ? 'helfer' : 'admin');

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        {/* The shared Helfer link's own mobile-optimized screen has its own
            title + event picker — the outer app chrome would just be a
            second, redundant header eating into precious phone screen space. */}
        {!sharedEventId && <Header mode={mode} onModeChange={setMode} />}
        {mode === 'admin' ? <AdminGate /> : <HelferScreen initialEventId={sharedEventId} />}
        <StatusBar style="auto" />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
