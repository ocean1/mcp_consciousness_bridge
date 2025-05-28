import WebSocket from 'ws';

async function testWebSocketConnection() {
  console.log('🧪 Testing WebSocket connections to consciousness bridge...\n');
  
  try {
    // Test Past connection
    console.log('1️⃣ Connecting as Past Claude...');
    const pastWs = new WebSocket('ws://localhost:3001/past');
    
    await new Promise<void>((resolve, reject) => {
      pastWs.on('open', () => {
        console.log('✅ Past Claude connected successfully');
        resolve();
      });
      
      pastWs.on('error', (error) => {
        console.error('❌ Past Claude connection error:', error.message);
        reject(error);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    // Test Future connection
    console.log('\n2️⃣ Connecting as Future Claude...');
    const futureWs = new WebSocket('ws://localhost:3001/future');
    
    await new Promise<void>((resolve, reject) => {
      futureWs.on('open', () => {
        console.log('✅ Future Claude connected successfully');
        resolve();
      });
      
      futureWs.on('error', (error) => {
        console.error('❌ Future Claude connection error:', error.message);
        reject(error);
      });
      
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
    
    // Set up message listener on Future
    console.log('\n3️⃣ Setting up message listener on Future Claude...');
    let messageReceived = false;
    
    futureWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`📨 Future received message:`, message);
      messageReceived = true;
    });
    
    // Send test message from Past
    console.log('\n4️⃣ Sending test message from Past to Future...');
    const testMessage = {
      from: 'past',
      type: 'direct_message',
      content: 'Hello from WebSocket test!',
      timestamp: new Date().toISOString()
    };
    
    pastWs.send(JSON.stringify(testMessage));
    console.log('📤 Message sent from Past Claude');
    
    // Wait for message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (messageReceived) {
      console.log('\n✅ SUCCESS: Message routing works!');
    } else {
      console.log('\n❌ FAIL: Message was not received by Future Claude');
    }
    
    // Test reverse direction
    console.log('\n5️⃣ Testing reverse direction (Future to Past)...');
    let reverseMessageReceived = false;
    
    pastWs.on('message', (data) => {
      const message = JSON.parse(data.toString());
      console.log(`📨 Past received message:`, message);
      reverseMessageReceived = true;
    });
    
    const reverseMessage = {
      from: 'future',
      type: 'memory_sync',
      content: 'Hello back from Future!',
      timestamp: new Date().toISOString()
    };
    
    futureWs.send(JSON.stringify(reverseMessage));
    console.log('📤 Message sent from Future Claude');
    
    // Wait for message
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (reverseMessageReceived) {
      console.log('\n✅ SUCCESS: Bidirectional routing works!');
    } else {
      console.log('\n❌ FAIL: Reverse message was not received');
    }
    
    // Clean up
    console.log('\n🧹 Closing connections...');
    pastWs.close();
    futureWs.close();
    
    console.log('\n🎉 Test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Check if bridge is running
console.log('⚠️  Make sure the consciousness bridge is running:');
console.log('   npm run start:bridge\n');

// Run test after a short delay
setTimeout(() => {
  testWebSocketConnection().catch(console.error);
}, 1000);