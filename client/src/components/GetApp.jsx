import { useEffect, useState } from 'react';
import { Download, ShieldCheck, Smartphone, Settings2 } from 'lucide-react';

export const APK_URL = '/downloads/bauet-ict-club.apk';
const OLD_URL = '/downloads/bauet-ict-club-old-phone.apk';

const steps = [
  ['Download', 'Tap the button below. Your phone may warn that this type of file can be harmful: choose Download anyway.'],
  ['Allow install', 'Open the file. If asked, allow "Install unknown apps" for your browser or file manager (Settings → Apps).'],
  ['Open the app', 'Tap Install, then Open. If Play Protect asks, choose Install anyway: the app is not on the Play Store yet.'],
];

/** The Android app, downloaded straight from this website. */
export default function GetApp() {
  const [size, setSize] = useState('');
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    fetch(APK_URL, { method: 'HEAD' }).then((r) => {
      const type = r.headers.get('content-type') || '';
      if (!r.ok || type.includes('text/html')) { setMissing(true); return; } // the site answers every address with the page, so a page means "no file"
      const n = Number(r.headers.get('content-length'));
      if (n) setSize(`${(n / 1048576).toFixed(0)} MB`);
    }).catch(() => {});
  }, []);

  return (
    <section className="section">
      <div className="container max-w-2xl">
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-accent/10 text-accent"><Smartphone size={30} /></div>
          <h1 className="mt-5 text-4xl text-fg">Get the club app</h1>
          <p className="mx-auto mt-3 max-w-md text-fg2">Events, notices, gallery and club news on your phone. For Android.</p>
          {missing
            ? <p className="mx-auto mt-7 max-w-sm rounded-2xl bg-alt p-4 text-sm text-fg2">The app file is not uploaded yet. Please check again soon.</p>
            : <a href={APK_URL} download className="btn-primary mt-7 inline-flex"><Download size={17} /> Download for Android{size ? ` (${size})` : ''}</a>}
          <p className="mt-3 text-xs text-muted">Free · Android 6 or newer · from the BAUET ICT Club website</p>
          {!missing && <p className="mt-2 text-xs text-muted">Very old phone and the app will not install? <a href={OLD_URL} download className="font-semibold text-tech underline">Download the version for older phones</a></p>}
        </div>

        <ol className="mt-10 space-y-3">
          {steps.map(([t, d], i) => (
            <li key={t} className="flex gap-4 rounded-2xl border border-line bg-surface p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/10 font-mono text-sm font-semibold text-accent">{i + 1}</span>
              <div><div className="font-semibold text-fg">{t}</div><p className="mt-0.5 text-sm text-fg2">{d}</p></div>
            </li>
          ))}
        </ol>

        <div className="mt-6 grid gap-3 text-sm text-fg2 sm:grid-cols-2">
          <p className="flex gap-2.5 rounded-2xl bg-alt p-4"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-accent" /> Download only from this website. Do not install copies sent by other people.</p>
          <p className="flex gap-2.5 rounded-2xl bg-alt p-4"><Settings2 size={18} className="mt-0.5 shrink-0 text-accent" /> To update, download the newest file and install it. If it refuses, uninstall the old app first.</p>
        </div>
        <p className="mt-6 text-center text-xs text-muted">No Android phone? The website works the same in your browser, and you can add it to your home screen.</p>
      </div>
    </section>
  );
}
