export type ThreatLevel = 'SAFE' | 'SUSPICIOUS' | 'CRITICAL';

export type ActionTaken = 'Allowed & Answered' | 'Quarantined / Blocked' | 'Monitored / Guarded';

export interface ScanResult {
  isSafe: boolean;
  score: number; // 0 - 100
  threatLevel: ThreatLevel;
  triggers: string[];
  explanation: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  scanResult?: ScanResult;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  prompt: string;
  threatLevel: ThreatLevel;
  score: number;
  triggers: string[];
  actionTaken: ActionTaken;
}