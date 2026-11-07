// One password rule for every admin and team login. Returns an error message, or '' when the password is fine.
const COMMON = new Set(['password', 'passw0rd', '123456789012', 'qwertyuiop12', 'iloveyou1234', 'administrator', 'welcome12345', 'letmein12345', 'bauetictclub', 'bauet12345678', 'admin1234567', 'changeme1234']);
function passwordProblem(pw, username = '') {
  if (typeof pw !== 'string') return 'Password required';
  if (pw.length < 6) return 'Password must be at least 6 characters';
  if (pw.length > 200) return 'Password is too long';
  const low = pw.toLowerCase();
  if (COMMON.has(low) || /^(.)\1+$/.test(pw)) return 'This password is too easy to guess';
  if (username && low.includes(String(username).toLowerCase()) && String(username).length >= 3) return 'The password must not contain the username';
  if (!(/[a-z]/i.test(pw) && /[^a-z]/i.test(pw))) return 'Mix letters with numbers or symbols';
  return '';
}
module.exports = { passwordProblem };
