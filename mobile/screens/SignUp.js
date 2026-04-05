import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { BASE_URL } from './api';

export default function SignUp({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
      });

      const data = await res.json();

      if (data.success) {
        navigation.replace('Home', { token: data.token, user: data.user });
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          setError(data.errors.map(e => `${e.field}: ${e.message}`).join(' | '));
        } else {
          setError(data.message || 'Registration failed');
        }
      }
    } catch (e) {
      setError('Cannot connect to server. Is it running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.badge}>
        <Text style={styles.badgeText}>PROTOCOL: 04</Text>
      </View>

      <Text style={styles.title}>NEW USER?{'\n'}SIGN UP.</Text>
      <View style={styles.line} />
      <Text style={styles.subtitle}>ENTER YOUR CREDENTIALS TO REGISTER YOUR NODE.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>FULL NAME</Text>
      <TextInput style={styles.input} placeholder="Your Name" placeholderTextColor="#353534"
        value={name} onChangeText={setName} />

      <Text style={styles.label}>EMAIL ADDRESS</Text>
      <TextInput style={styles.input} placeholder="your@email.com" placeholderTextColor="#353534"
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

      <Text style={styles.label}>PASSWORD</Text>
      <TextInput style={styles.input} placeholder="••••••••••••" placeholderTextColor="#353534"
        value={password} onChangeText={setPassword} secureTextEntry />

      <Text style={styles.label}>PHONE</Text>
      <TextInput style={styles.input} placeholder="1234567890" placeholderTextColor="#353534"
        value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? 'REGISTERING...' : 'SIGN UP'}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <View>
          <Text style={styles.versionLabel}>PROTO_REF</Text>
          <Text style={styles.version}>V2.BUILD_449</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Already Registered? Log In</Text>
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
  line: { height: 4, width: 80, backgroundColor: '#FF8C00', marginBottom: 16 },
  subtitle: { fontSize: 10, color: '#564334', letterSpacing: 2, marginBottom: 32, fontWeight: '700' },
  error: { color: '#ff4444', fontSize: 11, fontWeight: '700', marginBottom: 12, backgroundColor: '#ff000010', padding: 10 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 6, marginLeft: 2, color: '#00eefc' },
  input: { backgroundColor: '#0e0e0e', color: '#e5e2e1', padding: 16, marginBottom: 20, fontSize: 15, borderBottomWidth: 2, borderBottomColor: '#FF8C00' },
  button: { backgroundColor: '#FF8C00', padding: 18, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#4d2600', fontSize: 16, fontWeight: '900', letterSpacing: -0.5, textTransform: 'uppercase' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 48, borderTopWidth: 1, borderTopColor: '#33261f', paddingTop: 20 },
  versionLabel: { fontSize: 8, color: '#a48c7a', letterSpacing: 2, fontWeight: '700' },
  version: { fontSize: 10, color: '#FF8C00' },
  loginLink: { fontSize: 10, color: '#00eefc', textDecorationLine: 'underline', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
});