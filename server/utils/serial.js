// Runs jobs with the same key one after another (in this process). Used so that two people registering at the same moment
// cannot both take the last seat or both pass the "already registered" check.
const tails = new Map();
function serial(key, job) {
  const prev = tails.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(job);
  const tail = run.catch(() => {});
  tails.set(key, tail);
  tail.then(() => { if (tails.get(key) === tail) tails.delete(key); });
  return run;
}
module.exports = { serial };
