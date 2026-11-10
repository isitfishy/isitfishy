import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useShareIntent } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import type { CheckResult } from '@isitfishy/api-client';
import { api } from './src/api';
import { History, Progress, SettingsSheet } from './src/components/Panels';
import { ResultCard } from './src/components/ResultCard';
import { sharedText } from './src/format';
import { addToHistory, type HistoryEntry, loadHistory, saveHistory } from './src/history';
import { t } from './src/i18n';
import { LanguageProvider, useLang } from './src/language';
import { type Theme, ThemeProvider, useTheme } from './src/theme';

// Expo Go and the web have no share extension; sharing works in development and store builds.
const shareDisabled =
  Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <ThemeProvider>
          <CheckScreen />
        </ThemeProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

/** Errors are kept as keys so they follow a language change like everything else. */
type ErrorKey = 'error' | 'clipboardEmpty' | 'cameraDenied';

function CheckScreen() {
  const theme = useTheme();
  const lang = useLang();
  const s = t(lang);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  // Bumped for every result shown, so a new result never inherits the last card's choices.
  const [shownCount, setShownCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [scanning, setScanning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [permission, requestPermission] = useCameraPermissions();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    disabled: shareDisabled,
  });

  useEffect(() => {
    void loadHistory().then(setHistory);
  }, []);

  async function run(text: string) {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const checked = await api.check(text);
      setResult(checked);
      setShownCount((n) => n + 1);
      const next = addToHistory(history, {
        input: text.trim(),
        checkedAt: new Date().toISOString(),
        result: checked,
      });
      setHistory(next);
      void saveHistory(next);
    } catch {
      setError('error');
    } finally {
      setLoading(false);
    }
  }

  // A message shared from SMS, a browser or a chat app is checked straight away.
  useEffect(() => {
    if (!hasShareIntent) return;
    const text = sharedText(shareIntent);
    resetShareIntent();
    if (text) {
      setInput(text);
      void run(text);
    }
  }, [hasShareIntent]);

  async function paste() {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      setError('clipboardEmpty');
      return;
    }
    setInput(text);
    void run(text);
  }

  async function startScan() {
    const granted = permission?.granted || (await requestPermission()).granted;
    if (granted) {
      setScanning(true);
    } else {
      setError('cameraDenied');
    }
  }

  function clearInput() {
    setInput('');
    setResult(null);
    setError(null);
  }

  if (scanning) {
    return (
      <View style={styles.camera}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            setScanning(false);
            setInput(data);
            void run(data);
          }}
        />
        <Pressable style={styles.cancel} onPress={() => setScanning(false)}>
          <Text style={styles.primaryText}>{s.cancel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.fill}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Image source={require('./assets/brand-mark.png')} style={styles.logoMark} accessibilityIgnoresInvertColors />
            </View>
            <Text style={styles.title}>{s.title}</Text>
          </View>
          <Pressable
            onPress={() => setShowSettings(true)}
            hitSlop={8}
            style={styles.settingsButton}
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={18} color={theme.muted} />
            <Text style={styles.settingsText}>{s.settings}</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{s.subtitle}</Text>

        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={s.placeholder}
            placeholderTextColor={theme.muted}
            multiline
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={s.placeholder}
            testID="input"
          />
          <View style={styles.inputTools}>
            <Pressable style={styles.chip} onPress={() => void paste()} testID="paste">
              <Ionicons name="clipboard-outline" size={16} color={theme.text} />
              <Text style={styles.chipText}>{s.paste}</Text>
            </Pressable>
            <Pressable style={styles.chip} onPress={() => void startScan()}>
              <Ionicons name="qr-code-outline" size={16} color={theme.text} />
              <Text style={styles.chipText}>{s.scan}</Text>
            </Pressable>
            {input.length > 0 && (
              <Pressable style={styles.chip} onPress={clearInput}>
                <Ionicons name="close" size={16} color={theme.text} />
                <Text style={styles.chipText}>{s.clear}</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          testID="check"
          style={[styles.primary, (!input.trim() || loading) && styles.disabled]}
          onPress={() => void run(input)}
        >
          <Ionicons name="search" size={18} color={theme.onPrimary} />
          <Text style={styles.primaryText}>{loading ? s.checking : s.check}</Text>
        </Pressable>

        {!input && !result && !loading && (
          <View style={styles.examples}>
            <Text style={styles.small}>{s.examples}</Text>
            <View style={styles.exampleRow}>
              {s.exampleList.map((example) => (
                <Pressable
                  key={example.label}
                  style={styles.example}
                  onPress={() => {
                    setInput(example.text);
                    void run(example.text);
                  }}
                >
                  <Text style={styles.exampleText}>{example.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {loading && <Progress lang={lang} />}
        {error && <Text style={styles.error}>{s[error]}</Text>}
        {result && <ResultCard key={shownCount} result={result} lang={lang} />}

        {!loading && (
          <History
            lang={lang}
            entries={history}
            onOpen={(entry) => {
              setInput(entry.input);
              setResult(entry.result);
              setShownCount((n) => n + 1);
              setError(null);
            }}
            onClear={() => {
              setHistory([]);
              void saveHistory([]);
            }}
          />
        )}
      </ScrollView>
      <SettingsSheet lang={lang} visible={showSettings} onClose={() => setShowSettings(false)} />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

function makeStyles(c: Theme) {
  return StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.bg },
    camera: { flex: 1 },
    container: { padding: 20, gap: 14, paddingBottom: 48 },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    logo: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: c.primaryFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoMark: { width: 30, height: 30 },
    title: { color: c.text, fontSize: c.font(28), fontWeight: '800' },
    settingsButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    settingsText: { color: c.muted, fontWeight: '600', fontSize: c.font(14) },
    subtitle: { color: c.muted, fontSize: c.font(15), lineHeight: c.font(21) },
    inputCard: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: 12,
      gap: 10,
    },
    input: {
      minHeight: 96,
      color: c.text,
      fontSize: c.font(16),
      textAlignVertical: 'top',
      padding: 4,
    },
    inputTools: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: c.chip,
    },
    chipText: { color: c.text, fontWeight: '600', fontSize: c.font(14) },
    primary: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
      backgroundColor: c.primaryFill,
      borderRadius: 14,
      paddingVertical: 15,
    },
    disabled: { opacity: 0.5 },
    primaryText: { color: c.onPrimary, fontWeight: '700', fontSize: c.font(16) },
    cancel: {
      position: 'absolute',
      bottom: 48,
      alignSelf: 'center',
      backgroundColor: c.primaryFill,
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 28,
    },
    examples: { gap: 8 },
    small: { color: c.muted, fontSize: c.font(13), fontWeight: '600' },
    exampleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    example: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 12,
      backgroundColor: c.surface,
    },
    exampleText: { color: c.text, fontSize: c.font(14) },
    error: { color: c.verdict.high, fontSize: c.font(15) },
  });
}
