import QRCode from 'qrcode';
import crypto from 'crypto';

const SIGNING_SECRET = process.env.JWT_SECRET || 'secret_signing_key_2026';

/**
 * Generate a cryptographically signed QR Code as a Data URL (base64 PNG)
 * The payload is tamper-proof: payload + HMAC-SHA256 signature
 */
export async function generateSignedQRCode(data) {
  const payloadStr = JSON.stringify(data);
  const signature = crypto
    .createHmac('sha256', SIGNING_SECRET)
    .update(payloadStr)
    .digest('hex')
    .substring(0, 16); // 16-char compact hex signature

  const qrPayload = JSON.stringify({
    ...data,
    sig: signature,
    issuedAt: new Date().toISOString()
  });

  try {
    const dataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 320,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR Code:', error);
    throw error;
  }
}

/**
 * Verifies a scanned QR payload signature against our secret key
 */
export function verifyQRPayload(qrPayloadStr) {
  try {
    const parsed = typeof qrPayloadStr === 'string' ? JSON.parse(qrPayloadStr) : qrPayloadStr;
    const { sig, issuedAt, ...originalData } = parsed;

    if (!sig) return { valid: false, error: 'Missing QR signature' };

    const expectedSig = crypto
      .createHmac('sha256', SIGNING_SECRET)
      .update(JSON.stringify(originalData))
      .digest('hex')
      .substring(0, 16);

    if (sig !== expectedSig) {
      return { valid: false, error: 'Invalid or forged QR signature' };
    }

    return { valid: true, data: originalData, issuedAt };
  } catch (err) {
    return { valid: false, error: 'Malformed QR payload format' };
  }
}
