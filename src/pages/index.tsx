import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/api';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import HistoryDrawer from '../components/HistoryDrawer';
import Dashboard from '../components/Dashboard';
import JoinModal from '../components/JoinModal';
import MeetingWorkspace from '../components/MeetingWorkspace';
import Scheduler from '../components/Scheduler';
import MeetingsPage from '../components/MeetingsPage';
import SummariserPage from '../components/SummariserPage';
import SummaryModal from '../components/SummaryModal';
import ProfileModal from '../components/ProfileModal';
import { formatMeetingId } from '../lib/zoomMeeting';
import type { Meeting } from '../lib/mockStore';

type Tab = 'home' | 'meetings' | 'chat' | 'scheduler' | 'summariser';

export default function Home() {
  const { user } = useAuth();
  const api = useApi();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newMeetingNotice, setNewMeetingNotice] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [postMeetingSummary, setPostMeetingSummary] = useState<Meeting | null>(null);
  const [activeMeeting, setActiveMeeting] = useState<{
    meetingNumber: string;
    password: string;
    userName: string;
    role?: number;
    zak?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !user) {
      const t = setTimeout(() => { if (!user) router.replace('/login'); }, 100);
      return () => clearTimeout(t);
    }
  }, [user]);

  useEffect(() => { if (search) setDrawerOpen(true); }, [search]);

  useEffect(() => {
    if (router.query.tab && typeof router.query.tab === 'string') {
      setTab(router.query.tab as Tab);
      router.replace('/', undefined, { shallow: true });
    }
  }, [router.query.tab]);

  useEffect(() => {
    if (router.query.join && user) {
      const mn = String(router.query.join);
      setActiveMeeting({ meetingNumber: mn, password: '', userName: user.name || 'Guest' });
      setTab('meetings');
      router.replace('/', undefined, { shallow: true });
    }
  }, [router.query.join, user]);

  if (!user) return null;

  async function handleAction(a: 'new' | 'join' | 'schedule' | 'ai') {
    if (a === 'new') {
      setCreating(true);
      try {
        const result = await api.createZoomMeeting({
          topic: `${user!.name || user!.email.split('@')[0]}'s Meeting`,
          durationMin: 60,
          hostEmail: user!.email,
        });
        setActiveMeeting({
          meetingNumber: result.meetingId,
          password: result.password || '',
          userName: user!.name || user!.email.split('@')[0],
          role: 1,
          zak: result.zak || '',
        });
        setNewMeetingNotice(result.meetingId);
        setTimeout(() => setNewMeetingNotice(null), 8000);
        setTab('meetings');
      } catch (e: any) {
        try {
          const result = await api.createZoomMeeting({
            topic: `${user!.name || 'New'} Meeting`,
            durationMin: 60,
          });
          setActiveMeeting({
            meetingNumber: result.meetingId,
            password: result.password || '',
            userName: user!.name || 'Host',
            role: 1,
            zak: result.zak || '',
          });
          setNewMeetingNotice(result.meetingId);
          setTimeout(() => setNewMeetingNotice(null), 8000);
          setTab('meetings');
        } catch (e2: any) {
          setErrorToast('Failed to create Zoom meeting: ' + (e2.message || e.message));
          setTimeout(() => setErrorToast(null), 8000);
        }
      } finally {
        setCreating(false);
      }
      return;
    }
    if (a === 'join') setShowJoin(true);
    if (a === 'schedule') setTab('scheduler');
    if (a === 'ai') setTab('summariser');
  }

  function joinMeetingNumber(meetingNumber: string) {
    setActiveMeeting({
      meetingNumber,
      password: '',
      userName: user?.name || 'Guest',
    });
    setTab('meetings');
  }

  function handleSummaryReady(meeting: Meeting) {
    setPostMeetingSummary(meeting);
    setActiveMeeting(null);
  }

  const workspace = activeMeeting ? (
    <MeetingWorkspace
      meetingNumber={activeMeeting.meetingNumber}
      password={activeMeeting.password}
      userName={activeMeeting.userName}
      role={activeMeeting.role}
      zak={activeMeeting.zak}
      onLeave={() => setActiveMeeting(null)}
      onSummaryReady={handleSummaryReady}
    />
  ) : null;

  return (
    <div className="app">
      <Sidebar active={tab} onChange={setTab} />
      <div className="main">
        <Topbar
          search={search}
          onSearch={setSearch}
          onBellClick={() => setDrawerOpen(o => !o)}
          onAvatarClick={() => setShowProfile(true)}
        />

        {creating && (
          <div className="new-meeting-toast" style={{ background: '#FEF3C7', borderBottom: '1px solid #FDE68A', color: '#92400E' }}>
            <div>⏳ Creating Zoom meeting…</div>
          </div>
        )}

        {newMeetingNotice && (
          <div className="new-meeting-toast">
            <div>
              <b>✓ Meeting created!</b> — ID: <code>{formatMeetingId(newMeetingNotice)}</code>
            </div>
            <button
              className="btn-link"
              onClick={() => {
                navigator.clipboard.writeText(newMeetingNotice);
                setNewMeetingNotice(null);
              }}
            >
              Copy ID
            </button>
          </div>
        )}

        {errorToast && (
          <div className="new-meeting-toast" style={{ background: '#FEE2E2', borderBottom: '1px solid #FECACA', color: '#991B1B' }}>
            <div>⚠ {errorToast}</div>
            <button className="btn-link" onClick={() => setErrorToast(null)}>Dismiss</button>
          </div>
        )}

        <div className="content">
          {tab === 'home' && <Dashboard onAction={handleAction} />}
          {tab === 'meetings' && (
            <MeetingsPage onJoinClick={() => setShowJoin(true)} activeWorkspace={workspace} />
          )}
          {tab === 'chat' && (
            <div className="page-wrap">
              <h1 className="page-title">Team Chat</h1>
              <div className="empty-card"><p>Chat module coming soon.</p></div>
            </div>
          )}
          {tab === 'scheduler' && <Scheduler onJoin={joinMeetingNumber} />}
          {tab === 'summariser' && <SummariserPage />}
        </div>
      </div>

      <HistoryDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {showJoin && (
        <JoinModal
          onClose={() => setShowJoin(false)}
          onJoin={(d) => {
            setActiveMeeting(d);
            setShowJoin(false);
            setTab('meetings');
          }}
        />
      )}

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}

      {postMeetingSummary && (
        <SummaryModal meeting={postMeetingSummary} onClose={() => setPostMeetingSummary(null)} />
      )}
    </div>
  );
}