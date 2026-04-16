// Generates a deterministic, unique 10-11 digit Zoom-style meeting ID
// derived from the user's email + timestamp.

export function generateMeetingId(email: string): string {
  // Hash the email into a base number
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0; // 32-bit
  }
  const emailPart = Math.abs(hash) % 100000; // 5 digits

  // Add 5 digits from current timestamp for uniqueness
  const timePart = Date.now() % 100000;

  // Combine into a 10-digit Zoom-style ID
  const combined = `${emailPart.toString().padStart(5, '0')}${timePart.toString().padStart(5, '0')}`;
  return combined;
}

// Format a meeting ID Zoom-style: 123 456 7890
export function formatMeetingId(id: string): string {
  if (id.length === 10) return `${id.slice(0, 3)} ${id.slice(3, 6)} ${id.slice(6)}`;
  if (id.length === 11) return `${id.slice(0, 3)} ${id.slice(3, 7)} ${id.slice(7)}`;
  return id;
}
