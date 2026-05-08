/**
 * silentAlarmScenes.jsx — v25.7.0.27
 *
 * Scene data for Account Manipulation: Change E-Delivery /
 * Notification Settings (F1008.001) — the first Phase 2
 * Positioning (FA0001) animation. Uses
 * MultiActorSequenceAnimation engine.
 *
 * F1008.001 is the silent-alarm move: after Initial Access, the
 * fraudster logs in once and changes the customer's notification
 * preferences (statement email, SMS alert thresholds, push
 * notifications, login alerts) so subsequent fraud activity
 * generates no customer-side signal. The customer's normal
 * detection channel — "I'd notice if something happened to my
 * account because the bank would alert me" — is silently severed
 * before any monetization step. The customer continues their life
 * unaware that the alarm system has been disabled.
 *
 * Phase 2 begins with this technique because it is the bridge
 * from Initial Access (Phase 1, where the fraudster gets in) to
 * Execution and Monetization (Phase 3+, where the fraudster takes
 * money out). Without Silent Alarm, almost every Phase 1 entry
 * vector is detected within minutes by SMS or push alerts to the
 * customer's phone — the customer calls the bank and the fraud is
 * stopped before significant funds move. Silent Alarm closes that
 * detection window. It is the single most leveraged technique in
 * the entire kill chain measured by per-execution dwell-time
 * extension, and is correspondingly under-represented in
 * customer-facing fraud-awareness materials.
 *
 * Composite case grounded in:
 * - Bank of Jamaica 2024-2025 internet-banking fraud reporting —
 *   documented pattern of "victim discovered loss only on
 *   quarterly paper statement" cases where customer-side
 *   notifications had been silently rerouted weeks earlier
 * - FFIEC and FinCEN documentation of "alert manipulation as
 *   Positioning" pattern in business email compromise (BEC)
 *   investigations where attackers route fraud confirmations
 *   to attacker-controlled inboxes
 * - Public BEC case writeups (e.g., FBI IC3 2023-2024 reports)
 *   describing the dwell-time extension achievable by quietly
 *   modifying notification destinations rather than blocking
 *   them outright
 * - Caribbean small-business banking norms — small operators
 *   often check banking activity weekly via SMS digests rather
 *   than logging into web banking daily; the SMS alert is
 *   functionally the customer's primary detection channel,
 *   making its silent suppression catastrophic
 *
 * Scenario character: Mrs. Karen Ferguson, age 44, proprietor of
 * a 3-stylist salon in Ocho Rios, CIBC FirstCaribbean
 * SmartLine business banking customer for 11 years. Two days
 * before this scenario opens, Karen received a phishing SMS
 * impersonating CIBC's online banking ("urgent verification
 * required"), entered her credentials into a Smishing Triad
 * "Lighthouse" kit phishing page (the same kit shape grounding
 * v25.7.0.12 Phishing). The fraudster crew now holds her
 * username and password but has done nothing with them yet — the
 * full attack only activates after Silent Alarm is in place.
 * This scenario picks up Sunday night, two days after the
 * phishing capture, with the crew about to make their first
 * authenticated move.
 *
 * Distinct character from all prior animation characters
 * (Allison Brown, Marcia Edwards, Trevor Bennett, Beverly
 * Williams, Devon Henry, Tanya Ricketts, Andre Lewis, Pat
 * Henriques, Devon Walters, Janelle Chambers, Karelle Bryan,
 * Marcus Bryan, Tashana Hall, Ricardo Powell). First-name and
 * surname both new to the roster. CIBC FirstCaribbean is the
 * fourth Caribbean institution represented in animations,
 * balancing distribution with prior NCB/JNCB/Scotia
 * scenarios.
 *
 * Pedagogical insight (locked v25.7.0.27):
 *   The silence is the signal. Trainees default-assume that "no
 *   notifications" means "nothing is happening." Silent Alarm
 *   inverts that default: the absence of expected notifications
 *   is itself a fraud signature. The diagnostic protocol shifts
 *   from "watch for alerts" to "watch for the cessation of
 *   alerts that should be present" — the bank's notification
 *   subsystem fired correctly; the destination was wrong; the
 *   customer received nothing.
 *
 *   For customer-facing fraud-awareness materials, this means
 *   teaching customers to treat unexpected silence as
 *   suspicious — "if you usually get a weekly statement on
 *   Sunday morning and you didn't this Sunday, log in and check
 *   your notification settings." This is the inverse of the
 *   conventional "watch for unexpected texts" guidance and is
 *   substantially harder to teach because absence is cognitively
 *   harder to notice than presence.
 *
 *   For institutional defenders, the fix is dual-channel
 *   confirmation on any notification-settings change:
 *   simultaneously dispatch the change-confirmation through
 *   ALL pre-existing channels (old email AND old SMS number AND
 *   logged-in app push) before applying the change, and require
 *   step-up authentication via one of those original channels
 *   to commit. Defeats Silent Alarm because the attacker would
 *   need to control the customer's pre-existing channels (which
 *   they do not — that is precisely why they are trying to
 *   change them).
 *
 * Editorial principle (locked v25.7.0.12+):
 *   Comprehensive coverage; real-world training, not sheltered.
 *   The naive control "customers should review their account
 *   statements monthly" is surfaced and explicitly countered:
 *   Silent Alarm specifically diverts the statement to an
 *   attacker-controlled email address, so the customer has no
 *   statement to review. Statement-review hygiene is necessary
 *   but not sufficient; the institutional fix has to live in
 *   the bank's settings-change flow, not in customer behavior.
 */


/* ─── Actors ──────────────────────────────────────────────────── */
export const SILENT_ALARM_ACTORS = [
  {
    id: 'fraudster',
    name: 'Fraudster crew',
    role: 'Holds Karen\'s phished credentials · Sunday 02:14 AM session',
    initialState: 'active',
  },
  {
    id: 'karen',
    name: 'Mrs. Karen Ferguson',
    role: 'CIBC FirstCaribbean business customer · Ocho Rios salon · age 44',
    initialState: 'unaware',
  },
  {
    id: 'cibc',
    name: 'CIBC Web Banking',
    role: 'Bank · login + settings + transfers',
    initialState: 'silent',
  },
  {
    id: 'notif',
    name: 'CIBC Notification Subsystem',
    role: 'Email + SMS + push delivery · DID fire · went to wrong destination',
    initialState: 'silent',
  },
  {
    id: 'mule',
    name: 'External cash-out',
    role: 'Mule beneficiaries · two business accounts · Montego Bay + Kingston',
    initialState: 'silent',
  },
]


/* ─── Detection controls ──────────────────────────────────────── */
export const SILENT_ALARM_CONTROLS = [
  {
    id: 'ctrl-dual-channel-settings-confirm',
    label: 'Dual-channel confirmation on any notification-settings change',
    meta: 'Bank-side: any change to statement email, SMS-alert phone number, SMS-alert threshold, push-notification toggles, or login-notification toggles dispatches a confirmation-required notice through ALL pre-existing channels simultaneously (old email, old SMS, logged-in app push) — and requires the customer to complete step-up authentication via one of those original channels before the change commits. Defeats Silent Alarm directly because the attacker controls only the new web-banking session, not the customer\'s pre-existing email/SMS/push endpoints. Implementation cost is one notification dispatch per settings-change event plus a 5-minute confirmation hold; UX impact is small for legitimate users (most never change these settings) and total for attackers (every Silent Alarm attempt fails). This is the single highest-leverage control against F1008.001.',
    naive: false,
    revealsAtStages: [3],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'settings-change attempts',
  },
  {
    id: 'ctrl-cooling-off-statement-email',
    label: 'Dual-delivery on statement email for 30 days after change',
    meta: 'Bank-side: when a customer changes their statement-delivery email address, send statements (and any high-value transaction confirmations) to BOTH the old and new email addresses for 30 days. After the cooling-off period, drop the old address. Defeats Silent Alarm by ensuring the customer\'s pre-existing email continues to receive at least one fraud-bearing statement before the attacker has fully transitioned the customer\'s notification surface. Implementation cost is 30 days of duplicated email volume per settings change. Caribbean banking customers tend to keep email addresses for years, so the false-positive rate (legitimate customers genuinely switching email) is low — most settings changes are themselves the suspicious event.',
    naive: false,
    revealsAtStages: [3, 5],
    catchCount: 1,
    catchTotal: 1,
    catchUnit: 'statement-email changes',
  },
  {
    id: 'ctrl-settings-change-banner-on-login',
    label: 'Customer-facing audit banner: "Your settings were changed" on next login',
    meta: 'Bank-side + customer-facing: on the customer\'s next web/app login after any settings change, show a prominent banner: "Your notification preferences were changed Sunday at 02:14 AM. Was this you? [Yes, dismiss] [No, restore + report fraud]." The banner persists until acknowledged. Catches Silent Alarm at the moment the legitimate customer next logs in — typically before the Execution step has completed if the customer logs in regularly. Implementation cost is trivial (one row in the audit log + a banner component). Falls short for customers who do not log in frequently between Positioning and Execution; for Karen\'s case, she logs in only when she needs to make a wire transfer, which is rare for her business — so the banner would have caught the fraud only if she happened to log in during the three-day Positioning window. This is the second-best control after dual-channel confirmation, but it relies on the legitimate customer\'s login cadence, which the attacker can profile and time around.',
    naive: false,
    revealsAtStages: [4, 5],
    catchCount: 0,
    catchTotal: 1,
    catchUnit: 'customer login windows',
  },
  {
    id: 'ctrl-naive-monthly-statement-review',
    label: 'Customers should review their account statements monthly',
    meta: 'Treats Silent Alarm as a customer-vigilance problem solvable by good statement-review hygiene. The advice is sound for catching legacy paper-statement fraud, but Silent Alarm specifically diverts the statement-delivery email to an attacker-controlled inbox before any fraudulent transaction happens. The customer cannot review what they do not receive. By the time Karen notices that she has not received a CIBC statement (typically 30+ days after the change, when the calendar prompt of the missing statement crosses the threshold of conscious attention), the funds are long-since layered through the mule chain. The naive control treats the customer as the last line of defense against a technique specifically engineered to remove the customer\'s detection surface. Real defense is bank-side: dual-channel confirmation on settings changes.',
    naive: true,
    revealsAtStages: [],
    catchCount: 0,
    catchTotal: 0,
    catchUnit: 'attempts',
    naiveCallout: 'Treats F1008.001 as a customer-hygiene problem. The technique\'s defining feature is that it removes the customer\'s ability to detect via statement review. Telling the customer to review statements harder does not address a technique that intercepts the statement before the customer sees it. The bank chose the settings-change flow that allows a single-session change with no out-of-band confirmation; the customer cannot fix the flow.',
  },
]


/* ─── Hidden signals ──────────────────────────────────────────── */
export const SILENT_ALARM_SIGNALS = [
  {
    id: 'sig-settings-change-2am-sunday',
    label: 'Notification settings changed Sunday 02:14 AM from a residential IP',
    description: 'CIBC\'s settings-change audit log shows: Sunday 02:14:03 AM, session originating from a residential IP geolocating to Lagos, Nigeria. Karen\'s typical web-banking sessions originate from her salon WiFi in Ocho Rios or her home WiFi (also Ocho Rios), always between 8 AM and 7 PM, never on Sunday at 2 AM. The 02:14 timestamp alone is anomalous; the geolocation alone is anomalous; the combination plus the specific changes made (all four settings flipped to suppression configurations in 47 seconds) is a textbook Silent Alarm signature. The dual-channel-confirmation control would have stopped the change before it committed.',
    revealedBy: 'ctrl-dual-channel-settings-confirm',
  },
  {
    id: 'sig-statement-email-typosquat',
    label: 'Statement email changed: karen.ferguson@gmail.com → kfergusononline@protonmail.com',
    description: 'The new statement email is structurally a typosquat of Karen\'s original — same first-name-fragment, "online" suffix that suggests a banking-related secondary address, switched provider (gmail → protonmail) that defeats forensics looking only at the original provider\'s logs. The protonmail account was registered 9 days before the phishing capture; it has zero inbound mail except the redirected CIBC statements. The cooling-off control would have continued delivering statements to karen.ferguson@gmail.com for 30 days after the change, ensuring at least the next statement reached the legitimate inbox.',
    revealedBy: 'ctrl-cooling-off-statement-email',
  },
  {
    id: 'sig-mobile-alerts-threshold-suppressed',
    label: 'Mobile alerts threshold raised: J$5,000 → J$999,999',
    description: 'Karen had her CIBC mobile-alerts threshold set to J$5,000 — every transaction over that amount triggered an SMS to her registered phone. The fraudster raised it to J$999,999, effectively disabling all transactional SMS alerts (no single transaction in Karen\'s salon business approaches that ceiling). Combined with the disabled push notifications and the disabled login alerts, this means none of the four pre-existing customer-detection channels (statement email, SMS alerts, push, login alerts) will fire for the upcoming Wednesday transfers. The bank\'s notification subsystem will dispatch correctly — but to no one Karen reads.',
    revealedBy: 'ctrl-dual-channel-settings-confirm',
  },
  {
    id: 'sig-three-day-positioning-window',
    label: 'Positioning window: Sunday 02:15 AM → Wednesday 11:42 AM (no customer signal)',
    description: 'Three days and nine hours pass between the settings-change session and the first fraudulent transfer. During this window the fraudster does nothing; Karen sees no anomaly because there is no anomaly to see — her account is operating normally except that the alert plumbing has been silently rerouted. Karen does her usual Sunday-morning ritual of checking her phone for the weekly CIBC SMS digest; this week she gets nothing, but assumes "slow weekend, makes sense." The Positioning gap is exactly the dwell-time extension Silent Alarm is engineered to produce. The settings-change-banner control would have caught it at the moment of Karen\'s next login — which never happened during the window because Karen\'s business login cadence is roughly fortnightly.',
    revealedBy: 'ctrl-settings-change-banner-on-login',
  },
  {
    id: 'sig-wednesday-execution-alerts-fired-wrong',
    label: 'Wednesday transfers DID fire alerts — to attacker-controlled email only',
    description: 'CIBC\'s notification subsystem fired correctly on Wednesday\'s two J$1.8M transfers. Confirmation emails dispatched to kfergusononline@protonmail.com (attacker-controlled). No SMS dispatched (threshold raised above transaction amount). No push notification dispatched (toggle disabled in Sunday\'s settings change). No login-notification email dispatched (toggle disabled). The notification subsystem was not failed, bypassed, or intercepted in transit — it operated exactly as configured. The configuration was the attack. This is the diagnostic signature that distinguishes Silent Alarm from notification-system outages or delivery failures: the alerts WERE sent; they reached the wrong destinations because the destinations had been changed.',
    revealedBy: 'ctrl-cooling-off-statement-email',
  },
]


/* ─── Stages ──────────────────────────────────────────────────── */
export const SILENT_ALARM_STAGES = [
  /* Stage 1 — Credentials in hand (Friday) */
  {
    id: 'sa-stage-1',
    label: 'Credentials in hand',
    title: 'Friday — phishing capture · the alarm system is still intact',
    caption: 'Two days before this scenario opens. Karen Ferguson, age 44, proprietor of a 3-stylist salon in Ocho Rios, receives an SMS purporting to be from CIBC FirstCaribbean: "Urgent: verify your account to avoid suspension." She taps the link, lands on a Smishing Triad "Lighthouse" kit page that mimics CIBC\'s login screen pixel-for-pixel (the same kit family that grounded the v25.7.0.12 Phishing animation). She enters her username and password. The credentials are exfiltrated to a Lagos-based fraud crew. The crew now holds her CIBC login but does not yet act on it. Karen\'s alarm system — statement email at karen.ferguson@gmail.com, SMS alerts on transactions over J$5,000, push notifications on transaction approval, login notifications — is still fully intact. She does not know she has been phished.',
    durationMs: 8000,
    messages: [
      { id: 'sa-m1-1', fromActor: 'fraudster', toActor: 'karen', kind: 'sms', label: 'Smishing SMS · "verify CIBC account · click here"',
        audio: { text: 'Smishing SMS. Verify CIBC account.', profile: 'narrator' } },
      { id: 'sa-m1-2', fromActor: 'karen', toActor: 'fraudster', kind: 'http', label: 'Karen submits credentials to Lighthouse-kit phishing page' },
      { id: 'sa-m1-3', fromActor: 'fraudster', toActor: 'fraudster', kind: 'system', label: 'Credentials harvested · fraudster does NOT log in yet',
        audio: { text: 'Credentials captured. Wait. Position first.', profile: 'fraudster' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 2 — The 2 AM login (login alerts still on, but nobody is awake) */
  {
    id: 'sa-stage-2',
    label: 'The 2 AM login',
    title: 'Sunday 02:14 AM — fraudster logs in for the first time',
    caption: 'Sunday morning, 02:14 AM Jamaica time. The fraudster crew, operating from a residential IP geolocating to Lagos, Nigeria, opens CIBC\'s online banking portal and logs in with Karen\'s credentials. CIBC\'s system validates the password (correct) and grants the session. The login-notification email subsystem fires correctly, sending an email to karen.ferguson@gmail.com: "New login from a new device — Lagos, Nigeria, 02:14 AM." The email lands in Karen\'s inbox. Karen is asleep. She will not check her email for another six hours, and by then her settings will have been changed — including the login-notification toggle that triggered this email. The 2 AM timing is not random: the fraudster crew profiles target time zones to hit the deepest sleep window. This is the only customer-side signal that fires at full strength during the entire Positioning phase, and it fires when the customer is asleep.',
    durationMs: 8500,
    messages: [
      { id: 'sa-m2-1', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: 'POST /login · karen.ferguson · password OK · IP: Lagos, NG · 02:14 AM', suspicious: true },
      { id: 'sa-m2-2', fromActor: 'cibc', toActor: 'notif', kind: 'system', label: 'Trigger login-notification email · destination: karen.ferguson@gmail.com' },
      { id: 'sa-m2-3', fromActor: 'notif', toActor: 'karen', kind: 'sms', label: 'Email: "New login · Lagos · 02:14 AM" · Karen asleep',
        audio: { text: 'Login alert sent to gmail. Karen is asleep.', profile: 'narrator' } },
    ],
    actorStateChanges: { 'cibc': 'active', 'notif': 'active' },
    revealedSignalIds: [],
  },

  /* Stage 3 — The settings change (the silent alarm move itself) */
  {
    id: 'sa-stage-3',
    label: 'The silent alarm',
    title: 'Sunday 02:14:30 AM — the alarm system is silently disabled',
    caption: 'Within 47 seconds of logging in, the fraudster navigates to Profile → Notification Preferences and changes four settings in sequence. Statement email: changed from karen.ferguson@gmail.com to kfergusononline@protonmail.com (a typosquat-shaped attacker-controlled address registered 9 days before the phishing capture). Mobile alerts threshold: raised from J$5,000 to J$999,999 (effectively silencing all transaction SMS — no single salon transaction approaches that ceiling). Push notifications on transaction approval: ON → OFF. Login notifications: ON → OFF. CIBC\'s settings-change flow requires no out-of-band confirmation; one logged-in session changes everything in one screen. The fraudster logs out at 02:15:18 AM, having spent 78 seconds total inside the account, made no transfers, and silently rerouted Karen\'s entire customer-detection surface. Karen\'s alarm system is now functionally inverted: the bank\'s notification subsystem will continue to fire correctly on every event, but the destinations are all wrong. The fraud has not happened yet; the conditions for it being undetectable have.',
    durationMs: 11000,
    messages: [
      { id: 'sa-m3-1', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: 'Statement email: karen.ferguson@gmail.com → kfergusononline@protonmail.com', suspicious: true,
        audio: { text: 'Statement email changed. Typosquat protonmail address.', profile: 'fraudster' } },
      { id: 'sa-m3-2', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: 'Mobile alerts threshold: J$5,000 → J$999,999 · effectively disabled', suspicious: true },
      { id: 'sa-m3-3', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: 'Push notifications: ON → OFF · login alerts: ON → OFF', suspicious: true,
        audio: { text: 'Push off. Login alerts off. Alarm system disabled.', profile: 'fraudster' } },
      { id: 'sa-m3-4', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: 'Logout · 02:15:18 AM · 78 seconds total session' },
    ],
    revealedSignalIds: ['sig-settings-change-2am-sunday', 'sig-statement-email-typosquat', 'sig-mobile-alerts-threshold-suppressed'],
  },

  /* Stage 4 — Sunday morning · the silence Karen does not notice */
  {
    id: 'sa-stage-4',
    label: 'The silence',
    title: 'Sunday 8:30 AM — Karen\'s ritual gets no signal',
    caption: 'Karen\'s Sunday morning ritual: coffee, phone, scroll through the previous week\'s CIBC SMS digest of salon receipts. This Sunday she gets nothing. No SMS digest, no transaction alerts, no statement email — she briefly notices the absence at 8:34 AM but reasons it away: "slow weekend at the salon, slower than I thought, fewer card transactions, makes sense." The login-alert email from 02:14 AM is sitting in her inbox unread; she scrolls past it because it looks routine and she has 31 unread emails ahead of it. She closes the phone and starts her day. The customer lane during this stage is functionally empty — Karen is doing her normal life and the bank account is, from her vantage, behaving normally. The pedagogical move: the empty lane IS the technique. There is no overt fraudulent activity yet; only the absence of the expected weekly signal, which Karen does not have a mental category for treating as suspicious.',
    durationMs: 9500,
    messages: [
      { id: 'sa-m4-1', fromActor: 'karen', toActor: 'karen', kind: 'system', label: '8:30 AM · phone · expects weekly CIBC SMS digest · sees nothing',
        audio: { text: 'No weekly digest. Slow weekend at the salon, makes sense.', profile: 'victimFemale' } },
      { id: 'sa-m4-2', fromActor: 'karen', toActor: 'karen', kind: 'system', label: '8:34 AM · scrolls past unread login-alert email · looks routine',
        audio: { text: 'Login alert email scrolled past. Looks routine.', profile: 'narrator' } },
    ],
    revealedSignalIds: ['sig-three-day-positioning-window'],
  },

  /* Stage 5 — Wednesday execution */
  {
    id: 'sa-stage-5',
    label: 'Wednesday execution',
    title: 'Wednesday 11:42 AM — J$3.6M out · all alerts went to the wrong inbox',
    caption: 'Wednesday late morning. The fraudster logs back in (no login alert fires this time — the toggle is off). Within four minutes: add new beneficiary "Coral Reef Imports Ltd" (mule operator, account opened 14 days ago in Montego Bay), transfer J$1.8M. Add second beneficiary "Blue Mountain Trading Co" (mule, Kingston, 18 days old), transfer J$1.8M. Total: J$3.6M out in just under four minutes. CIBC\'s notification subsystem fires correctly on every event: two confirmation emails dispatched to kfergusononline@protonmail.com (the attacker-controlled inbox); zero SMS dispatched (threshold was raised above transaction amount); zero push notifications dispatched (toggle disabled); zero login-notification emails dispatched (toggle disabled). The bank\'s alerting infrastructure operated exactly as configured — the configuration was the attack. The transfers clear within 90 minutes; layering through the mule chain begins immediately. Karen, at the salon for her Wednesday appointments, receives no signal of any kind.',
    durationMs: 11000,
    messages: [
      { id: 'sa-m5-1', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: '11:42 AM · login · NO alert fires (toggle off)', suspicious: true },
      { id: 'sa-m5-2', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: 'Add "Coral Reef Imports" · transfer J$1.8M', suspicious: true,
        audio: { text: 'Coral Reef Imports. One point eight million.', profile: 'fraudster' } },
      { id: 'sa-m5-3', fromActor: 'fraudster', toActor: 'cibc', kind: 'http', label: 'Add "Blue Mountain Trading" · transfer J$1.8M', suspicious: true,
        audio: { text: 'Blue Mountain Trading. Another one point eight.', profile: 'fraudster' } },
      { id: 'sa-m5-4', fromActor: 'cibc', toActor: 'notif', kind: 'system', label: 'Trigger 2 transfer-confirmation emails' },
      { id: 'sa-m5-5', fromActor: 'notif', toActor: 'fraudster', kind: 'sms', label: 'Confirmations delivered to kfergusononline@protonmail.com', suspicious: true,
        audio: { text: 'Confirmations to protonmail. Karen sees nothing.', profile: 'narrator' } },
      { id: 'sa-m5-6', fromActor: 'cibc', toActor: 'mule', kind: 'http', label: 'J$3.6M cleared · 13:12 · layering begins' },
    ],
    actorStateChanges: { 'mule': 'active' },
    revealedSignalIds: ['sig-wednesday-execution-alerts-fired-wrong'],
  },

  /* Stage 6 — The nine-day gap */
  {
    id: 'sa-stage-6',
    label: 'The nine-day gap',
    title: 'Wednesday → Friday week-after — Karen runs her business; the funds layer',
    caption: 'Nine days pass. Karen runs her salon: Wednesday through Saturday appointments, Sunday closed, the following week\'s appointments. She notices in passing on the second Sunday morning that she still has not received a CIBC SMS digest, but the logic that explained the previous Sunday\'s silence ("slow weekend") is now harder to extend to two consecutive silent Sundays. She makes a mental note to "log in and check on this when I have a minute." She does not yet log in. Meanwhile the J$3.6M is layering through the mule chain: the Coral Reef and Blue Mountain accounts each forward to two further beneficiary accounts in Trinidad and St. Lucia within 36 hours, and from there to crypto on-ramps in Nigeria within another 48 hours. The funds are functionally unrecoverable by Day 4. Karen\'s detection lag is doing exactly what Silent Alarm was engineered to produce: extending the dwell-time window past the recovery horizon. The gap between the fraud event and the customer\'s discovery is not bad luck; it is the technique\'s output.',
    durationMs: 10000,
    messages: [
      { id: 'sa-m6-1', fromActor: 'mule', toActor: 'mule', kind: 'system', label: 'Day 1-4 · layering through Trinidad + St. Lucia → crypto in Nigeria',
        audio: { text: 'Layering through Trinidad and St. Lucia. Day four: unrecoverable.', profile: 'narrator' } },
      { id: 'sa-m6-2', fromActor: 'karen', toActor: 'karen', kind: 'system', label: 'Day 7 · second silent Sunday · "log in when I have a minute"',
        audio: { text: 'Second silent Sunday. Will log in when I have a minute.', profile: 'victimFemale' } },
    ],
    revealedSignalIds: [],
  },

  /* Stage 7 — Discovery + diagnostic frame */
  {
    id: 'sa-stage-7',
    label: 'Discovery',
    title: 'Day 9 — Karen finally logs in · the bank looks back through the audit log',
    caption: 'Day 9. Karen finally logs into CIBC online banking on a Friday afternoon between appointments. The dashboard shows balance J$3.6M lower than expected. She sees the two beneficiaries she has never heard of and the two transfers she did not authorize. She also sees, on the audit log, the Sunday 02:14 AM session and the four settings changes — including the statement email that has been pointing to a protonmail address for nine days. She calls CIBC\'s fraud line. The fraud-ops analyst pulls the full audit: login from Lagos, settings change at 02:14 AM Sunday Day 0, transfers Wednesday Day 3, all alerts dispatched correctly to the attacker-controlled email. The diagnostic frame for this case shape: when a customer reports unauthorized transactions and the audit log shows that notification-settings were changed within the recent past from an unusual session, the case is Silent Alarm — not phishing-of-the-transfer, not session hijack, not malware. The technique is Positioning, not Initial Access; the credential capture happened earlier (here: the Friday phishing two days before Day 0), and the institutional fix is dual-channel confirmation on the settings-change flow itself. CIBC accelerates the dual-channel-confirmation rollout already on its 2026 roadmap; an internal incident review opens on the broader Caribbean small-business customer base for similar settings-change patterns over the prior 90 days.',
    durationMs: 12000,
    messages: [
      { id: 'sa-m7-1', fromActor: 'karen', toActor: 'cibc', kind: 'http', label: 'Day 9 · Karen logs in · sees J$3.6M missing',
        audio: { text: 'Day nine. Three point six million missing. Beneficiaries she has never heard of.', profile: 'victimFemale' } },
      { id: 'sa-m7-2', fromActor: 'karen', toActor: 'cibc', kind: 'callback', label: '"My settings were changed Sunday. I did not change them."',
        audio: { text: 'My settings were changed Sunday. I did not change them.', profile: 'victimFemale' } },
      { id: 'sa-m7-3', fromActor: 'cibc', toActor: 'cibc', kind: 'system', label: 'Audit reveals: Lagos session 02:14 AM Day 0 · 4 settings changes · transfers Day 3',
        audio: { text: 'Lagos session. Settings changed first. Transfers three days later. Silent Alarm.', profile: 'investigator' } },
      { id: 'sa-m7-4', fromActor: 'cibc', toActor: 'cibc', kind: 'system', label: 'Accelerate dual-channel-confirmation rollout · open 90-day audit',
        audio: { text: 'Accelerate dual-channel confirmation. Open ninety-day audit.', profile: 'investigator' } },
    ],
    revealedSignalIds: [],
    finalHeadline: 'The silence is the signal. CIBC\'s notification subsystem did not fail — it operated exactly as configured. The configuration was the attack. The fraudster did not bypass the alerting infrastructure; they redirected it. Every event that happened during the nine-day window generated an alert; every alert was delivered to a destination the customer did not read. The customer-side detection channel was severed at the destination layer, not the dispatch layer, which is why no notification-system monitoring would have flagged the failure: from the bank\'s perspective, every notification was sent successfully. The diagnostic protocol for analysts triaging this case shape is to treat unexpected silence — a customer whose normal alert cadence has stopped — as a Positioning-phase signal in its own right, particularly when paired with a recent settings-change event in the audit log. The institutional fix is dual-channel confirmation on settings changes: simultaneously dispatch the change-confirmation through ALL pre-existing channels and require step-up authentication via one of those original channels to commit. Defeats Silent Alarm because the attacker controls only the new web session, not the customer\'s pre-existing email/SMS/push endpoints — and the pre-existing endpoints are precisely what the attacker is trying to change. Phase 2 (Positioning) opens here. The next two animations — Card Testing (F1043) and Card Dump (F1042) — cover the card-data supply chain that monetizes Initial Access through a different Positioning lane.',
  },
]


/* ─── Animation metadata ──────────────────────────────────────── */
export const SILENT_ALARM_META = {
  techId: 'F1008.001',
  techName: 'Account Manipulation: Change E-Delivery / Notification Settings',
  tacticId: 'FA0001',
  tacticName: 'Positioning',
  scenario: 'SC-karen-cibc-silent-alarm',
  scenarioContext: 'Mrs. Karen Ferguson, age 44, proprietor of a 3-stylist salon in Ocho Rios, CIBC FirstCaribbean SmartLine business banking customer for 11 years. Two days before the scenario opens, Karen entered her CIBC credentials into a Smishing Triad "Lighthouse" kit phishing page after receiving an SMS impersonating CIBC ("urgent verification required"). The fraudster crew, operating from Lagos, holds her credentials but does not act immediately. Sunday at 02:14 AM, the crew logs in for the first time, navigates to Notification Preferences, and in 47 seconds changes four settings: statement email rerouted to a typosquat-shaped attacker-controlled protonmail address, mobile-alerts threshold raised from J$5,000 to J$999,999 (effectively disabling SMS alerts on Karen\'s salon-scale transactions), push notifications on transaction approval disabled, login notifications disabled. The crew logs out at 02:15:18 AM having made no transfers — only severed Karen\'s customer-detection surface. Sunday morning Karen notices the absence of her usual weekly CIBC SMS digest but reasons it away as a slow business weekend. Wednesday at 11:42 AM, the crew logs back in (no login alert fires, toggle is off), adds two new mule beneficiaries, and transfers J$1.8M to each — J$3.6M total, in just under four minutes. CIBC\'s notification subsystem fires correctly on every event but every alert lands in the attacker-controlled inbox. Karen receives no signal. Funds layer through Trinidad, St. Lucia, and crypto on-ramps in Nigeria within four days, becoming functionally unrecoverable. Karen finally logs into CIBC web banking on Day 9, sees the missing balance, sees the four settings changes she did not make, and calls the fraud line. Composite case grounded in Bank of Jamaica 2024-2025 internet-banking fraud reporting (statement-quietly-rerouted pattern), FFIEC and FinCEN BEC investigation documentation, and Caribbean small-business banking norms (weekly SMS-digest as primary customer detection channel). F1008.001 is the first Phase 2 Positioning animation; CIBC FirstCaribbean is the fourth Caribbean institution represented in animations.',
  totalDurationMs: 70000,
  stageCount: 7,
}


export default {
  meta: SILENT_ALARM_META,
  engine: 'multi-actor-sequence',
  stages: SILENT_ALARM_STAGES,
  controls: SILENT_ALARM_CONTROLS,
  signals: SILENT_ALARM_SIGNALS,
  actors: SILENT_ALARM_ACTORS,
}
