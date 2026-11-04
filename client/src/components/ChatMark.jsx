/** Friendly chat-bubble mark with a small smile: the chatbot's launcher and avatar. */
export default function ChatMark({ size = 26, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <path d="M16 3.5c-7 0-12.5 4.8-12.5 11 0 3.4 1.7 6.4 4.3 8.4-.2 1.7-.9 3.3-2 4.6 2.6-.1 4.9-1 6.6-2.3 1.2.3 2.4.4 3.6.4 7 0 12.5-4.8 12.5-11S23 3.5 16 3.5Z" fill="currentColor" />
      <circle cx="11.5" cy="14.5" r="1.7" fill="#0A1A4A" />
      <circle cx="20.5" cy="14.5" r="1.7" fill="#0A1A4A" />
      <path d="M11.8 18.6c1 1.4 2.5 2.1 4.2 2.1s3.2-.7 4.2-2.1" stroke="#0A1A4A" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
