import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { BASE_URL } from './api';
import BottomNav from './BottomNav';

export default function Feed({ navigation, route }) {
  const { token, user } = route.params || {};
  const [hazards, setHazards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchHazards(statusFilter);
  }, [statusFilter]);

  const fetchHazards = async (status = 'active') => {
    try {
      const res = await fetch(`${BASE_URL}/hazards?status=${status}`);
      const data = await res.json();
      if (data.success) {
        const sorted = (data.hazards || []).sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        );
        setHazards(sorted);
      } else {
        Alert.alert('Error', data.message || 'Could not load hazards');
      }
    } catch (e) {
      Alert.alert('Error', 'Cannot connect to server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchHazards(statusFilter);
  };

  const renderHazard = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('HazardDetail', { hazard: item, token, user })}
    >
      <Image
        source={{ uri: item.image_url || 'https://via.placeholder.com/400x200' }}
        style={styles.cardImage}
      />
      <View style={[styles.statusBadge, item.status === 'resolved' && styles.statusBadgeResolved]}>
        <Text style={[styles.statusText, item.status === 'resolved' && { color: '#000' }]}>
          {(item.status || 'OPEN').toUpperCase()}
        </Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{(item.type || 'HAZARD').toUpperCase()}</Text>
          </View>
          <Text style={styles.refText}>REF_{item._id?.slice(-5).toUpperCase()}</Text>
        </View>
        <Text style={styles.cardTitle}>{(item.type || 'HAZARD').toUpperCase()} DETECTED</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.statText}>▲ {item.counter?.upvotes || 0} UPVOTES</Text>
          <Text style={styles.statText}>💬 {item.counter?.comments || 0} COMMENTS</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>

        <View>
          <Text style={styles.title}>EXPLORE</Text>
          <Text style={styles.subtitle}>COMMUNITY SAFETY FEED</Text>
        </View>
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => navigation.navigate('Report', { token, user })}
        >
          <Text style={styles.reportBtnText}>+ NEW REPORT</Text>
        </TouchableOpacity>
      </View>

      {/* Filter for officials only */}
      {user?.is_official && (
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, statusFilter === 'active' && styles.filterBtnActive]}
            onPress={() => setStatusFilter('active')}
          >
            <Text style={[styles.filterText, statusFilter === 'active' && { color: '#000' }]}>UNRESOLVED</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, statusFilter === 'resolved' && styles.filterBtnResolved]}
            onPress={() => setStatusFilter('resolved')}
          >
            <Text style={[styles.filterText, statusFilter === 'resolved' && { color: '#000' }]}>RESOLVED</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#FF8C00" size="large" style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={hazards}
          keyExtractor={(item) => item._id}
          renderItem={renderHazard}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          onRefresh={onRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <Text style={styles.emptyText}>NO HAZARDS FOUND</Text>
          }
        />
      )}

      <BottomNav
        navigation={navigation}
        activeTab="Feed"
        token={token}
        user={user}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#33261f' },
  title: { fontSize: 28, fontWeight: '900', color: '#e5e2e1', letterSpacing: -1 },
  subtitle: { fontSize: 9, color: '#FF8C00', letterSpacing: 3, marginTop: 2 },
  reportBtn: { backgroundColor: '#FF8C00', paddingHorizontal: 14, paddingVertical: 10 },
  reportBtnText: { color: '#4d2600', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  filterRow: { flexDirection: 'row', gap: 8, padding: 12 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#564334' },
  filterBtnActive: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  filterBtnResolved: { backgroundColor: '#00B894', borderColor: '#00B894' },
  filterText: { fontSize: 9, fontWeight: '900', color: '#564334', letterSpacing: 2 },
  card: { backgroundColor: '#131313', marginBottom: 16, borderWidth: 1, borderColor: '#33261f' },
  cardImage: { width: '100%', height: 160, backgroundColor: '#000' },
  statusBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#FF8C00' },
  statusBadgeResolved: { backgroundColor: '#00B894', borderColor: '#00B894' },
  statusText: { fontSize: 8, fontWeight: '900', color: '#FF8C00', letterSpacing: 2 },
  cardBody: { padding: 14 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  typeBadge: { backgroundColor: '#FF8C00', paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText: { fontSize: 9, fontWeight: '900', color: '#4d2600' },
  refText: { fontSize: 9, color: '#564334', fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#e5e2e1', marginBottom: 6, textTransform: 'uppercase' },
  cardDesc: { fontSize: 12, color: '#e5e2e1aa', fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#FF8C0055', paddingLeft: 8, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#33261f', paddingTop: 10 },
  statText: { fontSize: 9, fontWeight: '900', color: '#564334', letterSpacing: 1 },
  emptyText: { textAlign: 'center', color: '#564334', fontSize: 11, letterSpacing: 3, marginTop: 60, fontWeight: '900' },
});