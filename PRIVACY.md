# Privacy

IsItFishy checks messages that are, by nature, personal. It is designed to keep as little
as possible.

## Data flow at a glance

| What | Where it goes | Kept |
| --- | --- | --- |
| The text, link or QR content you check | Our API and our scoring service, in memory | No |
| The address of each link in it, without its query string | Security services we use | No |
| A link you report as a scam, without its query string | The database | Yes, to spot campaigns |
| A link you say was wrongly flagged, without its query string | The database | Yes, to fix mistakes |
| Your check history | Only on your phone | Until you clear it |

Nothing in this table includes your phone number, sender, device identifier, location or
account: the app has no accounts.

## What happens when you check something

- The text you paste, the link you share or the QR content you scan is sent to the API
  and passed to our scoring service.
- It is checked in memory and the result is returned to you.
- The input is **not written** to the database, to logs or to analytics.
- Only the **address of each link**, without its query string and fragment, may be shared
  with security services we use. Your message never leaves our servers.
- Only the query string and fragment are removed before an address is shared: a link with
  personal details in its path, such as an invoice or tracking page, may still be shared.
- A result may include a preview of the page, which may show personal details from it. The
  preview is not saved in your history.

## What happens when you report a link

- Only the link is stored, together with the host, the registered domain, an optional
  category, whether you reported a scam or a wrong warning, and the score.
- The query string and fragment are removed first, because they often contain tracking
  tokens that identify the person who received the message.
- No message text, sender number, phone number, device identifier or location is stored.
- Reports are used to spot scam campaigns, to show aggregated trends and to improve the
  service.
- A link a reviewer confirms as a scam may be reported, without its query string, to the
  national CERT and to the link shortener involved.

## Permissions

- **Camera:** used only while you are scanning a QR code. Images are not saved or sent.
- The app does not read your SMS inbox. You decide what to paste or share.

## Third parties

- Security services we use may receive link addresses, without their query strings, as
  described above. They never receive your message or anything that identifies you.
- A link confirmed as a scam may be reported to the national CERT and to the link shortener
  involved.

## Contact

Open an issue in this repository for privacy questions.
