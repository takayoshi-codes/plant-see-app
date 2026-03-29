import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image, ScrollView, Switch,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { diagnoseImage, DiagnoseResult } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

type Location = '室内' | '屋外'

export default function HomeScreen() {
  const { user } = useAuth()
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [location, setLocation] = useState<Location>('室内')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DiagnoseResult | null>(null)
  const [needsRetake, setNeedsRetake] = useState(false)

  // カメラで撮影
  const handleCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert('カメラの許可が必要です'); return }
    const picked = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: false,
    })
    if (!picked.canceled) {
      setImageUri(picked.assets[0].uri)
      setResult(null)
      setNeedsRetake(false)
    }
  }

  // ギャラリーから選択
  const handleGallery = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    })
    if (!picked.canceled) {
      setImageUri(picked.assets[0].uri)
      setResult(null)
      setNeedsRetake(false)
    }
  }

  // 診断実行
  const handleDiagnose = async () => {
    if (!imageUri) return
    setLoading(true)
    setResult(null)
    setNeedsRetake(false)
    try {
      const response = await diagnoseImage({
        imageUri,
        location,
        userId: user?.id,
      })
      if (response.needsRetake) {
        setNeedsRetake(true)
        Alert.alert('再撮影をお願いします', response.message ?? '別の角度で撮影してください')
      } else if (response.result) {
        setResult(response.result)
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message)
    } finally {
      setLoading(false)
    }
  }

  const conditionColor = (overall: string) => {
    if (overall === '良好') return '#1D9E75'
    if (overall === '注意') return '#BA7517'
    return '#A32D2D'
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>🌿 植物診断</Text>

      {/* 撮影エリア */}
      <TouchableOpacity style={styles.cameraBox} onPress={handleCamera}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={styles.preview} />
          : <Text style={styles.cameraHint}>タップしてカメラを起動</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery}>
        <Text style={styles.galleryBtnText}>📁 ギャラリーから選ぶ</Text>
      </TouchableOpacity>

      {/* 撮影場所トグル */}
      <View style={styles.locationRow}>
        <Text style={styles.locationLabel}>撮影場所：{location}</Text>
        <Switch
          value={location === '屋外'}
          onValueChange={v => setLocation(v ? '屋外' : '室内')}
          trackColor={{ false: '#ccc', true: '#1D9E75' }}
          thumbColor="#fff"
        />
      </View>

      {/* 診断ボタン */}
      <TouchableOpacity
        style={[styles.diagnoseBtn, (!imageUri || loading) && styles.diagnoseBtnDisabled]}
        onPress={handleDiagnose}
        disabled={!imageUri || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.diagnoseBtnText}>🔍 診断する</Text>
        }
      </TouchableOpacity>

      {/* 診断結果 */}
      {result && (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View>
              <Text style={styles.plantName}>{result.plant_name}</Text>
              <Text style={styles.scientificName}>{result.scientific_name}</Text>
              <Text style={styles.family}>{result.family}</Text>
            </View>
            <View style={[styles.confidenceBadge, { backgroundColor: conditionColor(result.condition.overall) + '22' }]}>
              <Text style={[styles.confidenceText, { color: conditionColor(result.condition.overall) }]}>
                {result.confidence}%
              </Text>
            </View>
          </View>

          <View style={[styles.conditionBadge, { backgroundColor: conditionColor(result.condition.overall) + '22' }]}>
            <Text style={[styles.conditionText, { color: conditionColor(result.condition.overall) }]}>
              {result.condition.overall === '良好' ? '✓' : result.condition.overall === '注意' ? '⚠' : '❗'}{' '}
              {result.condition.overall}
              {result.condition.disease ? `  病気: ${result.condition.disease}` : ''}
            </Text>
          </View>

          {result.condition.issues.length > 0 && (
            <View style={styles.issuesBox}>
              {result.condition.issues.map((issue, i) => (
                <Text key={i} style={styles.issueText}>• {issue}</Text>
              ))}
            </View>
          )}

          {result.care_advice.immediate_action && (
            <View style={styles.urgentBox}>
              <Text style={styles.urgentText}>🚨 今すぐ：{result.care_advice.immediate_action}</Text>
            </View>
          )}

          <View style={styles.adviceSection}>
            <Text style={styles.adviceTitle}>ケアアドバイス</Text>
            <AdviceRow icon="💧" label="水やり" text={result.care_advice.watering} />
            <AdviceRow icon="☀️" label="日照" text={result.care_advice.sunlight} />
            <AdviceRow icon="🌱" label="肥料" text={result.care_advice.fertilizer} />
          </View>

          <View style={styles.seasonTipBox}>
            <Text style={styles.seasonTipText}>🍃 {result.season_tip}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  )
}

function AdviceRow({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <View style={adviceStyles.row}>
      <Text style={adviceStyles.icon}>{icon}</Text>
      <View style={adviceStyles.content}>
        <Text style={adviceStyles.label}>{label}</Text>
        <Text style={adviceStyles.text}>{text}</Text>
      </View>
    </View>
  )
}

const adviceStyles = StyleSheet.create({
  row: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  icon: { fontSize: 18, marginRight: 10, marginTop: 2 },
  content: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 2 },
  text: { fontSize: 14, color: '#333', lineHeight: 20 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBF8' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: '#1D6A4A', marginBottom: 20, textAlign: 'center' },
  cameraBox: {
    width: '100%', height: 220, borderRadius: 16,
    backgroundColor: '#E8F5EE', borderWidth: 1.5, borderColor: '#9FE1CB',
    borderStyle: 'dashed', overflow: 'hidden',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  preview: { width: '100%', height: '100%' },
  cameraHint: { fontSize: 14, color: '#2D8F64' },
  galleryBtn: {
    alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 20, borderWidth: 1, borderColor: '#9FE1CB', marginBottom: 16,
  },
  galleryBtnText: { fontSize: 13, color: '#1D9E75' },
  locationRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16,
    borderWidth: 0.5, borderColor: '#ddd',
  },
  locationLabel: { fontSize: 14, color: '#444' },
  diagnoseBtn: {
    backgroundColor: '#1D9E75', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 20,
  },
  diagnoseBtnDisabled: { backgroundColor: '#9FE1CB' },
  diagnoseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    borderWidth: 0.5, borderColor: '#ddd',
  },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  plantName: { fontSize: 22, fontWeight: '700', color: '#1D3A2A' },
  scientificName: { fontSize: 13, color: '#666', fontStyle: 'italic', marginTop: 2 },
  family: { fontSize: 12, color: '#999', marginTop: 2 },
  confidenceBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  confidenceText: { fontSize: 18, fontWeight: '700' },
  conditionBadge: { borderRadius: 8, padding: 10, marginBottom: 10 },
  conditionText: { fontSize: 14, fontWeight: '600' },
  issuesBox: { backgroundColor: '#FFF8E7', borderRadius: 8, padding: 10, marginBottom: 10 },
  issueText: { fontSize: 13, color: '#8A5C00', marginBottom: 3 },
  urgentBox: { backgroundColor: '#FDECEA', borderRadius: 8, padding: 10, marginBottom: 12 },
  urgentText: { fontSize: 13, color: '#A32D2D', fontWeight: '600' },
  adviceSection: { borderTopWidth: 0.5, borderColor: '#eee', paddingTop: 14, marginTop: 4, marginBottom: 10 },
  adviceTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  seasonTipBox: { backgroundColor: '#EEF8F3', borderRadius: 8, padding: 10 },
  seasonTipText: { fontSize: 13, color: '#1D6A4A', lineHeight: 20 },
})
