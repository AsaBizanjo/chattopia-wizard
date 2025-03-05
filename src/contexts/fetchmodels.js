// Install the OpenAI package: npm install openai
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://api.zukijourney.com/v1',
  apiKey: 'zu-6d1e7c3d26c99c39102c35b6d4aa3d72', // Replace with your actual API key
});

async function main() {
  try {
    const response = await client.models.list();
    if (response && response.data) {
      console.log(response.data); // Adjust based on the actual response structure
    } else {
      console.error('Unexpected response structure:', response);
    }
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

main();