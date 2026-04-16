import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sdkKey = process.env.ZOOM_SDK_KEY;
  const sdkSecret = process.env.ZOOM_SDK_SECRET;

  if (!sdkKey || !sdkSecret) {
    console.error('[zoom-signature] Missing ZOOM_SDK_KEY or ZOOM_SDK_SECRET in .env.local');
    return res.status(500).json({
      error: 'Server is missing ZOOM_SDK_KEY / ZOOM_SDK_SECRET.',
    });
  }

  try {
    const { meetingNumber, role = 0 } = req.body || {};
    if (!meetingNumber) {
      return res.status(400).json({ error: 'meetingNumber required' });
    }

    const iat = Math.floor(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;

    const payload = {
      sdkKey,
      appKey: sdkKey,
      mn: String(meetingNumber),
      role: Number(role),
      iat,
      exp,
      tokenExp: exp,
    };

    const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });
    console.log('[zoom-signature] Generated for meeting', meetingNumber, 'role', role);
    return res.status(200).json({ signature, sdkKey });
  } catch (e: any) {
    console.error('[zoom-signature] Failed:', e);
    return res.status(500).json({ error: e.message });
  }
}