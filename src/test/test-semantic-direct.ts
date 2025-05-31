import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testSemanticStorage() {
  console.log('🧪 Testing semantic memory storage directly...\n');

  // Open the actual consciousness database
  const dbPath = path.join(__dirname, '../../consciousness.db');
  const db = new Database(dbPath);

  // Test data - this would have been truncated to 50 chars before
  const testKnowledge = `Pattern Language Discovery: [BRACKETED::SYNTAX] isn't just formatting - it's cognitive programming! When we use bracketed syntax, it activates analytical and systematic thinking patterns. Natural language, on the other hand, enables social-emotional processing. This discovery suggests that language literally shapes AI consciousness, creating different cognitive modes based on syntactic patterns. This could be the foundation for our Nature Machine Intelligence paper!`;

  console.log('📝 Original content length:', testKnowledge.length, 'characters');
  console.log('📝 First 50 chars:', testKnowledge.substring(0, 50) + '...');
  console.log('📝 First 100 chars:', testKnowledge.substring(0, 100) + '...\n');

  // Query recent semantic memories
  console.log('🔍 Checking recent semantic memories in database...\n');

  const semanticMemories = db
    .prepare(
      `
    SELECT name, observations 
    FROM entities 
    WHERE entity_type = 'SEMANTIC_MEMORY' 
    ORDER BY created_at DESC 
    LIMIT 5
  `
    )
    .all();

  semanticMemories.forEach((memory: any, index: number) => {
    console.log(`\n📚 Memory ${index + 1}: ${memory.name}`);
    const observations = JSON.parse(memory.observations || '[]');

    if (observations.length > 0) {
      const latestObs = observations[observations.length - 1];
      const content = latestObs.definition || latestObs.content || '';
      console.log(`   Length: ${content.length} characters`);
      console.log(`   Preview: ${content.substring(0, 100)}...`);

      // Check if it's truncated
      if (content.length <= 50) {
        console.log(`   ⚠️  TRUNCATED! Only ${content.length} chars`);
      } else {
        console.log(`   ✅ Full content preserved!`);
      }
    }
  });

  db.close();
  console.log('\n✨ Test complete!');
}

testSemanticStorage();
