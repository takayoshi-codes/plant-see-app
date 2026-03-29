import React, { useState } from "react"
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native"
import { useAuth } from "../hooks/useAuth"

export default function AuthScreen() {
  const { user, signIn, signUp, signOut } = useAuth()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!email || !password) {
      Alert.alert("繧ｨ繝ｩ繝ｼ", "繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ縺ｨ繝代せ繝ｯ繝ｼ繝峨ｒ蜈･蜉帙＠縺ｦ縺上□縺輔＞")
      return
    }
    setLoading(true)
    try {
      if (mode === "login") {
        await signIn(email, password)
        Alert.alert("繝ｭ繧ｰ繧､繝ｳ謌仙粥", "縺翫°縺医ｊ縺ｪ縺輔＞・・)
      } else {
        await signUp(email, password)
        Alert.alert("逋ｻ骭ｲ螳御ｺ・, "繧｢繧ｫ繧ｦ繝ｳ繝医′菴懈・縺輔ｌ縺ｾ縺励◆縲・)
      }
    } catch (e: any) {
      Alert.alert("繧ｨ繝ｩ繝ｼ", e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    Alert.alert("繝ｭ繧ｰ繧｢繧ｦ繝・, "繝ｭ繧ｰ繧｢繧ｦ繝医＠縺ｾ縺吶°・・, [
      { text: "繧ｭ繝｣繝ｳ繧ｻ繝ｫ", style: "cancel" },
      { text: "繝ｭ繧ｰ繧｢繧ｦ繝・, style: "destructive", onPress: signOut },
    ])
  }

  if (user) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.logo}>諺</Text>
        <Text style={styles.title}>繧｢繧ｫ繧ｦ繝ｳ繝・/Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>逋ｻ骭ｲ譌･</Text>
            <Text style={styles.infoValue}>{new Date(user.created_at).toLocaleDateString("ja-JP")}</Text>
          </View>
        </View>
        <View style={styles.planCard}>
          <Text style={styles.planTitle}>迴ｾ蝨ｨ縺ｮ繝励Λ繝ｳ</Text>
          <Text style={styles.planName}>Free 繝励Λ繝ｳ</Text>
          <Text style={styles.planDetail}>險ｺ譁ｭ螻･豁ｴ繝ｻ蜀咏悄菫晏ｭ俶ｩ溯・縺ゅｊ</Text>
        </View>
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutBtnText}>繝ｭ繧ｰ繧｢繧ｦ繝・/Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.logo}>諺</Text>
        <Text style={styles.title}>PlantDoc</Text>
        <Text style={styles.subtitle}>繧｢繧ｫ繧ｦ繝ｳ繝医ｒ菴懈・縺吶ｋ縺ｨ險ｺ譁ｭ螻･豁ｴ繧・・逵溘′菫晏ｭ倥＆繧後∪縺・/Text>
        <View style={styles.tabRow}>
          <TouchableOpacity style={[styles.tab, mode === "login" && styles.tabActive]} onPress={() => setMode("login")}>
            <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>繝ｭ繧ｰ繧､繝ｳ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, mode === "signup" && styles.tabActive]} onPress={() => setMode("signup")}>
            <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>譁ｰ隕冗匳骭ｲ</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="繝｡繝ｼ繝ｫ繧｢繝峨Ξ繧ｹ" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#aaa" />
          <TextInput style={styles.input} placeholder="繝代せ繝ｯ繝ｼ繝会ｼ・譁・ｭ嶺ｻ･荳奇ｼ・ value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#aaa" />
          <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={handle} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{mode === "login" ? "繝ｭ繧ｰ繧､繝ｳ" : "逋ｻ骭ｲ縺吶ｋ"}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FBF8" },
  content: { padding: 28, alignItems: "center" },
  logo: { fontSize: 56, marginBottom: 8, marginTop: 40 },
  title: { fontSize: 30, fontWeight: "800", color: "#1D3A2A", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#888", textAlign: "center", marginBottom: 32, lineHeight: 20 },
  tabRow: { flexDirection: "row", backgroundColor: "#E8F5EE", borderRadius: 12, padding: 4, marginBottom: 24, width: "100%" },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  tabActive: { backgroundColor: "#fff" },
  tabText: { fontSize: 14, color: "#888" },
  tabTextActive: { color: "#1D9E75", fontWeight: "700" },
  form: { width: "100%", gap: 12 },
  input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 0.5, borderColor: "#ddd", color: "#333", width: "100%" },
  btn: { backgroundColor: "#1D9E75", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 4 },
  btnDisabled: { backgroundColor: "#9FE1CB" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  infoCard: { width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: 20, borderWidth: 0.5, borderColor: "#ddd", marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 0.5, borderColor: "#eee" },
  infoLabel: { fontSize: 13, color: "#888" },
  infoValue: { fontSize: 13, color: "#333", fontWeight: "500", maxWidth: "60%" },
  planCard: { width: "100%", backgroundColor: "#E8F5EE", borderRadius: 16, padding: 20, marginBottom: 24, alignItems: "center" },
  planTitle: { fontSize: 12, color: "#888", marginBottom: 4 },
  planName: { fontSize: 20, fontWeight: "700", color: "#1D6A4A", marginBottom: 4 },
  planDetail: { fontSize: 12, color: "#2D8F64" },
  signOutBtn: { width: "100%", padding: 16, borderRadius: 14, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  signOutBtnText: { fontSize: 15, color: "#888" },
})
