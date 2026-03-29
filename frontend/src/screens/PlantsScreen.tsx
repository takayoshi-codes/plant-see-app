import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native'
import { fetchPlants, Plant } from '../lib/api'
import { useAuth } from '../hooks/useAuth'

export default function PlantsScreen() {
  const { user } = useAuth()
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return }
    try {
      const data = await fetchPlants(user.id)
      setPlants(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  const conditionColor = (overall?: string) => {
    if (overall === '良好') return '#1D9E75'
    if (overall === '注意') return '#BA7517'
    if (overall === '要処置') return '#A32D2D'
    return '#888'
  }

  const formatDate = (iso?: string | null) => {
    if (!iso) return '未診断'
    const d = new Date(iso)
    const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000)
    if (diff === 0) return '今日'
    if (diff === 1) return '1日前'
    return `${diff}日前`
  }

  const todayWatering = plants.filter(p => {
    if (!p.next_watering_at) return false
    const next = new Date(p.next_watering_at)
    const today = new Date()
    return next.toDateString() === today.toDateString() || next < today
  })

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#1D9E75" size="large" /></View>
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>ログインするとマイ植物を管理できます</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {todayWatering.length > 0 && (
        <View style={styles.wateringBanner}>
          <Text style={styles.wateringText}>
            💧 今日の水やり: {todayWatering.map(p => p.name).join('・')}
          </Text>
        </View>
      )}

      <FlatList
        data={plants}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} colors={['#1D9E75']} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>🌱 マイ植物 {plants.length}鉢</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>まだ植物が登録されていません</Text>
            <Text style={styles.emptyHint}>診断後に「マイ植物に追加」してみましょう</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardLeft}>
              <Text style={styles.plantEmoji}>🌿</Text>
              <View>
                <Text style={styles.plantName}>{item.name}</Text>
                {item.scientific_name && (
                  <Text style={styles.scientificName}>{item.scientific_name}</Text>
                )}
                <Text style={styles.lastDiag}>最終診断: {formatDate(item.last_diagnosis_at)}</Text>
              </View>
            </View>
            <View style={styles.cardRight}>
              {item.condition_overall && (
                <View style={[styles.badge, { backgroundColor: conditionColor(item.condition_overall) + '22' }]}>
                  <Text style={[styles.badgeText, { color: conditionColor(item.condition_overall) }]}>
                    {item.condition_overall}
                  </Text>
                </View>
              )}
              <Text style={styles.wateringInfo}>💧 {item.watering_interval_days}日おき</Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBF8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  wateringBanner: { backgroundColor: '#D6EFE4', padding: 12, paddingHorizontal: 16 },
  wateringText: { fontSize: 14, color: '#1D6A4A', fontWeight: '600' },
  header: { marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1D3A2A' },
  emptyText: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 8 },
  emptyHint: { fontSize: 13, color: '#999', textAlign: 'center' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 0.5, borderColor: '#ddd',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardRight: { alignItems: 'flex-end', gap: 6 },
  plantEmoji: { fontSize: 28, marginRight: 12 },
  plantName: { fontSize: 15, fontWeight: '600', color: '#1D3A2A' },
  scientificName: { fontSize: 11, color: '#999', fontStyle: 'italic', marginTop: 1 },
  lastDiag: { fontSize: 12, color: '#aaa', marginTop: 3 },
  badge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  wateringInfo: { fontSize: 11, color: '#888' },
})
