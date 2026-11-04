import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PageShell from '../components/PageShell';

export default function NotFound() {
  return (
    <PageShell variant="orbs">
      <section className="container grid min-h-[75vh] place-items-center py-24">
        <div className="code-window w-full max-w-xl">
          <div className="code-bar"><i style={{ background: '#FF5F57' }} /><i style={{ background: '#FEBC2E' }} /><i style={{ background: '#28C840' }} /><span>~/bauet-ict-club — zsh</span></div>
          <pre className="code-body">
            <span className="tok-f">$</span> curl -I {typeof location !== 'undefined' ? location.pathname : '/'}{'\n'}
            <span className="tok-k">HTTP/1.1 404</span> Not Found{'\n\n'}
            <span className="tok-c">// this route doesn't exist (yet){'\n'}// maybe it was merged into main?</span>{'\n\n'}
            <span className="tok-f">$</span> cd ~ <span className="code-cursor" />
          </pre>
          <div className="code-foot"><Link to="/" className="inline-flex items-center gap-2 text-tech hover:text-accent"><ArrowLeft size={14} /> cd /home</Link></div>
        </div>
      </section>
    </PageShell>
  );
}
