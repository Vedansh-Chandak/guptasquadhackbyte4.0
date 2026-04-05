import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Login from './screens/Login';
import SignUp from './screens/SignUp';
import HomeScreen from './screens/HomeScreen';
import Feed from './screens/Feed';
import HazardDetail from './screens/HazardDetail';
import Report from './screens/Report';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '900', letterSpacing: 1 },
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        <Stack.Screen name="Login"       component={Login}       options={{ headerShown: false }} />
        <Stack.Screen name="SignUp"      component={SignUp}      options={{ headerShown: false }} />
        <Stack.Screen name="Home"        component={HomeScreen}  options={{ headerShown: true }} />
        <Stack.Screen name="Feed"        component={Feed}        options={{ headerShown: true }} />
        <Stack.Screen name="HazardDetail" component={HazardDetail} options={{ title: 'HAZARD DETAIL' }} />
        <Stack.Screen name="Report"      component={Report}      options={{ headerShown: true }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}