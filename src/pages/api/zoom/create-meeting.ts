import type { NextApiRequest, NextApiResponse } from 'next';

let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_S2S_CLIENT_ID;
  const clientSecret = process.env.ZOOM_S2S_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    throw new Error(
      'Missing ZOOM_ACCOUNT_ID / ZOOM_S2S_CLIENT_ID / ZOOM_S2S_CLIENT_SECRET in .env.local'
    );
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const r = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const data = await r.json();
  if (!r.ok) {
    throw new Error(`Zoom OAuth failed (${r.status}): ${data.message || JSON.stringify(data)}`);
  }

  cachedToken = {
    value: data.access_token,
    exp: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { topic, durationMin = 60, hostEmail } = req.body || {};
    const token = await getAccessToken();

    const userId = hostEmail || 'me';

    // 1. Create the meeting
    const zoomRes = await fetch(
      `https://api.zoom.us/v2/users/${encodeURIComponent(userId)}/meetings`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: topic || 'New Meeting',
          type: 1,
          duration: Number(durationMin),
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: true,
            mute_upon_entry: false,
            waiting_room: false,
            approval_type: 2,
            audio: 'both',
            auto_recording: 'none',
          },
        }),
      }
    );

    const data = await zoomRes.json();
    if (!zoomRes.ok) {
      console.error('[create-meeting] Zoom API error:', data);
      return res.status(zoomRes.status).json({
        error: data.message || 'Zoom API failed',
        code: data.code,
        details: data,
      });
    }

    // 2. Get ZAK token for the host so SDK can join AS host (starts the meeting)
    let zak = '';
    try {
      const hostId = data.host_id || userId;
      const zakRes = await fetch(
        `https://api.zoom.us/v2/users/${encodeURIComponent(hostId)}/token?type=zak`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const zakData = await zakRes.json();
      if (zakRes.ok && zakData.token) {
        zak = zakData.token;
      } else {
        console.warn('[create-meeting] Could not get ZAK:', zakData);
      }
    } catch (e) {
      console.warn('[create-meeting] ZAK fetch failed:', e);
    }

    return res.status(200).json({
      meetingId: String(data.id),
      password: data.password || '',
      joinUrl: data.join_url,
      startUrl: data.start_url,
      topic: data.topic,
      zak,
    });
  } catch (e: any) {
    console.error('[create-meeting] Failed:', e);
    return res.status(500).json({ error: e.message || 'Create meeting failed' });
  }
}