import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { BASE_URL } from './api';

export default function HazardDetail({ navigation, route }) {
  const { hazard: initialHazard, token, user } = route.params;
  const [hazard, setHazard] = useState(initialHazard);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isUpvoting, setIsUpvoting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/hazards/${hazard._id}/comments`);
      const data = await res.json();
      if (data.success) setComments(data.comments || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleUpvote = async () => {
    if (isUpvoting) return;
    setIsUpvoting(true);
    try {
      const res = await fetch(`${BASE_URL}/hazards/${hazard._id}/upvote`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setHazard(prev => ({ ...prev, counter: data.counter }));
      } else {
        Alert.alert('Error', data.message || 'Could not upvote');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not upvote');
    } finally {
      setIsUpvoting(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/hazards/${hazard._id}/comments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setCommentText('');
        fetchComments();
        if (data.counter) {
          setHazard(prev => ({ ...prev, counter: data.counter }));
        }
      } else {
        Alert.alert('Blocked', data.message || 'Could not post comment');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityColor =
    hazard.ai_severity >= 7 ? '#FF4444' :
    hazard.ai_severity >= 4 ? '#FF8C00' : '#00B894';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>

      <Image
        source={{ uri: hazard.image_url || 'https://via.placeholder.com/400x300' }}
        style={styles.image}
      />

      <View style={[styles.statusBadge, hazard.status === 'resolved' && styles.statusBadgeResolved]}>
        <Text style={[styles.statusText, hazard.status === 'resolved' && { color: '#000' }]}>
          {(hazard.status || 'OPEN').toUpperCase()}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{(hazard.type || 'HAZARD').toUpperCase()}</Text>
          </View>
          <Text style={styles.refText}>REF_{hazard._id?.slice(-5).toUpperCase()}</Text>
        </View>

        <Text style={styles.title}>{(hazard.type || 'HAZARD').toUpperCase()} DETECTED</Text>
        <Text style={styles.date}>{new Date(hazard.createdAt).toLocaleDateString()}</Text>
        <Text style={styles.desc}>{hazard.description}</Text>

        {/* AI Analysis */}
        <View style={styles.aiBox}>
          <Text style={styles.aiTitle}>AI ANALYSIS</Text>
          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>Severity:</Text>
            <Text style={[styles.aiValue, { color: severityColor }]}>
              {hazard.ai_severity ? `${hazard.ai_severity}/10` : 'N/A'}
            </Text>
          </View>
          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>Priority Score:</Text>
            <Text style={styles.aiValue}>{hazard.priority_score || 'N/A'}</Text>
          </View>
          <View style={styles.aiRow}>
            <Text style={styles.aiLabel}>Type:</Text>
            <Text style={styles.aiValue}>{hazard.type || 'N/A'}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, isUpvoting && { opacity: 0.5 }]}
            onPress={handleUpvote}
            disabled={isUpvoting}
          >
            <Text style={styles.actionBtnText}>▲ UPVOTE  {hazard.counter?.upvotes || 0}</Text>
          </TouchableOpacity>
          <View style={styles.actionBtn}>
            <Text style={styles.actionBtnText}>💬 {hazard.counter?.comments || 0} COMMENTS</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Comments Section */}
        <Text style={styles.sectionTitle}>INTELLIGENCE REPORTS</Text>

        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="ADD TACTICAL INTEL..."
            placeholderTextColor="#353534"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[styles.postBtn, (!commentText.trim() || isSubmitting) && { opacity: 0.5 }]}
            onPress={handlePostComment}
            disabled={!commentText.trim() || isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator color="#4d2600" size="small" />
              : <Text style={styles.postBtnText}>POST</Text>
            }
          </TouchableOpacity>
        </View>

        {commentsLoading ? (
          <ActivityIndicator color="#FF8C00" style={{ marginTop: 20 }} />
        ) : comments.length === 0 ? (
          <Text style={styles.noComments}>NO ACTIVE INTEL THREADS.</Text>
        ) : (
          comments.map((comment) => (
            <View key={comment._id} style={styles.comment}>
              <View style={styles.commentAccent} />
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>
                    {comment.user_id?.name || 'ANONYMOUS'}
                    {comment.user_id?.is_official && (
                      <Text style={styles.officialBadge}> OFFICIAL</Text>
                    )}
                  </Text>
                  <Text style={styles.commentDate}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  image: { width: '100%', height: 240, backgroundColor: '#000' },
  statusBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#FF8C00' },
  statusBadgeResolved: { backgroundColor: '#00B894', borderColor: '#00B894' },
  statusText: { fontSize: 9, fontWeight: '900', color: '#FF8C00', letterSpacing: 2 },
  body: { padding: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { backgroundColor: '#FF8C00', paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { fontSize: 9, fontWeight: '900', color: '#4d2600' },
  refText: { fontSize: 9, color: '#564334', fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '900', color: '#e5e2e1', textTransform: 'uppercase', marginBottom: 4 },
  date: { fontSize: 10, color: '#564334', marginBottom: 12 },
  desc: { fontSize: 13, color: '#e5e2e1aa', fontStyle: 'italic', borderLeftWidth: 2, borderLeftColor: '#FF8C0055', paddingLeft: 10, marginBottom: 20 },
  aiBox: { backgroundColor: '#131313', borderWidth: 1, borderColor: '#33261f', padding: 14, marginBottom: 20 },
  aiTitle: { fontSize: 11, fontWeight: '900', color: '#FF8C00', letterSpacing: 2, marginBottom: 10 },
  aiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  aiLabel: { fontSize: 11, color: '#564334', fontWeight: '700' },
  aiValue: { fontSize: 11, color: '#e5e2e1', fontWeight: '900' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  actionBtn: { flex: 1, backgroundColor: '#131313', borderWidth: 1, borderColor: '#33261f', paddingVertical: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 10, fontWeight: '900', color: '#564334', letterSpacing: 1 },
  divider: { height: 1, backgroundColor: '#33261f', marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: '#e5e2e1', letterSpacing: 2, marginBottom: 16 },
  commentInputRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  commentInput: { flex: 1, backgroundColor: '#131313', borderWidth: 1, borderColor: '#33261f', color: '#e5e2e1', padding: 12, fontSize: 11, textTransform: 'uppercase' },
  postBtn: { backgroundColor: '#FF8C00', paddingHorizontal: 16, justifyContent: 'center' },
  postBtnText: { fontSize: 10, fontWeight: '900', color: '#4d2600' },
  comment: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  commentAccent: { width: 2, backgroundColor: '#FF8C0033' },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { fontSize: 9, fontWeight: '900', color: '#FF8C00', letterSpacing: 1 },
  officialBadge: { fontSize: 7, backgroundColor: '#00B894', color: '#000', fontWeight: '900' },
  commentDate: { fontSize: 8, color: '#353534', fontWeight: '700' },
  commentText: { fontSize: 11, color: '#a48c7a', fontStyle: 'italic', textTransform: 'uppercase' },
  noComments: { textAlign: 'center', color: '#353534', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginTop: 20 },
});