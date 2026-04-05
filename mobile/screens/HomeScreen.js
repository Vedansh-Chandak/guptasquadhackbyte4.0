import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Camera, Cpu, ShieldCheck, Zap } from 'lucide-react-native';
import BottomNav from './BottomNav';

const STEPS = [
  { Icon: Camera,      code: 'Step_01', desc: 'Optical capture with embedded metadata.' },
  { Icon: Cpu,         code: 'Step_02', desc: 'Gemini 1.5 Vision analysis and priority scoring.' },
  { Icon: ShieldCheck, code: 'Step_03', desc: 'ArmorIQ validation to ensure mesh integrity.' },
  { Icon: Zap,         code: 'Step_04', desc: 'Direct dispatch to municipal repair units.' },
];

const STATS = [
  { value: '1,248', label: 'HAZARDS RESOLVED',    color: '#00eefc' },
  { value: '98.4%', label: 'DATA ACCURACY',        color: '#00B894' },
  { value: '8.2k',  label: 'ACTIVE FIELD AGENTS', color: '#FF8C00' },
  { value: '5s',    label: 'AVG AI PROCESS TIME',  color: '#00eefc' },
];

const TECH = [
  { id: '01', name: 'SpacetimeDB',   desc: 'Records every report instantly and keeps the feed updated in real-time.' },
  { id: '02', name: 'ArmorIQ',       desc: 'Security filter that stops spam and fake reports.' },
  { id: '03', name: 'Gemini_AI',     desc: 'Looks at your photos to identify hazards and decide urgency.' },
  { id: '04', name: 'Quick_Resolve', desc: 'Sends verified data straight to repair crews.' },
];

export default function HomeScreen({ navigation, route }) {
  const { token, user } = route.params || {};

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 20 }}>

        {/* TITLE BAR */}
        <View style={styles.titleBar}>
          <Text style={styles.titleEyebrow}>Home</Text>
          <Text style={styles.titleMain}>FEEDFIX</Text>
        </View>

        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>NETWORK STATUS: ACTIVE</Text>
          </View>
          <Text style={styles.heroTitle}>PATCH THE{'\n'}<Text style={styles.heroAccent}>REALITY.</Text></Text>
          <Text style={styles.heroSub}>
            A high-precision AI mesh network monitoring structural decay in real-time.
          </Text>
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.btnPrimary}
              onPress={() => navigation.navigate('Report', { token, user })}
            >
              <Text style={styles.btnPrimaryText}>⚠ REPORT ISSUE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={() => navigation.navigate('Feed', { token, user })}
            >
              <Text style={styles.btnSecondaryText}>VIEW FEED →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.divider} />

        {/* PROTOCOL STEPS */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>CORE_PROTOCOL</Text>
          <Text style={styles.sectionTitle}>AUTOMATED DATA PIPELINE</Text>
          <View style={styles.stepsGrid}>
            {STEPS.map(({ Icon, code, desc }) => (
              <View key={code} style={styles.stepCard}>
                <View style={styles.stepIconBox}>
                  <Icon size={18} color="#00eefc" strokeWidth={2} />
                </View>
                <Text style={styles.stepCode}>{code}</Text>
                <Text style={styles.stepDesc}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* STATS */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>WELFARE_METRICS</Text>
          <Text style={styles.sectionTitle}>COMMUNITY IMPACT</Text>

          <View style={styles.gaugeCard}>
            <View style={styles.gaugeCircle}>
              <Text style={styles.gaugeValue}>75%</Text>
              <Text style={styles.gaugeLabel}>TARGET_MET</Text>
            </View>
            <View style={styles.gaugeInfo}>
              <Text style={styles.gaugeTitle}>Monthly Resolve Goal</Text>
              <Text style={styles.gaugeSubtitle}>375 / 500 Fixes This Month</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            {STATS.map(({ value, label, color }) => (
              <View key={label} style={styles.statCard}>
                <Text style={[styles.statValue, { color }]}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.divider} />

        {/* TECH STACK */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>TECH_STACK // V2.0</Text>
          <Text style={styles.sectionTitle}>
            WE USE <Text style={styles.heroAccent}>SMART TECH</Text>{'\n'}FOR BETTER ROADS.
          </Text>
          <View style={styles.techGrid}>
            {TECH.map(({ id, name, desc }) => (
              <View key={id} style={styles.techCard}>
                <Text style={styles.techId}>{id} // {name}</Text>
                <Text style={styles.techDesc}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2026 ARMORIQ // MUNICIPAL RESPONSE UNIT</Text>
          <Text style={styles.footerText}>GuptaSquad  •  v0.1</Text>
        </View>

      </ScrollView>

      <BottomNav navigation={navigation} activeTab="Home" token={token} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0a0a0a' },
  scroll: { flex: 1 },

  // TITLE BAR
  titleBar: { backgroundColor: '#0a0a0a', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  titleEyebrow: { fontSize: 11, fontWeight: '900', color: '#FF8C00', letterSpacing: 4, textTransform: 'uppercase' },
  titleMain: { fontSize: 20, fontWeight: '900', color: '#e5e2e1', letterSpacing: -0.5, fontStyle: 'italic' },

  // HERO
  hero: { padding: 24, paddingTop: 28, gap: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#131313', borderWidth: 1, borderColor: '#564334', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF8C00' },
  badgeText: { fontSize: 7, fontWeight: '900', color: '#FF8C00', letterSpacing: 2 },
  heroTitle: { fontSize: 42, fontWeight: '900', color: '#e5e2e1', letterSpacing: -1, lineHeight: 44, fontStyle: 'italic', textTransform: 'uppercase' },
  heroAccent: { color: '#FF8C00' },
  heroSub: { fontSize: 11, color: '#a48c7a', fontWeight: '600', lineHeight: 18, textTransform: 'uppercase', fontStyle: 'italic' },
  heroButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnPrimary: { flex: 1, backgroundColor: '#FF8C00', paddingVertical: 14, alignItems: 'center' },
  btnPrimaryText: { fontSize: 10, fontWeight: '900', color: '#4d2600', letterSpacing: 2 },
  btnSecondary: { flex: 1, borderWidth: 1, borderColor: '#564334', paddingVertical: 14, alignItems: 'center' },
  btnSecondaryText: { fontSize: 10, fontWeight: '900', color: '#e5e2e1', letterSpacing: 2 },

  // LAYOUT
  divider: { height: 1, backgroundColor: '#1a1a1a', marginVertical: 4 },
  section: { padding: 24, gap: 16 },
  sectionEyebrow: { fontSize: 8, fontWeight: '900', color: '#564334', letterSpacing: 4, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 22, fontWeight: '900', color: '#e5e2e1', textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: -0.5, lineHeight: 26 },

  // STEPS
  stepsGrid: { gap: 1, borderWidth: 1, borderColor: '#1a1a1a' },
  stepCard: { backgroundColor: '#131313', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 6 },
  stepIconBox: { width: 36, height: 36, borderWidth: 1, borderColor: '#564334', alignItems: 'center', justifyContent: 'center' },
  stepCode: { fontSize: 8, fontWeight: '900', color: '#564334', letterSpacing: 3, textTransform: 'uppercase' },
  stepDesc: { fontSize: 11, color: '#a48c7a', fontWeight: '600', fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 16 },

  // GAUGE
  gaugeCard: { backgroundColor: '#131313', borderWidth: 1, borderColor: '#564334', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 20 },
  gaugeCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#FF8C00', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' },
  gaugeValue: { fontSize: 20, fontWeight: '900', color: '#e5e2e1', fontStyle: 'italic' },
  gaugeLabel: { fontSize: 6, fontWeight: '900', color: '#564334', letterSpacing: 1 },
  gaugeInfo: { flex: 1, gap: 4 },
  gaugeTitle: { fontSize: 14, fontWeight: '900', color: '#e5e2e1', textTransform: 'uppercase', fontStyle: 'italic' },
  gaugeSubtitle: { fontSize: 9, color: '#a48c7a', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  // STATS
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1 },
  statCard: { width: '49.5%', backgroundColor: '#131313', borderWidth: 1, borderColor: '#1a1a1a', padding: 16, gap: 6 },
  statValue: { fontSize: 28, fontWeight: '900', fontStyle: 'italic' },
  statLabel: { fontSize: 8, fontWeight: '900', color: '#564334', letterSpacing: 2, textTransform: 'uppercase' },

  // TECH
  techGrid: { gap: 1, borderWidth: 1, borderColor: '#1a1a1a' },
  techCard: { backgroundColor: '#0d0d0d', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a', gap: 6 },
  techId: { fontSize: 9, fontWeight: '900', color: '#00eefc', letterSpacing: 2, textTransform: 'uppercase' },
  techDesc: { fontSize: 11, color: '#a48c7a', fontWeight: '600', fontStyle: 'italic', textTransform: 'uppercase', lineHeight: 16 },

  // FOOTER
  footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#1a1a1a', gap: 4, alignItems: 'center' },
  footerText: { fontSize: 8, fontWeight: '900', color: '#564334', letterSpacing: 2, textTransform: 'uppercase' },
});