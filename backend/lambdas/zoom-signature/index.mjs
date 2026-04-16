import jwt from 'jsonwebtoken';
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm';

const ssm = new SSMClient({});
let cached;

async function loadSecrets() {
  if (cached) return cached;
  const out = await ssm.send(new GetParametersCommand({
    Names: ['/zoom/sdk-key', '/zoom/sdk-secret'],
    WithDecryption: true,
  }));
  cached = Object.fromEntries(out.Parameters.map(p => [p.Name, p.Value]));
  return cached;
}

const cors = {
  'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Authorization,Content-Type',
};

export const handler = async (event) => {
  const { meetingNumber, role = 0 } = JSON.parse(event.body || '{}');
  const s = await loadSecrets();
  const sdkKey = s['/zoom/sdk-key'];
  const sdkSecret = s['/zoom/sdk-secret'];

  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;

  const payload = {
    sdkKey,
    appKey: sdkKey,
    mn: String(meetingNumber),
    role: Number(role),
    iat, exp, tokenExp: exp,
  };

  const signature = jwt.sign(payload, sdkSecret, { algorithm: 'HS256' });
  return { statusCode: 200, headers: cors, body: JSON.stringify({ signature, sdkKey }) };
};
