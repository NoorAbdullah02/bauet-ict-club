// react-countup ships CommonJS only (build/index.js sets __esModule). Vite 8 / Rolldown resolves a
// default import of such a module to the whole module object when the importing package is
// "type": "module", which makes <CountUp /> render as an object (React error #130). Unwrap once here.
import CountUpModule from 'react-countup';

const CountUp = CountUpModule?.default ?? CountUpModule;

export default CountUp;
