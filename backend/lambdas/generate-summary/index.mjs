import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
import { randomUUID } from 'crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ssm = new SSMClient({});
let geminiKey;

async function getKey() {
  if (geminiKey) return geminiKey;
  const r = await ssm.send(new GetParameterCommand({
    Name: '/gemini/api-key',
    WithDecryption: true,
  }));
  geminiKey = r.Parameter.Value;
  return geminiKey;
}

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { meetingId } = JSON.parse(event.body);

  const got = await ddb.send(new GetCommand({
    TableName: process.env.MEETINGS_TABLE,
    Key: { userId, meetingId },
  }));
  if (!got.Item) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Not found' }) };
  }

  const transcriptText = (got.Item.transcript || [])
    .map(e => (typeof e === 'string' ? e : e.text))
    .join(' ');

  const prompt = `Summarize the meeting transcript below.
Return STRICT JSON with this shape:
{"summary": "concise paragraph", "actionItems": [{"text": "...", "owner": "name or null"}]}

TRANSCRIPT:
${transcriptText}`;

  const key = await getKey();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    }
  );
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  let parsed = { summary: '', actionItems: [] };
  try { parsed = JSON.parse(raw); } catch { /* leave defaults */ }
  const { summary = '', actionItems = [] } = parsed;

  await ddb.send(new UpdateCommand({
    TableName: process.env.MEETINGS_TABLE,
    Key: { userId, meetingId },
    UpdateExpression: 'SET summary = :s',
    ExpressionAttributeValues: { ':s': summary },
  }));

  if (actionItems.length) {
    await ddb.send(new BatchWriteCommand({
      RequestItems: {
        [process.env.ACTION_ITEMS_TABLE]: actionItems.slice(0, 25).map(ai => ({
          PutRequest: {
            Item: {
              meetingId,
              itemId: randomUUID(),
              text: ai.text,
              owner: ai.owner || null,
            },
          },
        })),
      },
    }));
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
    body: JSON.stringify({ summary, actionItems }),
  };
};
