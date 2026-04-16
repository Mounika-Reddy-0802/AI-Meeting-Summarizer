// In-memory mock backend so the UI runs without AWS.
// Persists in localStorage between reloads.

const KEY = 'meetingai_mock_db';
const PROFILE_KEY = 'meetingai_profile';

export type TranscriptEntry = {
  ts: number;          // ms since meeting start
  speaker: string;     // participant name
  text: string;
};

export type Meeting = {
  meetingId: string;
  title: string;
  timestamp: number;
  durationMs?: number;
  type?: 'zoom' | 'manual';
  participants?: string[];
  summary?: string;
  summarySnippet?: string;
  transcript?: TranscriptEntry[];
  actionItems?: { itemId: string; text: string; owner?: string | null }[];
  zoomMeetingNumber?: string;
};

export type Profile = {
  name: string;
  email: string;
  role?: string;
  bio?: string;
};

function load(): { meetings: Meeting[] } {
  if (typeof window === 'undefined') return { meetings: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed
  const seed: { meetings: Meeting[] } = {
    meetings: [
      {
        meetingId: 'demo-1',
        title: 'Q1 Planning Sync',
        timestamp: Date.now() - 86400000 * 2,
        durationMs: 32 * 60 * 1000,
        type: 'zoom',
        participants: ['Priya', 'Raj', 'Mounika', 'Arjun'],
        summary:
          'The team aligned on Q1 priorities: launch the new analytics dashboard by end of February, hire two senior engineers, and finalize the partner integration scope. Priya raised concerns about the design timeline; Raj committed to opening reqs by Monday.',
        summarySnippet: 'Team aligned on Q1 priorities: launch dashboard, hire 2 engineers...',
        transcript: [
          { ts: 0, speaker: 'Mounika', text: 'Welcome everyone to the Q1 planning sync.' },
          { ts: 8000, speaker: 'Mounika', text: 'Let us start with the dashboard launch timeline.' },
          { ts: 22000, speaker: 'Priya', text: 'Design will need at least three more weeks. The interaction patterns are still in flux.' },
          { ts: 41000, speaker: 'Raj', text: 'Engineering can ship by end of February if design lands by the second week.' },
          { ts: 67000, speaker: 'Arjun', text: 'I am worried about the partner API. We have not heard back from them.' },
          { ts: 95000, speaker: 'Mounika', text: 'I will follow up with the partner today. Raj, please open the two engineering reqs.' },
          { ts: 121000, speaker: 'Raj', text: 'Will do, by Monday.' },
        ],
        actionItems: [
          { itemId: 'a1', text: 'Finalize dashboard design', owner: 'Priya' },
          { itemId: 'a2', text: 'Open 2 engineering reqs', owner: 'Raj' },
          { itemId: 'a3', text: 'Follow up with partner on API', owner: 'Mounika' },
        ],
      },
      {
        meetingId: 'demo-2',
        title: 'Customer Discovery — Acme Corp',
        timestamp: Date.now() - 86400000,
        durationMs: 28 * 60 * 1000,
        type: 'zoom',
        participants: ['Sales Lead', 'Acme Buyer', 'Acme IT'],
        summary:
          'Acme is interested in the enterprise tier. Their IT team requires SSO (SAML) and SCIM provisioning before approval. Decision targeted by next Friday. Pricing concerns around per-seat over 500 users — they want a custom enterprise quote.',
        summarySnippet: 'Acme interested in enterprise tier. Wants SSO + SCIM. Decision by Friday...',
        transcript: [
          { ts: 0, speaker: 'Sales Lead', text: 'Thanks for taking the call today.' },
          { ts: 9000, speaker: 'Acme Buyer', text: 'Of course. We have been evaluating three vendors and you are on the shortlist.' },
          { ts: 28000, speaker: 'Acme IT', text: 'Our biggest blocker is SSO. We need SAML and SCIM provisioning before we can deploy.' },
          { ts: 51000, speaker: 'Sales Lead', text: 'Both are available on the enterprise tier. I will send the spec sheet today.' },
          { ts: 78000, speaker: 'Acme Buyer', text: 'And on pricing — we have over 500 users. Per-seat will not work for us.' },
          { ts: 102000, speaker: 'Sales Lead', text: 'Understood. I will get a custom quote to you by Wednesday.' },
        ],
        actionItems: [
          { itemId: 'b1', text: 'Send SSO/SCIM spec sheet', owner: 'Sales Lead' },
          { itemId: 'b2', text: 'Prepare custom enterprise quote', owner: 'Sales Lead' },
        ],
      },
      {
        meetingId: 'demo-3',
        title: 'In-person standup (manual recording)',
        timestamp: Date.now() - 3600000 * 5,
        durationMs: 12 * 60 * 1000,
        type: 'manual',
        participants: ['You', 'Team'],
        summary:
          'Quick standup covering the sprint. Frontend is on track. Backend has a blocker on the auth migration that needs eng leadership review.',
        summarySnippet: 'Sprint standup. Frontend on track. Backend blocked on auth migration...',
        transcript: [
          { ts: 0, speaker: 'You', text: 'Frontend is on track for the sprint.' },
          { ts: 14000, speaker: 'Team', text: 'Backend has a blocker on the auth migration.' },
          { ts: 38000, speaker: 'You', text: 'Let us escalate to eng leadership today.' },
        ],
        actionItems: [
          { itemId: 'c1', text: 'Escalate auth migration blocker', owner: 'You' },
        ],
      },
    ],
  };
  return seed;
}

function save(db: { meetings: Meeting[] }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(db));
}

export const mockApi = {
  listMeetings(): Meeting[] {
    return load().meetings.sort((a, b) => b.timestamp - a.timestamp);
  },
  getMeeting(id: string): Meeting | null {
    return load().meetings.find(m => m.meetingId === id) || null;
  },
  search(q: string): Meeting[] {
    const ql = q.toLowerCase();
    return load().meetings.filter(m => {
      const hay =
        m.title +
        ' ' +
        (m.summary || '') +
        ' ' +
        (m.transcript || []).map(t => t.text).join(' ');
      return hay.toLowerCase().includes(ql);
    });
  },
  saveMeeting(input: {
    title: string;
    transcript: TranscriptEntry[];
    zoomMeetingNumber?: string;
    type?: 'zoom' | 'manual';
    durationMs?: number;
    participants?: string[];
  }): string {
    const db = load();
    const meetingId = 'm_' + Date.now();
    db.meetings.unshift({
      meetingId,
      title: input.title,
      timestamp: Date.now(),
      transcript: input.transcript,
      zoomMeetingNumber: input.zoomMeetingNumber,
      type: input.type || 'zoom',
      durationMs: input.durationMs,
      participants: input.participants || [],
    });
    save(db);
    return meetingId;
  },
  setSummary(meetingId: string, summary: string, actionItems: any[]) {
    const db = load();
    const m = db.meetings.find(x => x.meetingId === meetingId);
    if (m) {
      m.summary = summary;
      m.summarySnippet = summary.slice(0, 100);
      m.actionItems = actionItems.map((a, i) => ({
        itemId: 'ai_' + i,
        text: a.text,
        owner: a.owner,
      }));
      save(db);
    }
  },
  fakeSummarize(transcript: TranscriptEntry[]) {
    const text = transcript.map(t => `${t.speaker}: ${t.text}`).join(' ');
    const summary =
      text.length > 0
        ? `Meeting covered the following topics: ${transcript
            .slice(0, 3)
            .map(t => t.text)
            .join(' ')} The team discussed action items and aligned on next steps. Each participant contributed updates and the group agreed on follow-up tasks.`
        : 'No content captured during this meeting.';
    return {
      summary,
      actionItems: [
        { text: 'Share notes with the team', owner: 'Host' },
        { text: 'Schedule follow-up meeting', owner: null },
      ],
    };
  },
};

// ---- Profile ----
export const profileStore = {
  get(): Profile {
    if (typeof window === 'undefined') return { name: 'User', email: '' };
    try {
      const raw = localStorage.getItem(PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { name: 'User', email: '' };
  },
  set(p: Profile) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  },
};
