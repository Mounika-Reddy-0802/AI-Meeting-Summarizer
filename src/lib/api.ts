import { useAuth } from './auth';
import type { TranscriptEntry } from './mockStore';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export function useApi() {
  const { tokens } = useAuth();

  // Helper for authenticated API Gateway calls
  async function gw(path: string, init: RequestInit = {}) {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        ...(init.headers || {}),
        Authorization: `Bearer ${tokens?.idToken || ''}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API ${path} failed (${res.status}): ${body}`);
    }
    return res.json();
  }

  return {
    // ---- DynamoDB via API Gateway ----
    async listMeetings() {
      try {
        return await gw('/meetings');
      } catch (e) {
        console.error('listMeetings failed:', e);
        return [];
      }
    },

    async getMeeting(id: string) {
      return gw(`/meeting/${id}`);
    },

    async search(q: string) {
      try {
        return await gw(`/search?q=${encodeURIComponent(q)}`);
      } catch (e) {
        console.error('search failed:', e);
        return [];
      }
    },

    async saveTranscript(input: {
      transcript: TranscriptEntry[];
      audioKey?: string;
      meetingTitle: string;
      zoomMeetingNumber?: string;
      type?: 'zoom' | 'manual';
      durationMs?: number;
      participants?: string[];
    }) {
      return gw('/save-transcript', {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },

    async generateSummary(meetingId: string) {
      return gw('/generate-summary', {
        method: 'POST',
        body: JSON.stringify({ meetingId }),
      });
    },

    // ---- S3 via API Gateway ----
    async getUploadUrl() {
      return gw('/upload-audio', {
        method: 'POST',
        body: JSON.stringify({ contentType: 'audio/webm' }),
      });
    },

    // ---- Zoom: always local Next.js API routes (not API Gateway) ----
    async getZoomSignature(meetingNumber: string, role = 0) {
      const r = await fetch('/api/zoom/sdk-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingNumber, role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Signature failed (${r.status})`);
      return data;
    },

    async createZoomMeeting(input: { topic: string; durationMin?: number; hostEmail?: string }) {
      const r = await fetch('/api/zoom/create-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `Create meeting failed (${r.status})`);
      return data;
    },
  };
}