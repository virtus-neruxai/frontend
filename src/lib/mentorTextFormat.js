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
