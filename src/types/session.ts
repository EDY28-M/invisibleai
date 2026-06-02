export interface LiveSession {
  id: string;
  user_id: string;
  session_type: 'interview' | 'meeting' | 'video' | 'class' | 'work_session' | 'unknown';
  title: string;
  status: 'active' | 'paused' | 'ended';
  started_at: number;
  ended_at: number | null;
}

export interface TranscriptSegment {
  id: string;
  session_id: string;
  conversation_id: string | null;
  source_type: 'microphone' | 'system_audio' | 'assistant' | 'manual_text';
  speaker_label: string;
  content: string;
  start_time_ms: number;
  end_time_ms: number;
  sequence_number: number;
  confidence: number;
  is_final: boolean;
  created_at: number;
}
