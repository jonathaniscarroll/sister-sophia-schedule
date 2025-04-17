import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'Key is required' });
  }

  let client;
  try {
    client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false
      }
    });

    client.on('error', (err) => console.error('Redis Client Error', err));
    
    await client.connect();
    const value = await client.get(key);
    return res.status(200).json({ value: value ? JSON.parse(value) : null });
  } catch (error) {
    console.error('Redis error:', error);
    return res.status(500).json({ error: 'Redis operation failed' });
  } finally {
    if (client) {
      await client.quit();
    }
  }
}