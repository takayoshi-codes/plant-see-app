import React, { useState } from 'react'
import {
  View, Text, TouchableOpacity, Image, Switch,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { diagnose, DiagnoseResult } from '../lib/api'

// ─── Sub-component ────────────────────────────────────────────────────────────
interface AdviceRowProps {
  icon: string
  label: string
  value: string
  accent: string
}
function AdviceCard({ icon, label, value, accent }: AdviceRowProps) {
  return (
    <View style={[adviceStyles.card, { borderTopColor: accent }]}>
      <Text style={adviceStyles.icon}>{icon}</Text>
      <Text style={adviceStyles.label}>{label}</Text>
      <Text style={adviceStyles.value}>{value}</Text>
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [imageUri, setImageUri]     = useState<string | null>(null)
  const [location, setLocation]     = useState<'室内' | '屋外'>('室内')
  const [loading, setLoading]       = useState(false)
  const [result, setResult]         = useState<DiagnoseResult | null>(null)
  const [needsRetake, setNeedsRetake] = useState(false)

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') { Alert.alert('カメラへのアクセスが必要です'); return }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85, base64: false })
    if (!res.canceled) { setImageUri(res.assets[0].uri); setResult(null); setNeedsRetake(false) }
  }

  const handleGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.85, base64: false })
    if (!res.canceled) { setImageUri(res.assets[0].uri); setResult(null); setNeedsRetake(false) }
  }

  const handleDiagnose = async () => {
    if (!imageUri) return
    setLoading(true)
    try {
      const data = await diagnose(imageUri, location)
      if (data.needs_retake) { setNeedsRetake(true); Alert.alert('再撮影が必要です', data.retake_reason ?? '') }
      else { setResult(data) }
    } catch {
      Alert.alert('エラー', '診断に失敗しました。しばらくしてから再試行してください。')
    } finally {
      setLoading(false)
    }
  }

  const conditionColor = (status?: string) => {
    if (status === '良好')   return { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' }
    if (status === '注意')   return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' }
    if (status === '要処置') return { bg: '#FEE2E2', text: '#7F1D1D', dot: '#EF4444' }
    return { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF' }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌿 植物診断</Text>
        <Text style={styles.headerSub}>写真で植物の健康状態をチェック</Text>
      </View>

      {/* ── Image picker ── */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.imageBox} onPress={handleCamera} activeOpacity={0.85}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.placeholderTitle}>タップして撮影</Text>
              <Text style={styles.placeholderSub}>または下のボタンでギャラリーから選択</Text>
            </View>
          )}
          {imageUri && (
            <View style={styles.imageOverlay}>
              <Text style={styles.imageOverlayText}>📷 再撮影</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.galleryBtn} onPress={handleGallery} activeOpacity={0.8}>
          <Text style={styles.galleryBtnText}>🖼  ギャラリーから選択</Text>
        </TouchableOpacity>

        {/* Location toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>撮影場所</Text>
            <Text style={styles.toggleValue}>{location}</Text>
          </View>
          <View style={styles.togglePill}>
            <Text style={[styles.toggleOption, location === '室内' && styles.toggleOptionActive]}>室内</Text>
            <Switch
              value={location === '屋外'}
              onValueChange={v => setLocation(v ? '屋外' : '室内')}
              trackColor={{ false: '#D1FAE5', true: '#A7F3D0' }}
              thumbColor={location === '屋外' ? '#059669' : '#10B981'}
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
            <Text style={[styles.toggleOption, location === '屋外' && styles.toggleOptionActive]}>屋外</Text>
          </View>
        </View>

        {/* Diagnose button */}
        <TouchableOpacity
          style={[styles.diagnoseBtn, (!imageUri || loading) && styles.diagnoseBtnDisabled]}
          onPress={handleDiagnose}
          disabled={!imageUri || loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.diagnoseBtnText}>🔍  診断する</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Retake message ── */}
      {needsRetake && (
        <View style={styles.retakeCard}>
          <Text style={styles.retakeIcon}>⚠️</Text>
          <Text style={styles.retakeText}>より鮮明な写真で再撮影してください</Text>
        </View>
      )}

      {/* ── Result card ── */}
      {result && (
        <View style={styles.resultCard}>
          {/* Plant name header */}
          <View style={styles.resultHeader}>
            <Text style={styles.resultPlantIcon}>🌱</Text>
            <View style={styles.resultNameWrap}>
              <Text style={styles.resultName}>{result.plant_name}</Text>
              {result.scientific_name && (
                <Text style={styles.resultScientific}>{result.scientific_name}</Text>
              )}
            </View>
            {result.condition_overall && (() => {
              const c = conditionColor(result.condition_overall)
              return (
                <View style={[styles.conditionBadge, { backgroundColor: c.bg }]}>
                  <View style={[styles.conditionDot, { backgroundColor: c.dot }]} />
                  <Text style={[styles.conditionText, { color: c.text }]}>{result.condition_overall}</Text>
                </View>
              )
            })()}
          </View>

          {/* Diagnosis detail */}
          {result.condition_detail && (
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>診断結果</Text>
              <Text style={styles.detailText}>{result.condition_detail}</Text>
            </View>
          )}

          {/* Advice cards */}
          {(result.watering || result.sunlight || result.fertilizer) && (
            <>
              <View style={styles.sectionDivider} />
              <Text style={styles.adviceTitle}>お手入れアドバイス</Text>
              <View style={styles.adviceGrid}>
                {result.watering && (
                  <AdviceCard icon="💧" label="水やり" value={result.watering} accent="#3B82F6" />
                )}
                {result.sunlight && (
                  <AdviceCard icon="☀️" label="日当たり" value={result.sunlight} accent="#F59E0B" />
                )}
                {result.fertilizer && (
                  <AdviceCard icon="🌿" label="肥料" value={result.fertilizer} accent="#10B981" />
                )}
              </View>
            </>
          )}
        </View>
      )}

    </ScrollView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const GREEN = '#0B8A5D'
const GREEN_LIGHT = '#D1FAE5'

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#F0F9F4' },
  scroll: { padding: 20, paddingBottom: 48 },

  // Header
  header:     { marginBottom: 20 },
  headerTitle:{ fontSize: 26, fontWeight: '800', color: '#064E3B', letterSpacing: -0.5 },
  headerSub:  { fontSize: 13, color: '#6EE7B7', marginTop: 3, fontWeight: '500' },

  // Main card
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },

  // Image box
  imageBox: {
    height: 220,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
    overflow: 'hidden',
    marginBottom: 14,
    position: 'relative',
  },
  previewImage: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingVertical: 8, alignItems: 'center',
  },
  imageOverlayText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  imagePlaceholder: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  cameraIcon:       { fontSize: 40, marginBottom: 4 },
  placeholderTitle: { fontSize: 15, fontWeight: '700', color: '#065F46' },
  placeholderSub:   { fontSize: 12, color: '#6EE7B7', textAlign: 'center', paddingHorizontal: 24 },

  // Gallery button
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    backgroundColor: '#F0FDF4',
    marginBottom: 16,
  },
  galleryBtnText: { fontSize: 14, fontWeight: '600', color: '#065F46' },

  // Location toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#F8FFFE',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  toggleInfo:  {},
  toggleLabel: { fontSize: 11, color: '#6B7280', fontWeight: '500', marginBottom: 2 },
  toggleValue: { fontSize: 15, fontWeight: '700', color: '#064E3B' },
  togglePill:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleOption: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  toggleOptionActive: { color: GREEN, fontWeight: '700' },

  // Diagnose button
  diagnoseBtn: {
    backgroundColor: GREEN,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  diagnoseBtnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  diagnoseBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Retake card
  retakeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  retakeIcon: { fontSize: 20 },
  retakeText: { flex: 1, fontSize: 13, color: '#92400E', fontWeight: '500', lineHeight: 19 },

  // Result card
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  resultPlantIcon: { fontSize: 32 },
  resultNameWrap:  { flex: 1 },
  resultName:      { fontSize: 18, fontWeight: '800', color: '#064E3B' },
  resultScientific:{ fontSize: 12, color: '#6EE7B7', fontStyle: 'italic', marginTop: 2 },
  conditionBadge:  {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20,
  },
  conditionDot:   { width: 6, height: 6, borderRadius: 3 },
  conditionText:  { fontSize: 12, fontWeight: '700' },

  // Detail
  detailBox: { padding: 18, paddingBottom: 4 },
  detailLabel: { fontSize: 11, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  detailText:  { fontSize: 14, color: '#374151', lineHeight: 22 },

  // Advice
  sectionDivider: { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 18 },
  adviceTitle: {
    fontSize: 13, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.5, textTransform: 'uppercase',
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12,
  },
  adviceGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 14, paddingBottom: 18, gap: 10,
  },
})

const adviceStyles = StyleSheet.create({
  card: {
    flex: 1, minWidth: 90,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderTopWidth: 3,
    alignItems: 'flex-start',
    gap: 4,
  },
  icon:  { fontSize: 20, marginBottom: 2 },
  label: { fontSize: 10, color: '#9CA3AF', fontWeight: '600', letterSpacing: 0.3, textTransform: 'uppercase' },
  value: { fontSize: 13, color: '#1F2937', fontWeight: '600', lineHeight: 18 },
})
