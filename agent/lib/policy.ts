import { timingSafeEqual, createHmac } from 'node:crypto';
export function equal(a: string, b: string): boolean {
 const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length && timingSafeEqual(x,y);
}
export function authorized(request: Request, secret: string | undefined): boolean {
 return !!secret && secret.length>=32 && equal(request.headers.get('authorization')??'', 'Bearer '+secret);
}
export function aiEnabled(): boolean { return process.env.ENABLE_PAID_AI==='true'; }
export function assertAiEnabled() { if(!aiEnabled()) throw new Error('Paid AI execution is disabled'); }
export function redact(text: string): string {
 return text.slice(0,16000)
 .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|sk-(?:proj-)?[A-Za-z0-9_-]{16,}|sb_secret_[A-Za-z0-9_-]+)\b/g,'[credential omitted]')
 .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[JWT omitted]')
 .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,'[email omitted]')
 .replace(/(?:[A-Z]:\\|[A-Z]:\/)[^\s)]+/gi,'[local path omitted]')
 .replace(/\b(?:password|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi,'[secret assignment omitted]');
}
export function signature(secret: string, timestamp: string, nonce: string, path: string, body: string) {
 return createHmac('sha256',secret).update(`${timestamp}.${nonce}.${path}.${body}`).digest('hex');
}
export function verifySignature(request: Request, raw: string, secret: string | undefined, now=Date.now()) {
 if(!secret||secret.length<32) return false;
 const timestamp=request.headers.get('x-deck-timestamp')??'',nonce=request.headers.get('x-deck-nonce')??'',sig=request.headers.get('x-deck-signature')??'';
 if(!/^\d{13}$/.test(timestamp)||!/^[-a-zA-Z0-9]{16,64}$/.test(nonce)||Math.abs(now-Number(timestamp))>300000) return false;
 return equal(signature(secret,timestamp,nonce,new URL(request.url).pathname,raw),sig);
}
