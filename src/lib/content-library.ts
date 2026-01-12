import { supabase } from '@/integrations/supabase/client';

// Extended word lists
const commonWords1000 = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'feel', 'find', 'tell', 'ask', 'seem', 'try', 'leave', 'call', 'keep', 'let',
  'put', 'begin', 'through', 'much', 'great', 'where', 'help', 'every', 'line', 'set',
  'own', 'under', 'read', 'last', 'never', 'run', 'around', 'form', 'small', 'place',
  'world', 'live', 'move', 'show', 'learn', 'should', 'still', 'between', 'long', 'turn',
  'high', 'large', 'must', 'name', 'number', 'group', 'always', 'while', 'might', 'many',
  'house', 'study', 'night', 'again', 'point', 'home', 'water', 'grow', 'school', 'side',
  'change', 'open', 'write', 'play', 'spell', 'air', 'such', 'right', 'away', 'say',
  'need', 'few', 'hand', 'thing', 'story', 'young', 'sort', 'kind', 'within', 'soon',
  'enough', 'close', 'start', 'along', 'city', 'carry', 'mile', 'once', 'paper', 'idea',
  'body', 'sound', 'country', 'earth', 'eye', 'face', 'head', 'food', 'father', 'mother',
  'family', 'animal', 'answer', 'order', 'stand', 'walk', 'near', 'child', 'watch', 'hard',
];

const advancedWords = [
  'algorithm', 'paradigm', 'synchronize', 'comprehensive', 'infrastructure',
  'methodology', 'implementation', 'architecture', 'optimization', 'abstraction',
  'encapsulation', 'polymorphism', 'inheritance', 'asynchronous', 'authentication',
  'authorization', 'configuration', 'documentation', 'specification', 'integration',
  'deployment', 'persistence', 'transaction', 'middleware', 'virtualization',
  'containerization', 'orchestration', 'microservices', 'scalability', 'reliability',
  'maintainability', 'accessibility', 'responsiveness', 'compatibility', 'interoperability',
];

const codeSnippetsLocal = {
  javascript: [
    'const greeting = "Hello, World!";',
    'function add(a, b) { return a + b; }',
    'const arr = [1, 2, 3].map(x => x * 2);',
    'const { name, age } = user;',
    'async function fetchData() { return await fetch(url); }',
    'const result = items.filter(x => x.active).map(x => x.name);',
    'export default function Component({ children }) { return <div>{children}</div>; }',
    'const [state, setState] = useState(initialValue);',
    'useEffect(() => { fetchData(); }, [dependency]);',
    'const handler = useCallback((e) => setValue(e.target.value), []);',
  ],
  python: [
    'def fibonacci(n): return n if n <= 1 else fibonacci(n-1) + fibonacci(n-2)',
    'result = [x**2 for x in range(10) if x % 2 == 0]',
    'with open("file.txt", "r") as f: content = f.read()',
    'class Person: def __init__(self, name): self.name = name',
    'import pandas as pd; df = pd.DataFrame(data)',
    'async def fetch_data(): return await session.get(url)',
    'lambda x: x * 2 if x > 0 else 0',
    'try: result = func() except Exception as e: print(e)',
    'from typing import List, Dict, Optional',
    '@decorator def enhanced_function(): pass',
  ],
  typescript: [
    'interface User { id: number; name: string; email?: string; }',
    'type Status = "pending" | "active" | "completed";',
    'function identity<T>(arg: T): T { return arg; }',
    'const useCustomHook = (): [string, (val: string) => void] => {}',
    'export type Props = React.ComponentPropsWithoutRef<"div">;',
    'const assertNever = (x: never): never => { throw new Error(); };',
    'type Readonly<T> = { readonly [P in keyof T]: T[P] };',
    'interface Repository<T> { find(id: string): Promise<T>; }',
    'const enum Direction { Up, Down, Left, Right }',
    'declare module "*.svg" { const src: string; export default src; }',
  ],
  sql: [
    'SELECT * FROM users WHERE age > 18 ORDER BY name;',
    'INSERT INTO products (name, price) VALUES ("Widget", 19.99);',
    'UPDATE accounts SET balance = balance + 100 WHERE id = 1;',
    'DELETE FROM sessions WHERE expires_at < NOW();',
    'SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id;',
    'CREATE TABLE posts (id SERIAL PRIMARY KEY, title TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW());',
    'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);',
    'CREATE INDEX idx_user_email ON users(email);',
    'WITH recent AS (SELECT * FROM posts WHERE created_at > NOW() - INTERVAL 7 DAY) SELECT * FROM recent;',
    'GRANT SELECT, INSERT ON products TO app_user;',
  ],
  rust: [
    'fn main() { println!("Hello, Rust!"); }',
    'let mut vec: Vec<i32> = Vec::new();',
    'match value { Some(x) => x, None => 0 }',
    'impl Iterator for Counter { type Item = u32; }',
    'struct Point<T> { x: T, y: T }',
    'fn largest<T: PartialOrd>(list: &[T]) -> &T {}',
    'use std::collections::HashMap;',
    '#[derive(Debug, Clone, PartialEq)]',
    'async fn fetch_url(url: &str) -> Result<String, Error> {}',
    'pub trait Summary { fn summarize(&self) -> String; }',
  ],
};

export async function getQuotes(): Promise<{ content: string; author: string }[]> {
  try {
    const { data, error } = await supabase
      .from('quotes')
      .select('content, author')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch {
    // Fallback to local quotes
    return [
      { content: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
      { content: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
      { content: 'Life is what happens when you are busy making other plans.', author: 'John Lennon' },
    ];
  }
}

export async function getRandomQuote(): Promise<{ content: string; author: string }> {
  const quotes = await getQuotes();
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export async function getCodeSnippets(language?: string): Promise<{ content: string; language: string }[]> {
  try {
    let query = supabase.from('code_snippets').select('content, language');
    if (language) {
      query = query.eq('language', language);
    }
    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch {
    // Fallback to local snippets
    if (language && codeSnippetsLocal[language as keyof typeof codeSnippetsLocal]) {
      return codeSnippetsLocal[language as keyof typeof codeSnippetsLocal].map(content => ({ content, language }));
    }
    return Object.entries(codeSnippetsLocal).flatMap(([lang, snippets]) => 
      snippets.map(content => ({ content, language: lang }))
    );
  }
}

export function getRandomCodeSnippet(language?: string): { content: string; language: string } {
  if (language && codeSnippetsLocal[language as keyof typeof codeSnippetsLocal]) {
    const snippets = codeSnippetsLocal[language as keyof typeof codeSnippetsLocal];
    return { content: snippets[Math.floor(Math.random() * snippets.length)], language };
  }
  
  const allSnippets = Object.entries(codeSnippetsLocal).flatMap(([lang, snippets]) => 
    snippets.map(content => ({ content, language: lang }))
  );
  return allSnippets[Math.floor(Math.random() * allSnippets.length)];
}

export function generateWordList(
  count: number = 50,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  includePunctuation: boolean = false,
  includeNumbers: boolean = false
): string {
  let wordPool: string[];
  
  switch (difficulty) {
    case 'easy':
      wordPool = commonWords1000.slice(0, 200);
      break;
    case 'hard':
      wordPool = [...commonWords1000.slice(100), ...advancedWords];
      break;
    default:
      wordPool = [...commonWords1000];
  }

  const words: string[] = [];
  const punctuation = ['.', ',', '!', '?', ';', ':'];
  
  for (let i = 0; i < count; i++) {
    let word = wordPool[Math.floor(Math.random() * wordPool.length)];
    
    if (includeNumbers && Math.random() < 0.15) {
      word = Math.floor(Math.random() * 1000).toString();
    }
    
    if (includePunctuation && Math.random() < 0.2) {
      word += punctuation[Math.floor(Math.random() * punctuation.length)];
    }
    
    words.push(word);
  }

  return words.join(' ');
}

export const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
];
