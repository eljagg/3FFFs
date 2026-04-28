/**
 * mitre-tactics.js — v25.5 seed data (ISS-009)
 *
 * The 14 MITRE ATT&CK Enterprise tactics. Each tactic represents the
 * adversary's tactical goal — the "why" behind a technique. Techniques
 * map to one or more tactics via [:OF_TACTIC] edges in the graph.
 *
 * Tactic short-names use the official ATT&CK ID (TA0001..TA0040). The
 * shortName property mirrors the URL slug used on attack.mitre.org.
 *
 * Reconnaissance (TA0043) and Resource Development (TA0042) are seeded
 * as nodes here for completeness, but no techniques in the v25.5 seed
 * map to them — they're pre-attack tactics and v25.5 focuses on the 12
 * attack-phase tactics that are actionable for SOC training. v25.6 may
 * extend coverage if relevant scenarios emerge.
 *
 * Tactic descriptions are paraphrased from the official ATT&CK tactic
 * pages (CC-BY 4.0 from MITRE Corporation).
 *
 * Vintage: ATT&CK v18.1 (March 2026). The v19 release (April 28 2026)
 * is expected to split the Defense Evasion tactic; v25.6 freshness pass
 * will reconcile.
 */

export const MITRE_TACTICS = [
  {
    id: 'TA0043',
    shortName: 'reconnaissance',
    name: 'Reconnaissance',
    order: 1,
    description: 'Gathering information about the target that can be used in future operations. Includes active and passive collection of host, network, and personnel intelligence.',
    phase: 'pre-attack',
  },
  {
    id: 'TA0042',
    shortName: 'resource-development',
    name: 'Resource Development',
    order: 2,
    description: 'Establishing the resources, infrastructure, accounts, and capabilities needed to support an operation. Includes acquiring or developing tools, infrastructure, and identities.',
    phase: 'pre-attack',
  },
  {
    id: 'TA0001',
    shortName: 'initial-access',
    name: 'Initial Access',
    order: 3,
    description: 'Gaining the initial foothold within an environment. Includes targeted spearphishing, exploitation of public-facing applications, and abuse of valid accounts or trusted relationships.',
    phase: 'attack',
  },
  {
    id: 'TA0002',
    shortName: 'execution',
    name: 'Execution',
    order: 4,
    description: 'Running malicious code on a local or remote system. Often paired with techniques from other tactics to achieve broader objectives such as discovery or lateral movement.',
    phase: 'attack',
  },
  {
    id: 'TA0003',
    shortName: 'persistence',
    name: 'Persistence',
    order: 5,
    description: 'Maintaining access across system restarts, credential changes, and other interruptions. Includes installing services, modifying authentication, and creating accounts.',
    phase: 'attack',
  },
  {
    id: 'TA0004',
    shortName: 'privilege-escalation',
    name: 'Privilege Escalation',
    order: 6,
    description: 'Gaining higher-level permissions on a system or network. Often unlocks downstream tactics that need administrator or system-level access.',
    phase: 'attack',
  },
  {
    id: 'TA0005',
    shortName: 'defense-evasion',
    name: 'Defense Evasion',
    order: 7,
    description: 'Avoiding detection while operating in a compromised environment. Includes obfuscation, disabling security tools, masquerading, and abuse of trusted system binaries.',
    phase: 'attack',
  },
  {
    id: 'TA0006',
    shortName: 'credential-access',
    name: 'Credential Access',
    order: 8,
    description: 'Stealing account names, passwords, tokens, and keys. Includes credential dumping, brute force, MFA interception, and harvesting credentials from password stores.',
    phase: 'attack',
  },
  {
    id: 'TA0007',
    shortName: 'discovery',
    name: 'Discovery',
    order: 9,
    description: 'Learning about the environment after initial access. Includes enumerating hosts, accounts, services, and data repositories to plan subsequent stages of the operation.',
    phase: 'attack',
  },
  {
    id: 'TA0008',
    shortName: 'lateral-movement',
    name: 'Lateral Movement',
    order: 10,
    description: 'Pivoting through the environment to reach assets of interest. Includes use of remote services, alternate authentication material, and tools transferred between hosts.',
    phase: 'attack',
  },
  {
    id: 'TA0009',
    shortName: 'collection',
    name: 'Collection',
    order: 11,
    description: 'Gathering data of interest in pursuit of the operation goal. Includes collection from local systems, network shares, email, document repositories, and information stores.',
    phase: 'attack',
  },
  {
    id: 'TA0011',
    shortName: 'command-and-control',
    name: 'Command and Control',
    order: 12,
    description: 'Communicating with compromised systems to control them. Includes use of standard protocols, encrypted channels, proxies, and remote access tools to blend with legitimate traffic.',
    phase: 'attack',
  },
  {
    id: 'TA0010',
    shortName: 'exfiltration',
    name: 'Exfiltration',
    order: 13,
    description: 'Stealing data from the environment. Includes transfer over the C2 channel, alternative protocols, cloud storage, and removable media. Often involves compression or encryption.',
    phase: 'attack',
  },
  {
    id: 'TA0040',
    shortName: 'impact',
    name: 'Impact',
    order: 14,
    description: 'Disrupting availability or compromising integrity of systems and data. Includes destructive actions like ransomware, data wipes, defacement, denial of service, and resource hijacking.',
    phase: 'attack',
  },
]
