import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { Header, type Mode } from './src/components/Header';
import { AdminGate } from './src/features/admin/AdminGate';
import { HelferScreen } from './src/features/helfer/HelferScreen';
import { AuthProvider } from './src/shared/auth/AuthContext';
import { colors } from './src/shared/theme/colors';

export default function App() {
  const [mode, setMode] = useState<Mode>('admin');

  return (
    <AuthProvider>
      <SafeAreaView style={styles.container}>
        <Header mode={mode} onModeChange={setMode} />
        {mode === 'admin' ? <AdminGate /> : <HelferScreen />}
        <StatusBar style="auto" />
      </SafeAreaView>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
