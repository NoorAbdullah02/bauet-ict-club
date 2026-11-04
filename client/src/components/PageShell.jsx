/** Content-page wrapper: a lightweight CSS glow under the navbar (no WebGL, so pages open instantly). */
export default function PageShell({ children }) {
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] [mask-image:linear-gradient(to_bottom,black,transparent)]">
        <div className="absolute -left-24 top-0 size-[26rem] rounded-full bg-accent/20 blur-[90px]" />
        <div className="absolute -right-20 top-10 size-[22rem] rounded-full bg-tech/15 blur-[90px]" />
      </div>
      <div className="relative pt-16">{children}</div>
    </div>
  );
}
