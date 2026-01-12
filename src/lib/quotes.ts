export interface Quote {
  id: string;
  text: string;
  author: string;
  category: 'literature' | 'tech' | 'motivational' | 'philosophy' | 'science';
}

export const quotes: Quote[] = [
  {
    id: '1',
    text: 'The only way to do great work is to love what you do.',
    author: 'Steve Jobs',
    category: 'motivational'
  },
  {
    id: '2',
    text: 'Innovation distinguishes between a leader and a follower.',
    author: 'Steve Jobs',
    category: 'tech'
  },
  {
    id: '3',
    text: 'The future belongs to those who believe in the beauty of their dreams.',
    author: 'Eleanor Roosevelt',
    category: 'motivational'
  },
  {
    id: '4',
    text: 'It is not the strongest of the species that survives, nor the most intelligent, but the one most responsive to change.',
    author: 'Charles Darwin',
    category: 'science'
  },
  {
    id: '5',
    text: 'The only thing we have to fear is fear itself.',
    author: 'Franklin D. Roosevelt',
    category: 'motivational'
  },
  {
    id: '6',
    text: 'In the middle of difficulty lies opportunity.',
    author: 'Albert Einstein',
    category: 'science'
  },
  {
    id: '7',
    text: 'Code is like humor. When you have to explain it, it is bad.',
    author: 'Cory House',
    category: 'tech'
  },
  {
    id: '8',
    text: 'The best time to plant a tree was twenty years ago. The second best time is now.',
    author: 'Chinese Proverb',
    category: 'philosophy'
  },
  {
    id: '9',
    text: 'Simplicity is the ultimate sophistication.',
    author: 'Leonardo da Vinci',
    category: 'philosophy'
  },
  {
    id: '10',
    text: 'Talk is cheap. Show me the code.',
    author: 'Linus Torvalds',
    category: 'tech'
  },
  {
    id: '11',
    text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.',
    author: 'Nelson Mandela',
    category: 'motivational'
  },
  {
    id: '12',
    text: 'Life is what happens when you are busy making other plans.',
    author: 'John Lennon',
    category: 'philosophy'
  },
  {
    id: '13',
    text: 'First, solve the problem. Then, write the code.',
    author: 'John Johnson',
    category: 'tech'
  },
  {
    id: '14',
    text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    author: 'Martin Fowler',
    category: 'tech'
  },
  {
    id: '15',
    text: 'The mind is everything. What you think you become.',
    author: 'Buddha',
    category: 'philosophy'
  },
  {
    id: '16',
    text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    author: 'Winston Churchill',
    category: 'motivational'
  },
  {
    id: '17',
    text: 'Two things are infinite: the universe and human stupidity; and I am not sure about the universe.',
    author: 'Albert Einstein',
    category: 'science'
  },
  {
    id: '18',
    text: 'The only true wisdom is in knowing you know nothing.',
    author: 'Socrates',
    category: 'philosophy'
  },
  {
    id: '19',
    text: 'Programs must be written for people to read, and only incidentally for machines to execute.',
    author: 'Harold Abelson',
    category: 'tech'
  },
  {
    id: '20',
    text: 'Be the change you wish to see in the world.',
    author: 'Mahatma Gandhi',
    category: 'motivational'
  }
];

export const commonWords = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'I',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'world', 'very', 'through', 'right', 'down', 'still', 'find', 'here', 'thing', 'place',
  'great', 'little', 'own', 'old', 'home', 'same', 'last', 'never', 'before', 'while'
];

export function getRandomQuote(): Quote {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function generateRandomWords(count: number, includePunctuation: boolean = false, includeNumbers: boolean = false): string {
  const words: string[] = [];
  
  for (let i = 0; i < count; i++) {
    let word = commonWords[Math.floor(Math.random() * commonWords.length)];
    
    if (includeNumbers && Math.random() < 0.1) {
      word = Math.floor(Math.random() * 1000).toString();
    }
    
    if (includePunctuation && Math.random() < 0.15) {
      const punctuation = ['.', ',', '!', '?', ';', ':'];
      word += punctuation[Math.floor(Math.random() * punctuation.length)];
    }
    
    words.push(word);
  }
  
  return words.join(' ');
}
