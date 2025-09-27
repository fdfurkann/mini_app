import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  try {
    const { messages } = req.body;
    const azureRes = await fetch('https://orcawebtr-resource.services.ai.azure.com/api/projects/orcawebtr/chat/completions?api-version=2023-06-01-preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': '1mfWDaMzpBDruAOjlNkujEAOOWwuVSJlsIZ8zKUbPje8cVQI83mLJQQJ99BFACHYHv6XJ3w3AAAAACOG2CAY'
      },
      body: JSON.stringify({ messages })
    });
    const data = await azureRes.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ message: error?.message || 'Bir hata oluştu.' });
  }
} 