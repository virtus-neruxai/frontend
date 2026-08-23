export function formatMentorResponseText(text) {
  if (!text) return '';

  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\s*---\s*/g, '\n\n---\n\n')
    .replace(/\s+(🧭|📅|💡|\*\*[^*\n]+?\*\*)/g, '\n\n$1')
    .replace(/\s+(📎 Registros:)/g, '\n\n$1')
    .replace(/\s+-\s+(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/g, '\n- $1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const HISTORY_PROPOSAL_START = /(?:^|\n)(?:---\n\n)?He preparado (?:esta|este|una|un) (?:tarea|misi[oó]n|rutina|micro-?acci[oó]n)\b/i;

export function formatMentorHistoryResponseText(text) {
  const formatted = formatMentorResponseText(text);
  if (!formatted) return '';

  const recordsMarker = '📎 Registros:';
  const recordsIndex = formatted.indexOf(recordsMarker);
  const beforeRecords = recordsIndex >= 0
    ? formatted.slice(0, recordsIndex)
    : formatted;
  const proposalMatch = beforeRecords.match(HISTORY_PROPOSAL_START);

  if (!proposalMatch) return formatted;

  const mentorResponse = beforeRecords
    .slice(0, proposalMatch.index)
    .replace(/\s*---\s*$/, '')
    .trim();
  const records = recordsIndex >= 0
    ? formatted.slice(recordsIndex).trim()
    : '';

  return [mentorResponse, records].filter(Boolean).join('\n\n---\n\n');
}
