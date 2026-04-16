import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({});

export const handler = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const { contentType = 'audio/webm' } = JSON.parse(event.body || '{}');
  const key = `${userId}/${Date.now()}.webm`;

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.AUDIO_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  );

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': process.env.APP_ORIGIN || '*' },
    body: JSON.stringify({ uploadUrl: url, audioKey: key }),
  };
};
