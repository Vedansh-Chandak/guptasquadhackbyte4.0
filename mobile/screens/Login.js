import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState } from 'react';
import { BASE_URL } from './api';

export default function Login({ navigation }) {
  const [mode, setMode] = useState('citizen');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const body = mode === 'official'
        ? { username, password, department }
        : { email, password };

      const endpoint = mode === 'official' ? '/auth/official' : '/auth/login';

      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        navigation.replace('Home', { token: data.token, user: data.user || data.official });
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (e) {
      setError('Cannot connect to server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  const accent = mode === 'official' ? '#00B894' : '#FF8C00';

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.badge}>
        <Text style={styles.badgeText}>YOUR AUTOMATED REPORTING</Text>
      </View>

      <Text style={styles.title}>ACCESS GRANTED?{'\n'}LOG IN.</Text>
      <View style={[styles.line, { backgroundColor: accent }]} />

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'citizen' && { borderBottomColor: '#FF8C00', borderBottomWidth: 2 }]}
          onPress={() => { setMode('citizen'); setError(''); }}
        >
          <Text style={[styles.toggleText, mode === 'citizen' && { color: '#FF8C00' }]}>CITIZEN LOGIN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, mode === 'official' && { borderBottomColor: '#00B894', borderBottomWidth: 2 }]}
          onPress={() => { setMode('official'); setError(''); }}
        >
          <Text style={[styles.toggleText, mode === 'official' && { color: '#00B894' }]}>OFFICIAL LOGIN</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {mode === 'citizen' && (
        <>
          <Text style={[styles.label, { color: '#00eefc' }]}>EMAIL ADDRESS</Text>
          <TextInput style={styles.input} placeholder="example@gmail.com" placeholderTextColor="#353534"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          <Text style={[styles.label, { color: '#00eefc' }]}>PASSWORD</Text>
          <TextInput style={styles.input} placeholder="••••••••••••" placeholderTextColor="#353534"
            value={password} onChangeText={setPassword} secureTextEntry />
        </>
      )}

      {mode === 'official' && (
        <>
          <Text style={[styles.label, { color: '#00B894' }]}>OFFICIAL USERNAME</Text>
          <TextInput style={[styles.input, { borderBottomColor: '#00B894' }]}
            placeholder="official@roadrash.gov" placeholderTextColor="#353534"
            value={username} onChangeText={setUsername} autoCapitalize="none" />

          <Text style={[styles.label, { color: '#00B894' }]}>PASSWORD</Text>
          <TextInput style={[styles.input, { borderBottomColor: '#00B894' }]}
            placeholder="••••••••••••" placeholderTextColor="#353534"
            value={password} onChangeText={setPassword} secureTextEntry />

          <Text style={[styles.label, { color: '#00B894' }]}>DEPARTMENT (OPTIONAL)</Text>
          <TextInput style={[styles.input, { borderBottomColor: '#00B894' }]}
            placeholder="e.g., Public Works" placeholderTextColor="#353534"
            value={department} onChangeText={setDepartment} />
        </>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: accent }, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'VERIFYING...' : mode === 'official' ? 'OFFICIAL LOGIN' : 'LOGIN'}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <View>
          <Text style={styles.versionLabel}>PROTO_VER</Text>
          <Text style={styles.version}>V0.1</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signupLink}>Unregistered? Create Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#131313', padding: 28, paddingTop: 70 },
  badge: { backgroundColor: '#FF8C00', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, marginBottom: 16 },
  badgeText: { color: '#4d2600', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: '900', color: '#e5e2e1', letterSpacing: -1, textTransform: 'uppercase', marginBottom: 12 },
  line: { height: 4, width: 80, marginBottom: 32 },
  toggleRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#33261f', marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  toggleText: { fontSize: 9, fontWeight: '900', letterSpacing: 2, color: '#564334' },
  error: { color: '#ff4444', fontSize: 11, fontWeight: '700', marginBottom: 12, backgroundColor: '#ff000010', padding: 10 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6, marginLeft: 2 },
  input: { backgroundColor: '#0e0e0e', color: '#e5e2e1', padding: 16, marginBottom: 20, fontSize: 15, borderBottomWidth: 2, borderBottomColor: '#FF8C00' },
  button: { padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#4d2600', fontSize: 16, fontWeight: '900', letterSpacing: -0.5, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 48, borderTopWidth: 1, borderTopColor: '#33261f', paddingTop: 20 },
  versionLabel: { fontSize: 8, color: '#a48c7a', letterSpacing: 2, fontWeight: '700' },
  version: { fontSize: 10, color: '#FF8C00' },
  signupLink: { fontSize: 10, color: '#00eefc', textDecorationLine: 'underline', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});