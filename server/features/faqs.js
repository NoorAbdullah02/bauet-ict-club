// Frequently asked questions: /api/faqs, shown on /faq (also as FAQ structured data for search engines)
module.exports = {
  table: 'faqs', label: 'FAQ',
  columns: ['question', 'answer', 'sort_order'],
  orderBy: 'sort_order', orderDir: 'ASC', public: true,
  title: (r) => r.question,
  sql: `CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 99,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,
  // inserted once, only when the table is empty
  seed: [
    { question: 'Who can join the BAUET ICT Club?', answer: 'Any BAUET student from any department and batch. You only need curiosity about technology.', sort_order: 1 },
    { question: 'Is there a membership fee?', answer: 'Please contact the club for the current membership details. Applying through the website is free.', sort_order: 2 },
    { question: 'What is the difference between a committee member, a general member and an ambassador?', answer: 'Committee members run the club for a session and are published on the Team page. General members join activities and learn. Department ambassadors represent their department and spread club news there.', sort_order: 3 },
    { question: 'How do I apply for the executive committee?', answer: 'Open Join, choose Committee Member, upload a clear photo, pick the post you want and submit. The current committee reviews applications and selects the team for the session.', sort_order: 4 },
    { question: 'What does the club do?', answer: 'Workshops, hackathons, tech talks, competitive programming, mentorship and team projects.', sort_order: 5 },
    { question: 'How can I contact the club?', answer: 'Use the Contact page, email ictclubbauet@gmail.com or call 01748-269350.', sort_order: 6 },
  ],
};
