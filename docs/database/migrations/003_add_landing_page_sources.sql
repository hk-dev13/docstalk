-- Add missing doc sources from landing page
INSERT INTO doc_sources (id, name, description, base_url, keywords)
VALUES 
  ('nodejs', 'Node.js', 'Node.js JavaScript runtime documentation', 'https://nodejs.org/docs/latest/api/', ARRAY['node', 'nodejs', 'runtime', 'server', 'javascript']),
  ('tailwind', 'Tailwind CSS', 'A utility-first CSS framework', 'https://tailwindcss.com/docs', ARRAY['css', 'tailwind', 'style', 'utility', 'class']),
  ('prisma', 'Prisma', 'Next-generation Node.js and TypeScript ORM', 'https://www.prisma.io/docs', ARRAY['orm', 'database', 'sql', 'prisma', 'schema']),
  ('express', 'Express', 'Fast, unopinionated, minimalist web framework for Node.js', 'https://expressjs.com/en/starter/installing.html', ARRAY['express', 'server', 'http', 'api', 'middleware']),
  ('python', 'Python', 'Python programming language documentation', 'https://docs.python.org/3/', ARRAY['python', 'language', 'programming', 'script']),
  ('rust', 'Rust', 'Rust programming language documentation', 'https://doc.rust-lang.org/book/', ARRAY['rust', 'cargo', 'system', 'memory', 'safety']),
  ('go', 'Go', 'Go programming language documentation', 'https://go.dev/doc/', ARRAY['go', 'golang', 'google', 'concurrency', 'goroutine'])
ON CONFLICT (id) DO NOTHING;
