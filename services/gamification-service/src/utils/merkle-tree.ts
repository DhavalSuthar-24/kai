import crypto from 'crypto';

/**
 * Merkle tree implementation for verifiable results
 */

export function generateMerkleRoot(data: any[]): string {
  if (data.length === 0) return '';

  // Hash each data item
  let hashes = data.map((item) => 
    crypto.createHash('sha256').update(JSON.stringify(item)).digest('hex')
  );

  // Build tree bottom-up
  while (hashes.length > 1) {
    const newLevel: string[] = [];
    
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        const combined = hashes[i] + hashes[i + 1];
        newLevel.push(crypto.createHash('sha256').update(combined).digest('hex'));
      } else {
        newLevel.push(hashes[i]);
      }
    }
    
    hashes = newLevel;
  }

  return hashes[0];
}

export function generateIntegrityChecksum(merkleRoot: string, userId: string, timestamp: number): string {
  const data = `${merkleRoot}:${userId}:${timestamp}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function verifyIntegrityChecksum(
  merkleRoot: string,
  userId: string,
  timestamp: number,
  providedChecksum: string
): boolean {
  const calculatedChecksum = generateIntegrityChecksum(merkleRoot, userId, timestamp);
  return calculatedChecksum === providedChecksum;
}
