import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { BASE_URL } from './api';
import BottomNav from './BottomNav';
import { Camera } from 'lucide-react-native';

const HAZARD_TYPES = [
  { id: 'pothole',      label: 'POTHOLE / ROAD DAMAGE' },
  { id: 'garbage',      label: 'UNSANITARY / GARBAGE' },
  { id: 'waterlogging', label: 'FLOODING / WATERLOGGING' },
  { id: 'road_damage',  label: 'STRUCTURAL DAMAGE' },
  { id: 'other',        label: 'OTHER HAZARD' },
];

const STEPS = [
  'Gemini Visual Layer',
  'File Integrity Validation',
  'Spam / Duplication Check',
  'Keyword Filtration',
  'Final Mesh Approval',
];

export default function Report({ navigation, route }) {
  const { token, user } = route.params || {};
  const [image, setImage] = useState(null);
  const [hazardType, setHazardType] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [success, setSuccess] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [liveCoords, setLiveCoords] = useState(null);
  const [lockedCoords, setLockedCoords] = useState(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef(null);

  useEffect(() => {
    let watcher = null;
    if (showCamera) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          watcher = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, timeInterval: 1000, distanceInterval: 0 },
            (loc) => {
              setLiveCoords({
                lat: loc.coords.latitude,
                long: loc.coords.longitude,
              });
            }
          );
        }
      })();
    }
    return () => {
      if (watcher) watcher.remove();
    };
  }, [showCamera]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0]);
  };

  const takePhoto = async () => {
    const perm = await requestCameraPermission();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow access to your camera');
      return;
    }
    setShowCamera(true);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    setLockedCoords(liveCoords);
    setShowCamera(false);
    setImage({ uri: photo.uri });
  };

  const handleSubmit = async () => {
    if (!image || !hazardType) {
      Alert.alert('Missing fields', 'Please select an image and hazard type');
      return;
    }

    setLoading(true);
    setCurrentStep(0);

    // Get location FIRST before showing steps
    let lat = null, long = null;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("📍 Location permission status:", status);
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ timeout: 5000 });
        lat = loc.coords.latitude;
        long = loc.coords.longitude;
        console.log("✅ Location obtained:", { lat, long });
      } else {
        console.warn('⚠️ Location permission denied');
      }
    } catch (e) {
      console.warn('❌ Location error:', e.message);
    }

    // NOW show the steps
    for (let i = 0; i < STEPS.length - 1; i++) {
      await new Promise(r => setTimeout(r, 900));
      setCurrentStep(i + 1);
    }

    try {
      // Create FormData with proper field ordering
      const formData = new FormData();
      
      // Add image file
      const imageFile = {
        uri: image.uri,
        type: 'image/jpeg',
        name: `hazard-${Date.now()}.jpg`,
      };
      console.log("📸 Image to send:", imageFile);
      formData.append('image', imageFile);
      
      // Add complaint description
      console.log("📝 Complaint description:", hazardType);
      formData.append('complaint_description', hazardType);
      
      // Add GPS coordinates ALWAYS - even if null
      if (lat !== null && lat !== undefined) {
        console.log("📍 Adding GPS_LATITUDE:", lat);
        formData.append('gps_latitude', String(lat));
      } else {
        console.warn("⚠️ GPS_LATITUDE is NULL");
      }
      
      if (long !== null && long !== undefined) {
        console.log("📍 Adding GPS_LONGITUDE:", long);
        formData.append('gps_longitude', String(long));
      } else {
        console.warn("⚠️ GPS_LONGITUDE is NULL");
      }

      // Log FormData contents for debugging
      console.log("📤 FORMDATA CONTENTS:");
      for (let pair of formData.entries()) {
        if (pair[0] === 'image') {
          console.log(`  ${pair[0]}: [File Object]`);
        } else {
          console.log(`  ${pair[0]}: ${pair[1]}`);
        }
      }

      console.log("📤 Sending request to:", `${BASE_URL}/hazards`);
      console.log("🔐 Auth token:", token ? "✅ Present" : "❌ Missing");

      const res = await fetch(`${BASE_URL}/hazards`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${token}`,
          // DO NOT set Content-Type - let the browser set it for multipart/form-data
        },
        body: formData,
      });

      console.log("📥 Response status:", res.status);
      console.log("📥 Response headers:", {
        contentType: res.headers.get('content-type'),
      });
      
      const data = await res.json();
      console.log("📥 Response data:", JSON.stringify(data, null, 2));

      if (data.success) {
        setSuccess(true);
      } else {
        console.error("❌ API Error:", data.message || data.error);
        Alert.alert('Failed', data.message || 'Could not submit report');
        setCurrentStep(-1);
      }
    } catch (e) {
      console.error("❌ Network/Parse Error:", e);
      console.error("❌ Error stack:", e.stack);
      Alert.alert('Error', 'Could not submit report: ' + e.message);
      setCurrentStep(-1);
    } finally {
      setLoading(false);
    }
  };

  // Live camera screen with GPS overlay
  if (showCamera) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <CameraView style={{ flex: 1 }} ref={cameraRef} facing="back">
          <View style={styles.gpsOverlay}>
            <Text style={styles.gpsOverlayLabel}>◉ LIVE GPS</Text>
            {liveCoords ? (
              <>
                <Text style={styles.gpsOverlayCoord}>LAT: {liveCoords.lat.toFixed(6)}</Text>
                <Text style={styles.gpsOverlayCoord}>LNG: {liveCoords.long.toFixed(6)}</Text>
              </>
            ) : (
              <Text style={styles.gpsOverlayCoord}>Acquiring GPS…</Text>
            )}
          </View>
          <View style={styles.cameraControls}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelBtnText}>✕ CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shutterBtn} onPress={capturePhoto}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
            <View style={{ width: 70 }} />
          </View>
        </CameraView>
      </View>
    );
  }

  // Success screen
  if (success) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheck}>✓</Text>
          </View>
          <Text style={styles.successTitle}>REPORT FILED</Text>
          <Text style={styles.successSub}>VERIFIED BY ARMORIQ</Text>
          <View style={styles.successBox}>
            <Text style={styles.successBoxLabel}>SYSTEM BROADCAST</Text>
            <Text style={styles.successBoxText}>
              "Incident logged. Contribution active in priority mesh."
            </Text>
          </View>
          <TouchableOpacity
            style={styles.feedBtn}
            onPress={() => navigation.navigate('Feed', route.params)}
          >
            <Text style={styles.feedBtnText}>GO TO FEED →</Text>
          </TouchableOpacity>
        </View>
        <BottomNav navigation={navigation} activeTab="Report" token={token} user={user} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0A' }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* TITLE BAR */}
        <View style={styles.titleBar}>
          <Text style={styles.titleEyebrow}>Capture</Text>
          <Text style={styles.titleMain}>REPORT INCIDENT</Text>
        </View>

        {/* Image Picker */}
        <View style={styles.imageBox}>
          {image ? (
            <>
              <Image source={{ uri: image.uri }} style={styles.preview} />
              {lockedCoords && (
                <View style={styles.lockedGpsBadge}>
                  <Text style={styles.lockedGpsText}>
                    {lockedCoords.lat.toFixed(6)}, {lockedCoords.long.toFixed(6)}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setImage(null); setLockedCoords(null); }}>
                <Text style={styles.clearBtnText}>✕ CLEAR</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Camera size={48} color="#f97316" strokeWidth={1.5} />
              <Text style={styles.imagePlaceholderText}>CAPTURE HAZARD PHOTO</Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                  <Text style={styles.imageBtnText}>TAKE PHOTO</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.imageBtn, { backgroundColor: '#33261f' }]} onPress={pickImage}>
                  <Text style={styles.imageBtnText}>UPLOAD</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Hazard Type */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INCIDENT CATEGORY</Text>
          {HAZARD_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeOption, hazardType === type.id && styles.typeOptionSelected]}
              onPress={() => setHazardType(type.id)}
            >
              <Text style={[styles.typeOptionText, hazardType === type.id && { color: '#000' }]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Activity Log */}
        {loading && (
          <View style={styles.logBox}>
            <Text style={styles.logTitle}>UPLOAD ACTIVITY LOG</Text>
            {STEPS.map((step, i) => (
              <View key={i} style={styles.logRow}>
                <Text style={[styles.logStep, i <= currentStep && { color: '#e5e2e1' }]}>
                  {String(i + 1).padStart(2, '0')} // {step}
                </Text>
                {i < currentStep && <Text style={styles.logPass}>PASS</Text>}
                {i === currentStep && <ActivityIndicator color="#FF8C00" size="small" />}
              </View>
            ))}
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, (!image || !hazardType || loading) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!image || !hazardType || loading}
        >
          {loading
            ? <ActivityIndicator color="#4d2600" />
            : <Text style={styles.submitBtnText}>⚠ POST YOUR REPORT</Text>
          }
        </TouchableOpacity>

      </ScrollView>
      <BottomNav navigation={navigation} activeTab="Report" token={token} user={user} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  titleBar: { backgroundColor: '#0a0a0a', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1a1a1a' },
  titleEyebrow: { fontSize: 11, fontWeight: '900', color: '#FF8C00', letterSpacing: 4, textTransform: 'uppercase' },
  titleMain: { fontSize: 20, fontWeight: '900', color: '#e5e2e1', letterSpacing: -0.5, fontStyle: 'italic' },
  imageBox: { margin: 16, backgroundColor: '#131313', borderWidth: 1, borderColor: '#33261f', overflow: 'hidden' },
  preview: { width: '100%', height: 220 },
  clearBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5 },
  clearBtnText: { color: '#FF8C00', fontSize: 10, fontWeight: '900' },
  imagePlaceholder: { height: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  imagePlaceholderIcon: { fontSize: 36 },
  imagePlaceholderText: { color: '#e5e2e1', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  imageButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  imageBtn: { backgroundColor: '#FF8C00', paddingHorizontal: 20, paddingVertical: 10 },
  imageBtnText: { color: '#4d2600', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  section: { marginHorizontal: 16, marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#00eefc', letterSpacing: 2, marginBottom: 12 },
  typeOption: { borderWidth: 1, borderColor: '#33261f', padding: 14, marginBottom: 8, backgroundColor: '#131313' },
  typeOptionSelected: { backgroundColor: '#FF8C00', borderColor: '#FF8C00' },
  typeOptionText: { fontSize: 11, fontWeight: '900', color: '#564334', letterSpacing: 1 },
  logBox: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#131313', borderWidth: 1, borderColor: '#33261f', padding: 16 },
  logTitle: { fontSize: 10, fontWeight: '900', color: '#e5e2e1', letterSpacing: 2, marginBottom: 16 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logStep: { fontSize: 10, fontWeight: '700', color: '#353534', letterSpacing: 1 },
  logPass: { fontSize: 9, fontWeight: '900', color: '#00B894', borderWidth: 1, borderColor: '#00B894', paddingHorizontal: 6, paddingVertical: 2 },
  submitBtn: { marginHorizontal: 16, backgroundColor: '#FF8C00', padding: 18, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#1c1b1b', borderWidth: 1, borderColor: '#564334' },
  submitBtnText: { color: '#4d2600', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  successContainer: { flex: 1, backgroundColor: '#0a0a0a', padding: 28, justifyContent: 'center' },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#00B89420', borderWidth: 1, borderColor: '#00B89440', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successCheck: { fontSize: 36, color: '#00B894' },
  successTitle: { fontSize: 36, fontWeight: '900', color: '#e5e2e1', letterSpacing: -1, marginBottom: 4 },
  successSub: { fontSize: 10, color: '#00B894', letterSpacing: 4, marginBottom: 32 },
  successBox: { backgroundColor: '#131313', borderWidth: 1, borderColor: '#33261f', padding: 16, marginBottom: 32 },
  successBoxLabel: { fontSize: 8, color: '#564334', letterSpacing: 3, marginBottom: 8, fontWeight: '900' },
  successBoxText: { fontSize: 13, color: '#e5e2e1', fontStyle: 'italic', fontWeight: '700' },
  feedBtn: { backgroundColor: '#00B894', padding: 18, alignItems: 'center' },
  feedBtnText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  // Camera overlay styles
  gpsOverlay: { position: 'absolute', top: 50, left: 16, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 8, borderLeftWidth: 2, borderLeftColor: '#FF8C00' },
  gpsOverlayLabel: { fontSize: 9, fontWeight: '900', color: '#FF8C00', letterSpacing: 2, marginBottom: 4 },
  gpsOverlayCoord: { fontSize: 13, fontWeight: '700', color: '#e5e2e1', letterSpacing: 0.5, fontFamily: 'monospace' },
  cameraControls: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30 },
  cancelBtn: { width: 70, alignItems: 'center' },
  cancelBtnText: { color: '#FF8C00', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  shutterBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: '#FF8C00', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF8C00' },
  lockedGpsBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 5, borderLeftWidth: 2, borderLeftColor: '#FF8C00' },
  lockedGpsText: { color: '#e5e2e1', fontSize: 10, fontWeight: '700', fontFamily: 'monospace' },
});