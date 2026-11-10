import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useShareIntent } from 'expo-share-intent';
import {
  Lexend_400Regular,
  Lexend_600SemiBold,
  Lexend_700Bold,
  useFonts,
} from '@expo-google-fonts/lexend';
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
import { Finder } from './src/components/Finder';
import { FONTS, type Theme, ThemeProvider, useTheme } from './src/theme';

// Expo Go and the web have no share extension; sharing works in development and store builds.
const shareDisabled =
  Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function App() {
  // The splash screen stays up until Lexend is ready, so no text jumps between faces.
  const [fontsReady] = useFonts({ Lexend_400Regular, Lexend_600SemiBold, Lexend_700Bold });
  if (!fontsReady) return null;
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
    <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.band}>
          <View style={styles.topBar}>
            <View style={styles.brand}>
              <Image
                source={require('./assets/brand-mark.png')}
                style={styles.logoMark}
                accessibilityIgnoresInvertColors
              />
              <Text style={styles.title} accessibilityRole="header">
                {s.title}
              </Text>
            </View>
            <Pressable
              onPress={() => setShowSettings(true)}
              hitSlop={8}
              style={styles.settingsButton}
              accessibilityRole="button"
            >
              <Ionicons name="settings-outline" size={18} color={theme.onInk} />
              <Text style={styles.settingsText}>{s.settings}</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{s.subtitle}</Text>
        </View>

        <View style={styles.body}>
        <View style={styles.inputCard}>
          <Finder color={theme.mark} corner="topLeft" />
          <Finder color={theme.mark} corner="topRight" />
          <Finder color={theme.mark} corner="bottomLeft" />
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
        </View>
      </ScrollView>
      <SettingsSheet lang={lang} visible={showSettings} onClose={() => setShowSettings(false)} />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}

function makeStyles(c: Theme) {
  return StyleSheet.create({
    fill: { flex: 1, backgroundColor: c.ink },
    scroll: { backgroundColor: c.bg },
    camera: { flex: 1 },
    container: { paddingBottom: 48 },
    band: {
      backgroundColor: c.ink,
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 22,
      gap: 10,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 1 },
    logoMark: { width: 44, height: 44 },
    title: {
      color: c.onInk,
      fontFamily: FONTS.bold,
      fontSize: c.font(27),
      letterSpacing: -0.4,
      flexShrink: 1,
    },
    settingsButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6 },
    settingsText: { color: c.onInk, fontFamily: FONTS.semibold, fontSize: c.font(14) },
    subtitle: {
      color: '#c3c9de',
      fontFamily: FONTS.regular,
      fontSize: c.font(15),
      lineHeight: c.font(22),
      maxWidth: 520,
    },
    body: { padding: 20, gap: 16 },
    inputCard: {
      backgroundColor: c.surface,
      borderRadius: 6,
      paddingTop: 26,
      paddingBottom: 14,
      paddingHorizontal: 16,
      gap: 12,
    },
    input: {
      minHeight: 104,
      color: c.text,
      fontFamily: FONTS.regular,
      fontSize: c.font(16),
      lineHeight: c.font(23),
      textAlignVertical: 'top',
      padding: 4,
    },
    inputTools: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', paddingLeft: 12 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 6,
      backgroundColor: c.chip,
    },
    chipText: { color: c.text, fontFamily: FONTS.semibold, fontSize: c.font(14) },
    primary: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.primaryFill,
      borderRadius: 8,
      paddingVertical: 16,
    },
    disabled: { opacity: 0.45 },
    primaryText: { color: c.onPrimary, fontFamily: FONTS.bold, fontSize: c.font(17) },
    cancel: {
      position: 'absolute',
      bottom: 48,
      alignSelf: 'center',
      backgroundColor: c.primaryFill,
      borderRadius: 8,
      paddingVertical: 13,
      paddingHorizontal: 28,
    },
    examples: { gap: 8 },
    small: { color: c.muted, fontFamily: FONTS.semibold, fontSize: c.font(13) },
    exampleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    example: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: c.surface,
    },
    exampleText: { color: c.text, fontFamily: FONTS.regular, fontSize: c.font(14) },
    error: { color: c.verdict.high, fontFamily: FONTS.regular, fontSize: c.font(15) },
  });
}
