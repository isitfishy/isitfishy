import { Lang, t } from './i18n';
import type { CheckResult, Reason } from '@isitfishy/api-client';

function lines(result: CheckResult, group: Reason['group'], lang: Lang): string[] {
  return result.reasons
    .filter((r) => r.group === group)
    .map((r) => r.message[lang] ?? r.message.en ?? r.message.tr);
}

/** Strong reasons against the link. */
export function evidence(result: CheckResult, lang: Lang): string[] {
  return lines(result, 'evidence', lang);
}

/** Warning signs, in the order the server sent them. */
export function reasons(result: CheckResult, lang: Lang): string[] {
  return lines(result, 'warning', lang);
}

/** What speaks for the link. */
export function reassurances(result: CheckResult, lang: Lang): string[] {
  return lines(result, 'reassurance', lang);
}

/**
 * A link that cannot be tapped by accident: hxxps://ptt-kargo[.]xyz. The query and fragment
 * are dropped, since they can carry a tracking code that identifies the person it was sent to.
 */
export function defang(url: string): string {
  return url
    .trim()
    .replace(/[?#].*$/, '')
    .replace(/^http/i, 'hxxp')
    .replace(/\./g, '[.]');
}

/** Defangs every address inside a line of text, such as a host named in a reason. */
function defangText(text: string): string {
  return text.replace(/\bhttp/gi, 'hxxp').replace(/([\p{L}\p{N}-])\.(?=[\p{L}\p{N}])/gu, '$1[.]');
}

/** How a result is shown: a low verdict the server could not back up is "unverified". */
export type Shown = CheckResult['verdict'] | 'unverified';

export function shown(result: CheckResult): Shown {
  return result.verdict === 'low' && result.unverified ? 'unverified' : result.verdict;
}

/**
 * A short warning to send to family: verdict, headline, top reasons and the defanged link.
 * The message that was checked is never included.
 */
export function familyMessage(result: CheckResult, lang: Lang): string {
  const s = t(lang);
  const top = [...evidence(result, lang), ...reasons(result, lang)].slice(0, 3).map(defangText);
  const link = result.link;
  const parts = [`${s.verdict[shown(result)]}: ${s.headline[shown(result)]}`];
  if (top.length > 0) parts.push(`${s.shareWhy}\n${top.map((line) => `- ${line}`).join('\n')}`);
  if (link) parts.push(`${s.shareLink}\n${defang(link)}`);
  parts.push(s.shareFooter);
  return parts.join('\n\n');
}

/** Text to check from something shared into the app: the message, plus a link shared with it. */
export function sharedText(shared: { text?: string | null; webUrl?: string | null }): string {
  const text = shared.text?.trim() ?? '';
  const url = shared.webUrl?.trim() ?? '';
  if (url && !text.includes(url)) return text ? `${text}\n${url}` : url;
  return text;
}

/**
 * The link as a web address the app may hand to the browser, or null. Only http and https are
 * opened; a bare host gets https://, and any other scheme (javascript:, intent:, tel:...) is refused.
 */
export function openable(link: string): string | null {
  const text = link.trim();
  if (!text || /[\s\u0000-\u001f]/.test(text)) return null;
  if (/^https?:\/\/[^/?#]+/i.test(text)) return text;
  // "host:8080/path" is a bare host with a port, not a scheme.
  if (/^[a-z][a-z0-9+.-]*:(?!\d)/i.test(text)) return null;
  return `https://${text}`;
}
