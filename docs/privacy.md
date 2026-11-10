# Privacy

IsItFishy checks messages that are, by nature, personal. It is built to keep as little as
possible. The full policy is in
[PRIVACY.md](https://github.com/isitfishy/isitfishy/blob/main/PRIVACY.md); this page is the
short version.

## In short

- **What you check is not stored.** The text, link or QR content goes to the API and the
  scoring service, is checked in memory, and is not written to the database, to logs or to
  analytics.
- **Only link addresses may leave our servers.** The address of each link, without its
  query string and fragment, may be checked with security services we use. Your message and
  anything that identifies you are never shared.
- **No accounts.** The app has no sign-up, no device identifier and no advertising. It does
  not ask for your phone number, contacts or location.
- **Your history stays on your phone.** Recent checks are kept only on the device, until you
  clear them.
- **Reports keep the link only.** When you report a link, the API stores the link without
  its query string and fragment, which often carry tokens that identify the recipient,
  together with its domain and the category you picked. No message text, sender or phone
  number is stored. A link a reviewer confirms as a scam may be reported, without its query
  string, to the national CERT and to the link shortener involved.
- **The camera is used only while scanning** a QR code. Images are not saved or sent.
- **The app does not read your SMS inbox.** You decide what to paste or share.

## If you run your own instance

The API keeps the promises above by itself: it never logs or stores the check input and
strips query strings from reports. A scorer you plug in receives the full input, so it
should follow the same rules. See the
[scoring service contract](scoring-contract.md#the-stub-scorer).

## Questions

Open an issue in the repository for privacy questions.
