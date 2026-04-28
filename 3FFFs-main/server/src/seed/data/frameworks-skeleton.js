/**
 * frameworks-skeleton.js — minimal stub data for the non-AASE frameworks and
 * for the regulators in the Caribbean and reference jurisdictions.
 *
 * This is intentionally thin in v25.0. The full content for CBEST, TIBER-EU,
 * and iCAST is added in v25.4 / v25.5 when the cross-framework comparison
 * page is built. For now we just need:
 *   - Framework nodes so universal concepts can be linked to all four
 *   - Regulator nodes so a learner's home country can be matched to the
 *     framework most relevant to them
 *
 * Note on freshness: the AASE document is November 2018. CBEST has had a
 * 2.0 release since, TIBER-EU has had multiple revisions, and iCAST is part
 * of HKMA's evolving C-RAF. Phase 5 (v25.6) will localise and refresh.
 */

export const FRAMEWORK_SKELETONS = [
  {
    id: 'CBEST',
    name: 'CBEST',
    alsoKnownAs: 'Cyber resilience programme',
    publishedBy: 'Bank of England',
    publishedYear: 2014,
    region: 'United Kingdom',
    description: 'Intelligence-led penetration testing programme launched by the Bank of England in 2014. Recognised as the first jurisdiction-level red-team framework for the financial sector and a model for AASE, TIBER-EU, and iCAST.',
  },
  {
    id: 'TIBER-EU',
    name: 'TIBER-EU',
    alsoKnownAs: 'Threat Intelligence-Based Ethical Red-teaming',
    publishedBy: 'European Central Bank',
    publishedYear: 2018,
    region: 'European Union',
    description: 'Pan-European framework for controlled, intelligence-led red-team tests. Launched 2018, with national implementations including TIBER-NL (De Nederlandsche Bank), TIBER-DE, TIBER-IE, and others. Most comprehensive of the four frameworks in scope.',
  },
  {
    id: 'iCAST',
    name: 'iCAST',
    alsoKnownAs: 'Intelligence-led Cyber Attack Simulation Testing',
    publishedBy: 'Hong Kong Monetary Authority',
    publishedYear: 2016,
    region: 'Hong Kong',
    description: 'Component of the HKMA\'s Cyber Resilience Assessment Framework (C-RAF). Required for higher-inherent-risk authorised institutions in Hong Kong.',
  },
]

export const REGULATORS = [
  // Caribbean — primary audience
  {
    id: 'REG-BOJ',
    name: 'Bank of Jamaica',
    country: 'Jamaica',
    countryCode: 'JM',
    region: 'Caribbean',
    note: 'Primary banking regulator in Jamaica. Has issued cyber-resilience guidance broadly aligned with international red-team frameworks but does not mandate a specific scheme.',
  },
  {
    id: 'REG-FSC-JM',
    name: 'Financial Services Commission (Jamaica)',
    country: 'Jamaica',
    countryCode: 'JM',
    region: 'Caribbean',
    note: 'Regulates non-bank financial institutions in Jamaica including securities, insurance, and pensions.',
  },
  {
    id: 'REG-ECCB',
    name: 'Eastern Caribbean Central Bank',
    country: 'Eastern Caribbean Currency Union',
    countryCode: 'OECS',
    region: 'Caribbean',
    note: 'Currency union regulator covering Antigua, Dominica, Grenada, Montserrat, St Kitts, St Lucia, St Vincent, Anguilla.',
  },
  {
    id: 'REG-CIMA',
    name: 'Cayman Islands Monetary Authority',
    country: 'Cayman Islands',
    countryCode: 'KY',
    region: 'Caribbean',
    note: 'Significant offshore banking and fund-administration jurisdiction. Issued cybersecurity rule in 2020.',
  },
  // Reference jurisdictions cited by the four frameworks
  {
    id: 'REG-MAS',
    name: 'Monetary Authority of Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    region: 'Asia-Pacific',
    note: 'AASE was developed by the Association of Banks in Singapore in collaboration with MAS. AASE is referenced in MAS Technology Risk Management guidelines.',
  },
  {
    id: 'REG-BOE',
    name: 'Bank of England',
    country: 'United Kingdom',
    countryCode: 'GB',
    region: 'Europe',
    note: 'Author of CBEST. The Bank of England requires CBEST testing for systemically important financial institutions.',
  },
  {
    id: 'REG-ECB',
    name: 'European Central Bank',
    country: 'Eurozone',
    countryCode: 'EU',
    region: 'Europe',
    note: 'Author of TIBER-EU, in collaboration with national central banks. Adopted by individual EU member states under their own implementations.',
  },
  {
    id: 'REG-HKMA',
    name: 'Hong Kong Monetary Authority',
    country: 'Hong Kong',
    countryCode: 'HK',
    region: 'Asia-Pacific',
    note: 'Author of C-RAF, of which iCAST is the testing component. Mandatory for higher-inherent-risk AIs.',
  },
]

// Which frameworks are recognised by which regulators. Used by the
// recommendation query in v25.5.
export const FRAMEWORK_REGULATOR_LINKS = [
  // AASE — Singapore origin
  { frameworkId: 'AASE', regulatorId: 'REG-MAS', relationship: 'AUTHORED' },
  // CBEST — UK origin
  { frameworkId: 'CBEST', regulatorId: 'REG-BOE', relationship: 'AUTHORED' },
  // TIBER-EU — EU origin
  { frameworkId: 'TIBER-EU', regulatorId: 'REG-ECB', relationship: 'AUTHORED' },
  // iCAST — Hong Kong origin
  { frameworkId: 'iCAST', regulatorId: 'REG-HKMA', relationship: 'AUTHORED' },
  // Caribbean — none of the four are formally adopted, all are RECOGNISED as best practice.
  // This is the wedge: a Caribbean analyst chooses based on regulatory familiarity, not mandate.
  { frameworkId: 'AASE', regulatorId: 'REG-BOJ', relationship: 'RECOGNISED' },
  { frameworkId: 'CBEST', regulatorId: 'REG-BOJ', relationship: 'RECOGNISED' },
  { frameworkId: 'TIBER-EU', regulatorId: 'REG-BOJ', relationship: 'RECOGNISED' },
  { frameworkId: 'AASE', regulatorId: 'REG-FSC-JM', relationship: 'RECOGNISED' },
  { frameworkId: 'CBEST', regulatorId: 'REG-FSC-JM', relationship: 'RECOGNISED' },
  { frameworkId: 'AASE', regulatorId: 'REG-ECCB', relationship: 'RECOGNISED' },
  { frameworkId: 'CBEST', regulatorId: 'REG-ECCB', relationship: 'RECOGNISED' },
  { frameworkId: 'AASE', regulatorId: 'REG-CIMA', relationship: 'RECOGNISED' },
  { frameworkId: 'CBEST', regulatorId: 'REG-CIMA', relationship: 'RECOGNISED' },
  { frameworkId: 'iCAST', regulatorId: 'REG-CIMA', relationship: 'RECOGNISED' },
]
