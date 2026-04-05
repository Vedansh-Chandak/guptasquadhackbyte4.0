import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import MapView, { Marker, Callout } from 'react-native-maps';
import { LogOut, ZoomIn, ZoomOut, Navigation } from 'lucide-react-native';
import { BASE_URL } from './api';
import BottomNav from './BottomNav';

export default function MapScreen({ navigation, route }) {
  const { token, user } = route.params || {};
  const mapRef = useRef(null);
  const [hazards, setHazards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedHazard, setSelectedHazard] = useState(null);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState({
    latitude: 26.2183,
    longitude: 78.1828,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  useEffect(() => {
    fetchHazards();
  }, []);

  const fetchHazards = async () => {
    try {
      const res = await fetch(`${BASE_URL}/hazards?status=active`);
      const data = await res.json();
      if (data.success) setHazards(data.hazards || []);
    } catch (e) {
      console.warn('Could not load hazards for map');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'LOGOUT',
      'Terminate session and return to login?',
      [
        { text: 'CANCEL', style: 'cancel' },
        {
          text: 'LOGOUT',
          style: 'destructive',
          onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }),
        },
      ]
    );
  };

  const handleMyLocation = () => {
    mapRef.current?.animateToRegion({
      ...region,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 600);
  };

  const handleZoomIn = () => {
    mapRef.current?.animateToRegion({
      ...region,
      latitudeDelta: region.latitudeDelta / 2,
      longitudeDelta: region.longitudeDelta / 2,
    }, 300);
  };

  const handleZoomOut = () => {
    mapRef.current?.animateToRegion({
      ...region,
      latitudeDelta: region.latitudeDelta * 2,
      longitudeDelta: region.longitudeDelta * 2,
    }, 300);
  };

  const getSeverityColor = (hazard) => {
    const score = hazard.ai_severity || 5;
    if (score >= 8) return '#ff4444';
    if (score >= 5) return '#FF8C00';
    return '#00B894';
  };

  return (
    <View style={styles.root}>

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>LIVE MAP</Text>
          <Text style={styles.headerSub}>HAZARD MESH // REAL-TIME</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>SYSTEM_READY</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <LogOut size={16} color="#ff4444" strokeWidth={2.5} />
            <Text style={styles.logoutText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SEARCH BAR */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="COORDINATE SEARCH"
          placeholderTextColor="#353534"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* MAP */}
      <View style={styles.mapContainer}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#FF8C00" size="large" />
            <Text style={styles.loadingText}>LOADING MESH...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onRegionChangeComplete={setRegion}
            mapType="standard"
            userInterfaceStyle="dark"
          >
            {hazards.map((hazard) => (
              hazard.gps_latitude && hazard.gps_longitude ? (
                <Marker
                  key={hazard._id}
                  coordinate={{
                    latitude: parseFloat(hazard.gps_latitude),
                    longitude: parseFloat(hazard.gps_longitude),
                  }}
                  onPress={() => setSelectedHazard(hazard)}
                  pinColor={getSeverityColor(hazard)}
                >
                  <View style={[styles.markerPin, { borderColor: getSeverityColor(hazard) }]}>
                    <View style={[styles.markerDot, { backgroundColor: getSeverityColor(hazard) }]} />
                  </View>
                </Marker>
              ) : null
            ))}
          </MapView>
        )}

        {/* MAP CONTROLS */}
        <View style={styles.mapControls}>
          <TouchableOpacity style={styles.mapControlBtn} onPress={handleZoomIn}>
            <ZoomIn size={18} color="#e5e2e1" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.mapControlBtn} onPress={handleZoomOut}>
            <ZoomOut size={18} color="#e5e2e1" strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ height: 8 }} />
          <TouchableOpacity style={[styles.mapControlBtn, { borderColor: '#00eefc' }]} onPress={handleMyLocation}>
            <Navigation size={18} color="#00eefc" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* HAZARD COUNT HUD */}
        <View style={styles.hud}>
          <Text style={styles.hudCount}>{hazards.length}</Text>
          <Text style={styles.hudLabel}>ACTIVE{'\n'}HAZARDS</Text>
        </View>
      </View>

      {/* SELECTED HAZARD PANEL */}
      {selectedHazard && (
        <View style={styles.dossier}>
          <View style={styles.dossierHeader}>
            <View style={[styles.dossierBadge, { backgroundColor: (selectedHazard.ai_severity || 5) >= 8 ? '#93000a' : '#FF8C00' }]}>
              <Text style={styles.dossierBadgeText}>
                {(selectedHazard.ai_severity || 5) >= 8 ? 'CRITICAL' : 'ACTIVE'}
              </Text>
            </View>
            <Text style={styles.dossierSeverity}>
              {String(Math.round(selectedHazard.ai_severity || 5)).padStart(2, '0')}/10
            </Text>
            <TouchableOpacity onPress={() => setSelectedHazard(null)} style={styles.dossierClose}>
              <Text style={styles.dossierCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.dossierTitle}>
            {(selectedHazard.type || 'HAZARD').toUpperCase()} // SECTOR {selectedHazard._id?.slice(-2).toUpperCase()}
          </Text>
          <Text style={styles.dossierDesc} numberOfLines={2}>
            {selectedHazard.description || 'Analysis in progress...'}
          </Text>
          <TouchableOpacity
            style={styles.dossierBtn}
            onPress={() => navigation.navigate('HazardDetail', { hazard: selectedHazard, token, user })}
          >
            <Text style={styles.dossierBtnText}>VIEW FULL DOSSIER →</Text>
          </TouchableOpacity>
        </View>
      )}

      <BottomNav navigation={navigation} activeTab="Map" token={token} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a' },

  // HEADER
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#e5e2e1', letterSpacing: -1, fontStyle: 'italic' },
  headerSub: { fontSize: 8, color: '#FF8C00', letterSpacing: 3, marginTop: 2, fontWeight: '900' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#131313', borderWidth: 1, borderColor: '#00eefc30', paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, backgroundColor: '#00eefc', borderRadius: 3 },
  statusText: { fontSize: 7, fontWeight: '900', color: '#00eefc', letterSpacing: 1 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: '#ff444440', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#ff44440d' },
  logoutText: { fontSize: 8, fontWeight: '900', color: '#ff4444', letterSpacing: 1 },

  // SEARCH
  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10, backgroundColor: '#0e0e0e', borderWidth: 1, borderColor: '#1a1a1a', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  searchIcon: { fontSize: 16, color: '#e5e2e1' },
  searchInput: { flex: 1, fontSize: 11, fontWeight: '700', color: '#e5e2e1', letterSpacing: 2, textTransform: 'uppercase' },

  // MAP
  mapContainer: { flex: 1, position: 'relative', marginHorizontal: 0 },
  map: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#131313' },
  loadingText: { fontSize: 10, fontWeight: '900', color: '#564334', letterSpacing: 3 },

  // MARKER
  markerPin: { width: 24, height: 24, borderWidth: 1.5, borderRadius: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.7)', transform: [{ rotate: '45deg' }] },
  markerDot: { width: 8, height: 8, borderRadius: 1 },

  // MAP CONTROLS
  mapControls: { position: 'absolute', bottom: 16, right: 12, gap: 6 },
  mapControlBtn: { width: 40, height: 40, backgroundColor: '#1c1b1b', borderWidth: 1, borderColor: '#564334', alignItems: 'center', justifyContent: 'center' },

  // HUD
  hud: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(14,14,14,0.9)', borderWidth: 1, borderColor: '#564334', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  hudCount: { fontSize: 24, fontWeight: '900', color: '#FF8C00', fontStyle: 'italic', lineHeight: 26 },
  hudLabel: { fontSize: 7, fontWeight: '900', color: '#564334', letterSpacing: 1, textAlign: 'center', lineHeight: 10 },

  // DOSSIER
  dossier: { backgroundColor: '#131313', borderTopWidth: 2, borderTopColor: '#FF8C00', padding: 16, gap: 8 },
  dossierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dossierBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  dossierBadgeText: { fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  dossierSeverity: { fontSize: 20, fontWeight: '900', color: '#e5e2e1', fontStyle: 'italic', marginLeft: 'auto' },
  dossierClose: { paddingHorizontal: 8 },
  dossierCloseText: { fontSize: 14, color: '#564334', fontWeight: '900' },
  dossierTitle: { fontSize: 13, fontWeight: '900', color: '#e5e2e1', textTransform: 'uppercase', letterSpacing: 0.5 },
  dossierDesc: { fontSize: 11, color: '#a48c7a', fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#FF8C0055', paddingLeft: 8 },
  dossierBtn: { backgroundColor: '#FF8C00', padding: 12, alignItems: 'center', marginTop: 4 },
  dossierBtnText: { fontSize: 10, fontWeight: '900', color: '#4d2600', letterSpacing: 2 },
});