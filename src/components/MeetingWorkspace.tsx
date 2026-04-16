import ZoomFrame from './ZoomFrame';
import MeetingAssistant from './MeetingAssistant';
import type { Meeting } from '../lib/mockStore';

export default function MeetingWorkspace({
  meetingNumber,
  password,
  userName,
  role,
  zak,
  onLeave,
  onSummaryReady,
}: {
  meetingNumber: string;
  password: string;
  userName: string;
  role?: number;
  zak?: string;
  onLeave: () => void;
  onSummaryReady: (m: Meeting) => void;
}) {
  return (
    <div className="workspace">
      <div className="workspace-header">
        <h2>Zoom Meeting #{meetingNumber}</h2>
        <button className="btn btn-secondary" onClick={onLeave}>Leave Meeting</button>
      </div>
      <ZoomFrame
        meetingNumber={meetingNumber}
        password={password}
        userName={userName}
        role={role}
        zak={zak}
        onLeft={onLeave}
      />
      <MeetingAssistant
        zoomMeetingNumber={meetingNumber}
        userName={userName}
        onSummaryReady={onSummaryReady}
      />
    </div>
  );
}