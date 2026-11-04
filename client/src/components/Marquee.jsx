const ITEMS = ['Web Development', 'AI & Machine Learning', 'Competitive Programming', 'Cyber Security', 'Robotics & IoT', 'Hackathons', 'UI / UX Design', 'Cloud & DevOps'];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  );
}
