import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Home, Rss, AlertTriangle, LogOut } from 'lucide-react-native';

const NAV_ITEMS = [
  { label: 'Home',   Icon: Home,          screen: 'Home' },
  { label: 'Feed',   Icon: Rss,           screen: 'Feed' },
  { label: 'Report', Icon: AlertTriangle, screen: 'Report' },
  { label: 'Logout', Icon: LogOut,        screen: null },
];

export default function BottomNav({ navigation, activeTab, token, user }) {
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

  return (
    <View style={styles.container}>
      {NAV_ITEMS.map(({ label, Icon, screen }) => {
        const isActive = label === activeTab;
        const isLogout = label === 'Logout';

        return (
          <TouchableOpacity
            key={label}
            style={[
              styles.tab,
              isActive && styles.tabActive,
              isLogout && styles.tabLogout,
            ]}
            onPress={() => {
              if (isLogout) handleLogout();
              else if (!isActive) navigation.navigate(screen, { token, user });
            }}
          >
            {isActive && <View style={styles.activeDot} />}
            <Icon
              size={isActive ? 22 : 18}
              strokeWidth={isActive ? 3 : 2}
              color={isLogout ? '#ff4444' : isActive ? '#000' : '#564334'}
            />
            <Text style={[
              styles.label,
              isActive && styles.labelActive,
              isLogout && styles.labelLogout,
            ]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D',
    borderTopWidth: 2,
    borderTopColor: '#1A1A1A',
    height: 76,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#FF8C00',
  },
  tabLogout: {
    borderLeftWidth: 1,
    borderLeftColor: '#1A1A1A',
  },
  activeDot: {
    position: 'absolute',
    top: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  label: {
    fontSize: 8,
    fontWeight: '900',
    color: '#564334',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  labelActive: { color: '#000' },
  labelLogout: { color: '#ff4444' },
});