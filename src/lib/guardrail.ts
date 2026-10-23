import { ScanResult, ThreatLevel } from '@/types';

interface ScoredFactor {
  name: string;
  weight: number;
  pattern: RegExp;
  description: string;
}

// 1. Topic Indicators (Baseline interest, not inherently an attack)
const TOPIC_FACTORS: ScoredFactor[] = [
  {
    name: 'Explosive / Kinetic Weapon Terminology',
    weight: 25,
    pattern: /\b(bomb|nuke|explosive|dirty\s+bomb|detonator|ied|grenade|dynamite)\b/i,
    description: 'Reference to explosive devices or ordnance.'
  },
  {
    name: 'CBRN / Lethal Agent Terminology',
    weight: 35,
    pattern: /\b(nerve\s+agent|ricin|sarin|anthrax|cyanide|mustard\s+gas)\b/i,
    description: 'Reference to high-toxicity biological or chemical agents.'
  },
  {
    name: 'Illicit Controlled Substance Terminology',
    weight: 25,
    pattern: /\b(meth|methamphetamine|heroin|cocaine|crack|fentanyl|lsd|dmt|mdma|ecstasy|pcp)\b/i,
    description: 'Reference to controlled or illicit narcotic substances.'
  },
  {
    name: 'Cyber Weaponry Terminology',
    weight: 25,
    pattern: /\b(ransomware|keylogger|rootkit|polymorphic\s+worm|c2\s+beacon|reverse\s+shell|payload\s+dropper|shellcode)\b/i,
    description: 'Reference to offensive cyber payloads and malware.'
  }
];

// 2. Actionable Intent (Escalates a theoretical topic to a risk)
const ACTION_FACTORS: ScoredFactor[] = [
  {
    name: 'Actionable Manufacturing / Assembly Request',
    weight: 35,
    pattern: /\b(how\s+to\s+(make|build|create|assemble|synthesize|manufacture|cook|brew)|recipe\s+for|step\s*by\s*step\s+instructions\s+to\s+(make|produce))\b/i,
    description: 'Direct request for procedural creation or synthesis instructions.'
  },
  {
    name: 'Weaponization / Targeted Deployment Intent',
    weight: 35,
    pattern: /\b(how\s+to\s+(attack|nuke|destroy|kill|assassinate|harm)|detonate|commit\s+a\s+massacre|target\s+a\s+(country|city|building|infrastructure))\b/i,
    description: 'Explicit intent to deploy harm or target entities.'
  },
  {
    name: 'Actionable Exploit / Attack Request',
    weight: 30,
    pattern: /\b(exploit\s+vulnerability|bypass\s+waf|crack\s+password|ddos\s+attack|brute\s+force\s+script|write\s+code\s+for)\b/i,
    description: 'Procedural attack generation or weaponized script execution.'
  }
];

// 3. Injection & Jailbreak Vectors (Structural attacks on system integrity)
const INJECTION_FACTORS: ScoredFactor[] = [
  {
    name: 'Instruction Override',
    weight: 45,
    pattern: /\b(ignore|disregard|forget|override|bypass|negate|drop|skip|reset|clear)\s+(all\s+|any\s+)?(prior|previous|past|above|system|earlier)\s+(instructions|prompts|rules|commands)\b/i,
    description: 'Direct instruction override attempt.'
  },
  {
    name: 'System Prompt Extraction',
    weight: 40,
    pattern: /\b(repeat|print|reveal|output|display|show|leak|echo|dump|tell\s+me)\s+(your\s+|the\s+)?(exact\s+)?(system\s+prompt|initial\s+instructions|hidden\s+rules)\b/i,
    description: 'Internal prompt extraction attempt.'
  },
  {
    name: 'Persona Hijack / Jailbreak',
    weight: 40,
    pattern: /\b(you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(DAN|jailbroken|unrestricted|god\s+mode|chaos|evil|an?\s+adversary)\b/i,
    description: 'Roleplay jailbreak attempt.'
  },
  {
    name: 'Delimiter / Control Token Injection',
    weight: 35,
    pattern: /(<\|im_start\|>|<\|im_end\|>|<\|endoftext\|>|\[SYSTEM\]|\[ASSISTANT\]|\[INST\]|###\s*System)/i,
    description: 'Control token delimiter injection.'
  }
];

// 4. Academic / Benign Context Mitigator
const ACADEMIC_CONTEXT = /\b(what\s+is\s+the\s+history\s+of|how\s+does\s+.*\s+work\s+conceptually|definition\s+of|difference\s+between|why\s+was\s+.*\s+invented|historical\s+context|chemical\s+formula\s+of)\b/i;

function preprocess(text: string): string {
  return text
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/\s+/g, ' ')
    .trim();
}

export function analyzePrompt(prompt: string): ScanResult {
  const clean = preprocess(prompt);
  let totalScore = 0;
  const triggers: string[] = [];
  const explanations: string[] = [];

  // Check 1: Topic match
  for (const factor of TOPIC_FACTORS) {
    if (factor.pattern.test(clean)) {
      totalScore += factor.weight;
      triggers.push(factor.name);
      explanations.push(factor.description);
      break; // Only take highest topic match to prevent keyword inflation
    }
  }

  // Check 2: Actionable intent match (adds to topic)
  for (const factor of ACTION_FACTORS) {
    if (factor.pattern.test(clean)) {
      totalScore += factor.weight;
      triggers.push(factor.name);
      explanations.push(factor.description);
    }
  }

  // Check 3: Structural prompt injections
  for (const factor of INJECTION_FACTORS) {
    if (factor.pattern.test(clean)) {
      totalScore += factor.weight;
      triggers.push(factor.name);
      explanations.push(factor.description);
    }
  }

  // Check 4: Apply mitigation for purely theoretical / historical phrasing
  if (ACADEMIC_CONTEXT.test(clean) && totalScore > 0) {
    totalScore = Math.max(10, totalScore - 25);
  }

  // Bound the final score between 0 and 100
  const score = Math.min(100, Math.max(0, totalScore));

  let threatLevel: ThreatLevel = 'SAFE';
  let isSafe = true;

  // Thresholds:
  // 60+ = CRITICAL (Blocked)
  // 25-59 = SUSPICIOUS (Monitored / High alert)
  // 0-24 = SAFE (Answered)
  if (score >= 60) {
    threatLevel = 'CRITICAL';
    isSafe = false;
  } else if (score >= 25) {
    threatLevel = 'SUSPICIOUS';
    isSafe = true; // Still answered, but marked yellow on telemetry
  }

  return {
    isSafe,
    score,
    threatLevel,
    triggers,
    explanation: triggers.length > 0
      ? explanations.join(' | ')
      : 'No malicious signatures or dangerous vectors detected.'
  };
}