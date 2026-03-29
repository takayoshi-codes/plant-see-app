import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useAuth } from '../hooks/useAuth'

export default function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!email || !password) { Alert.alert('メールアドレスとパスワードを入力してください'); return }
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        Alert.alert('登録完了', '確認メールを送信しました。メールを確認してください。')
      }
    } catch (e: any) {
      Alert.alert('エラー', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.logo}>🌿</Text>
      <Text style={styles.title}>PlantDoc</Text>
      <Text style={styles.subtitle}>植物の健康を AI でチェック</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholderTextColor="#aaa"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード（6文字以上）"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor="#aaa"
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handle}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{mode === 'login' ? 'ログイン' : '新規登録'}</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'signup' : 'login')} style={styles.switchBtn}>
          <Text style={styles.switchText}>
            {mode === 'login' ? 'アカウントを作成する →' : 'ログインに戻る →'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FBF8', justifyContent: 'center', padding: 28 },
  logo: { fontSize: 56, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 30, fontWeight: '800', color: '#1D3A2A', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 36 },
  form: { gap: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    fontSize: 15, borderWidth: 0.5, borderColor: '#ddd', color: '#333',
  },
  btn: { backgroundColor: '#1D9E75', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 4 },
  btnDisabled: { backgroundColor: '#9FE1CB' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  switchBtn: { alignItems: 'center', paddingVertical: 8 },
  switchText: { color: '#1D9E75', fontSize: 14 },
})
