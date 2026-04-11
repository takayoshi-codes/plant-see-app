import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { fetchPlants, Plant } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function conditionColor(overall?: string) {
  if (overall === '良好')   return { bg: '#D1FAE5', text: '#065F46', dot: '#10B981', glow: 'rgba(16,185,129,0.15)' }
  if (overall === '注意')   return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B', glow: 'rgba(245,158,11,0.15)'  }
  if (overall === '要処置') return { bg: '#FEE2E2', text: '#7F1D1D', dot: '#EF4444', glow: 'rgba(239,68,68,0.15)'   }
  return { bg: '#F3F4F6', text: '#6B7280', dot: '#9CA3AF', glow: 'transparent' }
}

function formatDate(iso?: string | null): string {
  if (!iso) return '未診断'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diff === 0) return '今日'
  if (diff === 1) return '昨日'
  if (diff < 7)  return `${diff}日前`
  return `${Math.floor(diff / 7)}週間前`
}

// ─── Plant card ───────────────────────────────────────────────────────────────
function PlantCard({ item }: { item: Plant }) {
  const c = conditionColor(item.condition_overall)

  const isWateringDue = (() => {
    if (!item.next_watering_at) return false
    const next = new Date(item.next_watering_at)
    return next <= new Date()
  })()

  return (
    <View style={[styles.card, isWateringDue && styles.cardWateringDue]}>
      {/* Left: emoji + info */}
      <View style={styles.cardLeft}>
        <View style={styles.emojiWrap}>
          <Text style={styles.plantEmoji}>🌿</Text>
          {isWateringDue && <View style={styles.waterDot} />}
        </View>
        <View style={styles.plantInfo}>
          <Text style={styles.plantName}>{item.name}</Text>
          {item.scientific_name && (
            <Text style={styles.scientificName}>{item.scientific_name}</Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>🕐 {formatDate(item.last_diagnosis_at)}</Text>
            {item.watering_interval_days && (
              <Text style={styles.metaText}>💧 {item.watering_interval_days}日おき</Text>
            )}
          </View>
        </View>
      </View>

      {/* Right: condition badge */}
      {item.condition_overall && (
        <View style={[styles.conditionBadge, { backgroundColor: c.bg }]}>
          <View style={[styles.conditionDot, { backgroundColor: c.dot }]} />
          <Text style={[styles.conditionText, { color: c.text }]}>{item.condition_overall}</Text>
        </View>
      )}
    </View>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function PlantsScreen() {
  const { user } = useAuth()
  const [plants, setPlants]       = useState<Plant[]>([])
  const [loading, setLoading]     = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      setPlants(await fetchPlants(user.id))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const todayWatering = plants.filter(p => {
    if (!p.next_watering_at) return false
    return new Date(p.next_watering_at) <= new Date()
  })

  // ── Loading ──
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0B8A5D" size="large" />
        <Text style={styles.loadingText}>データを読み込み中…</Text>
      </View>
    )
  }

  // ── Not logged in ──
  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🔐</Text>
        <Text style={styles.emptyTitle}>ログインが必要です</Text>
        <Text style={styles.emptyText}>ログインするとマイ植物を管理できます</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.root}
      data={plants}
      keyExtractor={item => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load() }}
          colors={['#0B8A5D']}
          tintColor="#0B8A5D"
        />
      }
      contentContainerStyle={styles.listContent}

      ListHeaderComponent={
        <>
          {/* ── Page header ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>マイ植物</Text>
              <Text style={styles.headerSub}>{plants.length}鉢を管理中</Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{plants.length}</Text>
            </View>
          </View>

          {/* ── Watering banner ── */}
          {todayWatering.length > 0 && (
            <View style={styles.wateringBanner}>
              <View style={styles.wateringLeft}>
                <Text style={styles.wateringIcon}>💧</Text>
                <View>
                  <Text style={styles.wateringTitle}>今日の水やり</Text>
                  <Text style={styles.wateringPlants}>
                    {todayWatering.map(p => p.name).join('・')}
                  </Text>
                </View>
              </View>
              <View style={styles.wateringBadge}>
                <Text style={styles.wateringCount}>{todayWatering.length}鉢</Text>
              </View>
            </View>
          )}

          {plants.length > 0 && (
            <Text style={styles.sectionLabel}>登録済みの植物</Text>
          )}
        </>
      }

      ListEmptyComponent={
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardIcon}>🌱</Text>
          <Text style={styles.emptyCardTitle}>まだ植物が登録されていません</Text>
          <Text style={styles.emptyCardText}>診断後に「マイ植物に追加」で登録しましょう</Text>
        </View>
      }

      renderItem={({ item }) => <PlantCard item={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
    />
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#F0F9F4' },
  listContent: { padding: 20, paddingBottom: 48 },

  // Loading / empty states
  center: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F0F9F4', gap: 10,
  },
  loadingText: { fontSize: 13, color: '#6EE7B7', marginTop: 8 },
  emptyIcon:   { fontSize: 40, marginBottom: 4 },
  emptyTitle:  { fontSize: 16, fontWeight: '700', color: '#064E3B' },
  emptyText:   { fontSize: 13, color: '#6B7280', textAlign: 'center', paddingHorizontal: 32 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#064E3B', letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, color: '#6EE7B7', marginTop: 3, fontWeight: '500' },
  countBadge:  {
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    marginTop: 4,
  },
  countBadgeText: { fontSize: 16, fontWeight: '800', color: '#065F46' },

  // Watering banner
  wateringBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  wateringLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  wateringIcon:   { fontSize: 28 },
  wateringTitle:  { fontSize: 12, color: '#065F46', fontWeight: '700', letterSpacing: 0.3 },
  wateringPlants: { fontSize: 13, color: '#374151', marginTop: 2, fontWeight: '500' },
  wateringBadge:  { backgroundColor: '#D1FAE5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  wateringCount:  { fontSize: 13, fontWeight: '700', color: '#065F46' },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#9CA3AF',
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginBottom: 10,
  },

  // Plant card
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  cardWateringDue: {
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
  },
  cardLeft: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, flex: 1,
  },
  emojiWrap:   { position: 'relative' },
  plantEmoji:  { fontSize: 32 },
  waterDot: {
    position: 'absolute', top: 0, right: -2,
    width: 9, height: 9,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    borderWidth: 1.5, borderColor: '#fff',
  },
  plantInfo: { flex: 1, gap: 3 },
  plantName:     { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  scientificName:{ fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  metaText:{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' },

  // Condition badge
  conditionBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, flexShrink: 0,
  },
  conditionDot:  { width: 6, height: 6, borderRadius: 3 },
  conditionText: { fontSize: 12, fontWeight: '700' },

  // Empty state card (inside list)
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#A7F3D0',
  },
  emptyCardIcon:  { fontSize: 44, marginBottom: 4 },
  emptyCardTitle: { fontSize: 15, fontWeight: '700', color: '#065F46', textAlign: 'center' },
  emptyCardText:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
})
