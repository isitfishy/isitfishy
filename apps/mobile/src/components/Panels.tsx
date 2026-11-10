import { shown } from '../format';
import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { type HistoryEntry, preview } from '../history';
import { emergencyNumber } from '../emergency';
import { type Lang, LANG_NAMES, LANGS, t } from '../i18n';
import { useRegion, useSetLang } from '../language';
import {
  FONTS,
  THEME_PREFERENCES,
  type Theme,
  useTheme,
  useThemePreference,
  verdictIcon,
} from '../theme';

/** Shown while the user waits for a result. */
export function Progress({ lang }: { lang: Lang }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const s = t(lang);
  return (
    <View style={styles.panel}>
      <View style={styles.step}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={styles.stepText}>{s.checking}</Text>
      </View>
      <Text style={styles.note}>{s.checkingDetail}</Text>
    </View>
  );
}

export function History(props: {
  lang: Lang;
  entries: HistoryEntry[];
  onOpen: (entry: HistoryEntry) => void;
  onClear: () => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const s = t(props.lang);
  if (props.entries.length === 0) return null;
  return (
    <View style={styles.historyBox}>
      <View style={styles.historyHead}>
        <Text style={styles.heading}>{s.history}</Text>
        <Pressable onPress={props.onClear} hitSlop={8}>
          <Text style={styles.link}>{s.clear}</Text>
        </Pressable>
      </View>
      <View style={styles.panel}>
        {props.entries.map((entry) => (
          <Pressable
            key={entry.checkedAt}
            style={styles.row}
            onPress={() => props.onOpen(entry)}
          >
            <Ionicons
              name={verdictIcon[shown(entry.result)]}
              size={20}
              color={theme.verdict[shown(entry.result)]}
            />
            <Text style={styles.rowText} numberOfLines={1}>
              {preview(entry.input)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.note}>{s.historyNote}</Text>
    </View>
  );
}

/** A bottom sheet that scrolls when its content is taller than the screen (large text). */
function Sheet(props: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent
      onRequestClose={props.onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={styles.sheetBody}>{props.children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** Calm, step-by-step advice for someone who already opened a scam link. */
function HelpSteps({ lang }: { lang: Lang }) {
  const theme = useTheme();
  const region = useRegion();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const s = t(lang);
  return (
    <>
      <Text style={styles.sheetTitle} accessibilityRole="header">
        {s.help}
      </Text>
      <Text style={styles.stepText}>{s.helpIntro}</Text>
      {s.helpSteps.map((step, i) => (
        <View key={step.title} style={styles.step}>
          <View style={styles.number}>
            <Text style={styles.numberText}>{i + 1}</Text>
          </View>
          <View style={styles.grow}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepText}>{step.body}</Text>
          </View>
        </View>
      ))}
      <View style={styles.step}>
        <Ionicons name="call-outline" size={18} color={theme.verdict.high} />
        <Text style={styles.stepText}>{s.helpEmergency(emergencyNumber(region))}</Text>
      </View>
    </>
  );
}

export function HelpSheet(props: { lang: Lang; visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const s = t(props.lang);
  return (
    <Sheet visible={props.visible} onClose={props.onClose}>
      <HelpSteps lang={props.lang} />
      <Pressable style={styles.closeButton} onPress={props.onClose}>
        <Text style={styles.closeText}>{s.close}</Text>
      </Pressable>
    </Sheet>
  );
}

/**
 * Appearance, language, text size, what to do after a click and what happens to the data,
 * in one sheet.
 */
export function SettingsSheet(props: { lang: Lang; visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { preference, setPreference, largeText, setLargeText } = useThemePreference();
  const setLang = useSetLang();
  // Help opens inside this sheet: a second modal on top of the first is unreliable on iOS.
  const [showHelp, setShowHelp] = useState(false);
  const s = t(props.lang);
  function close() {
    setShowHelp(false);
    props.onClose();
  }
  if (showHelp) {
    return (
      <Sheet visible={props.visible} onClose={close}>
        <HelpSteps lang={props.lang} />
        <Pressable style={styles.closeButton} onPress={() => setShowHelp(false)}>
          <Text style={styles.closeText}>{s.back}</Text>
        </Pressable>
      </Sheet>
    );
  }
  return (
    <Sheet visible={props.visible} onClose={close}>
      <Text style={styles.sheetTitle}>{s.appearance}</Text>
      <View style={styles.segments} accessibilityRole="radiogroup">
        {THEME_PREFERENCES.map((option) => {
          const on = option === preference;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={[styles.segment, on && styles.segmentOn]}
              onPress={() => setPreference(option)}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                {s.themes[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.sheetTitle, styles.spaced]}>{s.language}</Text>
      <View style={styles.languages} accessibilityRole="radiogroup">
        {LANGS.map((option) => {
          const on = option === props.lang;
          return (
            <Pressable
              key={option}
              testID={`language-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLanguage={option}
              style={[styles.language, on && styles.languageOn]}
              onPress={() => setLang(option)}
            >
              <Text style={[styles.languageText, on && styles.languageTextOn]}>
                {LANG_NAMES[option]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text style={styles.stepTitle}>{s.largeText}</Text>
          <Text style={styles.note}>{s.largeTextNote}</Text>
        </View>
        <Switch
          testID="large-text"
          value={largeText}
          onValueChange={setLargeText}
          accessibilityLabel={s.largeText}
        />
      </View>
      <Pressable
        testID="help-settings"
        style={styles.helpButton}
        accessibilityRole="button"
        onPress={() => setShowHelp(true)}
      >
        <Ionicons name="help-buoy-outline" size={20} color={theme.verdict.high} />
        <Text style={[styles.stepTitle, styles.grow]}>{s.help}</Text>
        <Ionicons name="chevron-forward" size={18} color={theme.muted} />
      </Pressable>
      <Text style={[styles.sheetTitle, styles.spaced]}>{s.privacyTitle}</Text>
      {s.privacyPoints.map((point) => (
        <View key={point} style={styles.step}>
          <Ionicons name="lock-closed-outline" size={18} color={theme.primary} />
          <Text style={styles.stepText}>{point}</Text>
        </View>
      ))}
      <Pressable style={styles.closeButton} onPress={close}>
        <Text style={styles.closeText}>{s.close}</Text>
      </Pressable>
    </Sheet>
  );
}

function makeStyles(c: Theme) {
  return StyleSheet.create({
    panel: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 14,
      gap: 12,
    },
    step: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    stepText: { color: c.text, fontSize: c.font(15), lineHeight: c.font(20), flex: 1, fontFamily: FONTS.regular },
    note: { color: c.muted, fontSize: c.font(13), fontFamily: FONTS.regular },
    historyBox: { gap: 8 },
    historyHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    heading: { color: c.text, fontFamily: FONTS.bold, fontSize: c.font(17) },
    link: { color: c.primary, fontFamily: FONTS.semibold, fontSize: c.font(14) },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rowText: { color: c.text, fontSize: c.font(15), flex: 1, fontFamily: FONTS.regular },
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8,12,32,0.55)' },
    sheet: {
      backgroundColor: c.surface,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      maxHeight: '90%',
    },
    sheetBody: { padding: 24, paddingBottom: 40, gap: 14 },
    sheetTitle: { color: c.text, fontSize: c.font(20), fontFamily: FONTS.bold },
    grow: { flex: 1 },
    stepTitle: { color: c.text, fontSize: c.font(16), lineHeight: c.font(22), fontFamily: FONTS.bold },
    number: {
      width: c.font(26),
      height: c.font(26),
      borderRadius: 4,
      backgroundColor: c.chip,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numberText: { color: c.text, fontFamily: FONTS.bold, fontSize: c.font(14) },
    helpButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      padding: 12,
    },
    spaced: { marginTop: 8 },
    segments: { flexDirection: 'row', backgroundColor: c.chip, borderRadius: 8, padding: 4 },
    segment: { flex: 1, paddingVertical: 9, borderRadius: 6, alignItems: 'center' },
    segmentOn: { backgroundColor: c.surface },
    segmentText: { color: c.muted, fontFamily: FONTS.semibold, fontSize: c.font(14) },
    segmentTextOn: { color: c.text },
    languages: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    language: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    languageOn: { backgroundColor: c.primaryFill, borderColor: c.primary },
    languageText: { color: c.text, fontFamily: FONTS.semibold, fontSize: c.font(14) },
    languageTextOn: { color: c.onPrimary },
    closeButton: {
      marginTop: 8,
      backgroundColor: c.primaryFill,
      borderRadius: 8,
      paddingVertical: 13,
      alignItems: 'center',
    },
    closeText: { color: c.onPrimary, fontFamily: FONTS.bold, fontSize: c.font(16) },
  });
}
