# MeetingAI v3 — Full UI with All Features

Mock-mode by default — all functionality works without AWS. Plug in services later.

## Quick start

```bash
cd frontend
cp .env.local.example .env.local
# Make sure NEXT_PUBLIC_USE_MOCK=true
npm install
npm run dev
```

Open http://localhost:3000 → enter any email + password → Sign In.

## What's new in v3

### 1. Meetings page (sidebar → Meetings)
- Lists all past meetings with title, time, duration, participant count
- "Summary ready" badge for meetings with summaries
- Click any row → opens detail page
- New / Join button to start a meeting

### 2. AI Summariser page (sidebar → AI Summariser)
- All meetings that have summaries, with snippets
- **Download button per meeting** — exports `.txt` with summary + action items + transcript
- **Record In-Person Meeting** button — opens manual recorder modal
- Click any card → meeting detail with full transcript

### 3. Manual recorder
- For physical (non-Zoom) meetings
- Title + participants input
- Start → mic capture (mock simulates speakers; real uses Deepgram)
- Live elapsed timer with pulsing red dot
- Stop & Save → auto-generates summary, appears in lists

### 4. Post-meeting popup
- Triggers automatically when a Zoom meeting's Stop Assistant finishes
- Shows summary preview + action items
- Two buttons: **Download Summary** + **View Full Transcript**

### 5. Profile (top-right avatar)
- Click avatar/email in topbar → opens Profile modal
- Shows name, email, role, bio
- **Edit Profile** button → editable form
- Sign Out button

### 6. Meeting detail page (click any meeting)
- Header with title, date, duration, participants as chips
- Download button at top
- Summary + Action Items sections
- **Transcript grouped by speaker** with timestamp per line (`MM:SS` next to speaker name)
- Same-speaker consecutive lines are visually grouped

## Functionality map

| UI element | Behavior |
|---|---|
| Sidebar Home | Dashboard with clock + 4 cards |
| Sidebar Meetings | List of past meetings, or active workspace if joined |
| Sidebar AI Summariser | Summaries list + Record button |
| Sidebar Scheduler | Add/join scheduled meetings |
| Topbar avatar | Opens Profile modal |
| Topbar bell | Opens Meeting History drawer |
| Topbar search | Opens drawer with filtered results |
| Dashboard New Meeting | Opens Join modal |
| Dashboard Schedule | Switches to Scheduler tab |
| Dashboard AI Summariser | Switches to Summariser tab |
| Stop Assistant in workspace | Saves transcript → generates summary → shows post-meeting popup |
| Download button (anywhere) | Downloads `.txt` with summary + action items + transcript |
| Click meeting in any list | Opens detail page with grouped transcript |

## Mock data

The app ships with 3 seeded meetings so every list is populated:
1. Q1 Planning Sync (Zoom, 4 participants)
2. Customer Discovery — Acme Corp (Zoom, 3 participants)
3. In-person standup (manual recording, 2 participants)

Edit/delete via browser DevTools → Application → Local Storage → `meetingai_mock_db`.

## Switch to real AWS

Set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local`, deploy backend (`cd backend && sam deploy --guided`), fill in Cognito + Deepgram + Zoom keys, restart `npm run dev`.

The same UI, same components, same flows — just talking to real services. The `useApi()` hook abstracts the swap so no component changes are needed.
