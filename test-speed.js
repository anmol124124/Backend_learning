// ---------------------------------------------------------
// PERFORMANCE TEST SCRIPT
// ---------------------------------------------------------
// This script will show you how much faster the API is with Caching!
// It makes two requests to the same URL:
// 1. The first one hits the Database (Slow)
// 2. The second one hits the Redis Cache (Fast)

import axios from 'axios';

// The URL we want to test (The Home Feed)
const API_URL = 'http://localhost:5000/api/v1/posts/paginate?page=1&limit=5';

const runTest = async () => {
    console.log('🚀 Starting Performance Test...\n');

    try {
        // --- REQUEST 1: DATABASE ---
        console.log('📝 Request 1: Fetching from Database...');
        const start1 = Date.now();
        await axios.get(API_URL);
        const end1 = Date.now();
        console.log(`⏱️  Time taken: ${end1 - start1}ms (The "Cold" start)\n`);

        // --- REQUEST 2: REDIS CACHE ---
        console.log('⚡ Request 2: Fetching from Redis Cache...');
        const start2 = Date.now();
        await axios.get(API_URL);
        const end2 = Date.now();
        console.log(`⏱️  Time taken: ${end2 - start2}ms (The "Warm" cache hit!)`);

        // --- COMPARISON ---
        const diff = (end1 - start1) - (end2 - start2);
        console.log(`\n🎉 The Cache version was ${diff}ms faster!`);

    } catch (error) {
        console.error('❌ Error during test:', error.message);
        console.log('\n💡 Tip: Make sure your backend server is running with "npm run dev" before running this test.');
    }
};

runTest();
