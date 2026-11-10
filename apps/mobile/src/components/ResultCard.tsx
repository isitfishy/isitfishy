import { Ionicons } from '@expo/vector-icons';
import type { CheckResult, ReportKind } from '@isitfishy/api-client';
import { useMemo, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import {
  evidence,
  familyMessage,
  openable,
  reasons,
  reassurances,
  shown,
} from '../format';
import type { Lang } from '../i18n';
import { t } from '../i18n';
import { HelpSheet } from './Panels';
import { type Theme, useTheme, verdictIcon } from '../theme';

// How full the bar is for each band: a picture of the band, not a measurement.
const METER = { low: '15%', unverified: '40%', medium: '60%', high: '95%' } as const;

type Send = 'idle' | 'sending' | 'done' | 'failed';
type IconName = keyof typeof Ionicons.glyphMap;

export function ResultCard({ result, lang }: { result: CheckResult; lang: Lang }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const s = t(lang);
  const view = shown(result);
  const color = theme.verdict[view];
  const proof = evidence(result, lang);
  const warnings = reasons(result, lang);
  const favour = reassurances(result, lang);
  const leadsTo = result.destination;
  const link = result.link;
  const [sent, setSent] = useState<{ kind: ReportKind; state: Send } | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showPage, setShowPage] = useState(false);
  const [largePage, setLargePage] = useState(false);
  // What the person chose on the stop panel. Kept only while this result is on screen.
  const [stop, setStop] = useState<'cancel' | 'later' | null>(null);
  const risky = view !== 'low';
  // Asking for a decision only fits a result with warning signs, not an unknown site.
  const alarm = view === 'high' || view === 'medium' ? view : null;
  const target = link ? openable(link) : null;

  function shareWithFamily() {
    // The share sheet only ever gets the summary and the defanged link, never the message.
    Share.share({ message: familyMessage(result, lang) }).catch(() => undefined);
  }

  function openSite() {
    if (!target) return;
    const go = () => void Linking.openURL(target).catch(() => undefined);
    if (!risky) return go();
    // Opening a link the check flagged always takes a second, deliberate tap.
    if (Platform.OS === 'web') {
      const confirm = (globalThis as { confirm?: (message: string) => boolean }).confirm;
      if (confirm?.(`${s.openTitle}\n\n${s.openBody}\n\n${s.stopPressure}`)) go();
      return;
    }
    Alert.alert(s.openTitle, `${s.openBody}\n\n${s.stopPressure}`, [
      { text: s.cancel, style: 'cancel' },
      { text: s.openAnyway, style: 'destructive', onPress: go },
    ]);
  }

  async function send(kind: ReportKind) {
    if (!link) return;
    setSent({ kind, state: 'sending' });
    try {
      await api.report({ url: link, kind });
      setSent({ kind, state: 'done' });
    } catch {
      setSent({ kind, state: 'failed' });
    }
  }

  function Section(props: { title: string; lines: string[]; icon: IconName; tint: string }) {
    if (props.lines.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{props.title}</Text>
        {props.lines.map((line) => (
          <View key={line} style={styles.line}>
            <Ionicons name={props.icon} size={18} color={props.tint} style={styles.lineIcon} />
            <Text style={styles.lineText}>{line}</Text>
          </View>
        ))}
      </View>
    );
  }

  const done = sent?.state === 'done';
  return (
    <View style={[styles.card, { borderColor: color }]}>
      <View style={[styles.header, { backgroundColor: theme.tint[view] }]}>
        <Ionicons name={verdictIcon[view]} size={40} color={color} />
        <View style={styles.grow}>
          <Text testID="verdict" style={[styles.verdict, { color }]}>
            {s.verdict[view]}
          </Text>
          <Text style={styles.headline}>{s.headline[view]}</Text>
        </View>
      </View>
      <View style={styles.meter} accessibilityLabel={s.verdict[view]}>
        <View style={[styles.meterFill, { width: METER[view], backgroundColor: color }]} />
      </View>

      <View style={styles.body}>
        {alarm && (
          <View testID="stop" style={[styles.stop, { borderColor: color }]}>
            <Text style={[styles.stopTitle, { color }]}>{s.stopTitle[alarm]}</Text>
            <Text style={styles.lineText}>{s.stopBody}</Text>
            {stop === null ? (
              <>
                <Text style={styles.lineText}>{s.stopPressure}</Text>
                <Pressable
                  testID="stop-cancel"
                  style={[styles.action, styles.primary, { backgroundColor: theme.primaryFill }]}
                  accessibilityRole="button"
                  onPress={() => setStop('cancel')}
                >
                  <Ionicons name="hand-left-outline" size={16} color={theme.onPrimary} />
                  <Text style={[styles.actionText, { color: theme.onPrimary }]}>{s.stopCancel}</Text>
                </Pressable>
                <Pressable
                  testID="stop-later"
                  style={[styles.action, { borderColor: theme.primary }]}
                  accessibilityRole="button"
                  onPress={() => setStop('later')}
                >
                  <Ionicons name="time-outline" size={16} color={theme.primary} />
                  <Text style={[styles.actionText, { color: theme.primary }]}>{s.stopLater}</Text>
                </Pressable>
              </>
            ) : (
              <Text testID="stop-done" style={styles.stopDone} accessibilityLiveRegion="polite">
                {stop === 'cancel' ? s.stopCancelled : s.stopLaterDone}
              </Text>
            )}
          </View>
        )}
        {leadsTo && (
          <View style={styles.address}>
            <Ionicons name="link" size={16} color={theme.muted} />
            <View style={styles.grow}>
              <Text style={styles.addressLabel}>{s.leadsTo}</Text>
              <Text style={styles.addressText} selectable>
                {leadsTo}
              </Text>
            </View>
          </View>
        )}
        <Section title={s.evidence} lines={proof} icon="alert-circle" tint={theme.verdict.high} />
        <Section title={s.why} lines={warnings} icon="warning-outline" tint={theme.verdict.medium} />
        {proof.length === 0 && warnings.length === 0 && (
          <Text style={styles.lineText}>{s.noReasons}</Text>
        )}
        <Section
          title={s.inFavour}
          lines={favour}
          icon="checkmark-circle-outline"
          tint={theme.verdict.low}
        />
        {result.preview && !showPage && (
          <View style={styles.section}>
            <Pressable
              testID="preview"
              style={[styles.action, { borderColor: theme.border }]}
              accessibilityRole="button"
              onPress={() => setShowPage(true)}
            >
              <Ionicons name="image-outline" size={16} color={theme.text} />
              <Text style={[styles.actionText, { color: theme.text }]}>{s.previewShow}</Text>
            </Pressable>
            <Text style={styles.note}>{s.previewHint}</Text>
          </View>
        )}
        {result.preview && showPage && (
          <View style={styles.section}>
            <Text style={styles.previewNote}>{s.previewNote}</Text>
            <Pressable accessibilityRole="imagebutton" onPress={() => setLargePage(!largePage)}>
              <Image
                testID="preview-image"
                accessibilityLabel={s.previewShow}
                source={{ uri: `data:image/jpeg;base64,${result.preview}` }}
                resizeMode="contain"
                style={largePage ? styles.previewLarge : styles.preview}
              />
            </Pressable>
          </View>
        )}
        {view === 'low' && (
          <Text testID="low-verify" style={styles.lineText}>
            {s.lowVerify}
          </Text>
        )}
        {view === 'low' && <Text style={styles.note}>{s.lowNote}</Text>}
        {view === 'unverified' && (
          <Text testID="unverified-note" style={styles.note}>
            {s.unverifiedNote}
          </Text>
        )}

        {risky && (
          <Pressable
            testID="help"
            style={[styles.helpButton, { backgroundColor: theme.tint[view] }]}
            accessibilityRole="button"
            onPress={() => setShowHelp(true)}
          >
            <Ionicons name="help-buoy-outline" size={20} color={color} />
            <Text style={[styles.helpText, styles.grow]}>{s.help}</Text>
            <Ionicons name="chevron-forward" size={18} color={theme.muted} />
          </Pressable>
        )}
        {target && !risky && (
          <Pressable
            testID="open"
            style={[styles.action, styles.primary, { backgroundColor: theme.primaryFill }]}
            accessibilityRole="link"
            onPress={openSite}
          >
            <Ionicons name="open-outline" size={16} color={theme.onPrimary} />
            <Text style={[styles.actionText, { color: theme.onPrimary }]}>{s.open}</Text>
          </Pressable>
        )}
        <Pressable
          testID="share"
          style={[styles.action, { borderColor: theme.primary }]}
          accessibilityRole="button"
          onPress={shareWithFamily}
        >
          <Ionicons name="people-outline" size={16} color={theme.primary} />
          <Text style={[styles.actionText, { color: theme.primary }]}>{s.share}</Text>
        </Pressable>

        {link && !done && (
          <View style={styles.actions}>
            <Pressable
              testID="report"
              style={[styles.action, { borderColor: theme.verdict.high }]}
              disabled={sent?.state === 'sending'}
              onPress={() => void send('SCAM')}
            >
              <Ionicons name="flag-outline" size={16} color={theme.verdict.high} />
              <Text style={[styles.actionText, { color: theme.verdict.high }]}>
                {sent?.kind === 'SCAM' && sent.state === 'sending' ? s.reporting : s.report}
              </Text>
            </Pressable>
            {result.verdict !== 'low' && (
              <Pressable
                testID="wrong"
                style={styles.textAction}
                disabled={sent?.state === 'sending'}
                onPress={() => void send('NOT_SCAM')}
              >
                <Text style={styles.textActionText}>
                  {sent?.kind === 'NOT_SCAM' && sent.state === 'sending' ? s.reporting : s.wrong}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        {done && (
          <Text style={styles.note}>{sent?.kind === 'SCAM' ? s.reported : s.wrongDone}</Text>
        )}
        {sent?.state === 'failed' && <Text style={styles.error}>{s.reportFailed}</Text>}
        {target && risky && stop === null && (
          <Pressable
            testID="open"
            style={styles.textAction}
            accessibilityRole="link"
            onPress={openSite}
          >
            <Text style={styles.textActionText}>{s.openAnyway}</Text>
          </Pressable>
        )}
      </View>
      <HelpSheet lang={lang} visible={showHelp} onClose={() => setShowHelp(false)} />
    </View>
  );
}

function makeStyles(c: Theme) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: c.surface,
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
    grow: { flex: 1 },
    verdict: { fontWeight: '800', fontSize: c.font(19) },
    headline: { color: c.text, fontSize: c.font(15), marginTop: 2 },
    meter: { height: 6, backgroundColor: c.chip },
    meterFill: { height: 6 },
    body: { padding: 16, gap: 16 },
    stop: { borderWidth: 2, borderRadius: 12, padding: 14, gap: 10 },
    stopTitle: { fontWeight: '800', fontSize: c.font(18) },
    stopDone: { color: c.text, fontWeight: '600', fontSize: c.font(15), lineHeight: c.font(21) },
    address: {
      flexDirection: 'row',
      gap: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.chip,
    },
    addressLabel: { color: c.muted, fontSize: c.font(12), fontWeight: '600' },
    addressText: {
      color: c.text,
      fontSize: c.font(13),
      fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    },
    section: { gap: 8 },
    // Small by default, so the verdict and the warning stay in view next to the page's pixels.
    preview: {
      width: '100%',
      height: 320,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.chip,
    },
    previewLarge: {
      width: '100%',
      maxWidth: 390,
      alignSelf: 'center',
      aspectRatio: 390 / 844,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionTitle: { color: c.text, fontWeight: '700', fontSize: c.font(15) },
    previewNote: { color: c.text, fontWeight: '600', fontSize: c.font(13), lineHeight: c.font(18) },
    line: { flexDirection: 'row', gap: 8 },
    lineIcon: { marginTop: 1 },
    lineText: { color: c.text, fontSize: c.font(15), lineHeight: c.font(21), flex: 1 },
    note: { color: c.muted, fontSize: c.font(13), lineHeight: c.font(18) },
    error: { color: c.verdict.high, fontSize: c.font(14) },
    actions: { gap: 4 },
    action: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 11,
    },
    actionText: { fontWeight: '600', fontSize: c.font(15) },
    primary: { borderWidth: 0 },
    helpButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 10,
      padding: 12,
    },
    helpText: { color: c.text, fontWeight: '700', fontSize: c.font(15) },
    textAction: { alignItems: 'center', paddingVertical: 8 },
    textActionText: { color: c.muted, fontSize: c.font(14), textDecorationLine: 'underline' },
  });
}
