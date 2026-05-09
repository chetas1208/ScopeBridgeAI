import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  config({ path: envPath });
} else {
  console.error("❌ .env.local not found");
  process.exit(1);
}

async function checkGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return console.log("⏭️  GitHub: Skipped (No token configured)");
  
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "DeliveryGuard-Check"
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`✅ GitHub: Authenticated successfully as ${data.login}`);
    } else {
      console.log(`❌ GitHub: Authentication failed (${res.status} ${res.statusText})`);
    }
  } catch (err) {
    console.log(`❌ GitHub: Error connecting to API (${err.message})`);
  }
}

async function checkSlack() {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return console.log("⏭️  Slack: Skipped (No bot token configured)");
  
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const data = await res.json();
    if (data.ok) {
      console.log(`✅ Slack: Authenticated successfully to team ${data.team}`);
    } else {
      console.log(`❌ Slack: Authentication failed (${data.error})`);
    }
  } catch (err) {
    console.log(`❌ Slack: Error connecting to API (${err.message})`);
  }
}

async function checkPipeshift() {
  const apiKey = process.env.PIPESHIFT_API_KEY;
  const baseUrl = process.env.PIPESHIFT_BASE_URL;
  const model = process.env.MODEL_NAME || "moonshotai/Kimi-K2.6";
  if (!apiKey || !baseUrl) return console.log("⏭️  Pipeshift: Skipped (Missing key or URL)");
  
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: model,
        messages: [{"role": "user", "content": "Hello!"}],
        temperature: 1,
        stream: false
      })
    });
    if (res.ok) {
      console.log(`✅ Pipeshift: Authenticated and generated successfully using ${model}`);
    } else {
      console.log(`❌ Pipeshift: Authentication failed (${res.status} ${res.statusText})`);
      const text = await res.text();
      console.log(`   Response: ${text}`);
    }
  } catch (err) {
    console.log(`❌ Pipeshift: Error connecting to API (${err.message})`);
  }
}

async function checkHydraDB() {
  const apiKey = process.env.HYDRADB_API_KEY;
  const baseUrl = process.env.HYDRADB_BASE_URL;
  const projectId = process.env.HYDRADB_PROJECT_ID;
  if (!apiKey || !baseUrl || !projectId) return console.log("⏭️  HydraDB: Skipped (Missing configuration)");
  
  try {
    const res = await fetch(`${baseUrl}/health`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    });
    if (res.ok) {
      console.log(`✅ HydraDB: API is reachable`);
    } else {
      console.log(`❌ HydraDB: Connection failed (${res.status} ${res.statusText})`);
    }
  } catch (err) {
    console.log(`❌ HydraDB: Error connecting to API (${err.message})`);
  }
}

async function checkGmail() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret) return console.log("⏭️  Gmail: Skipped (Missing Client ID or Secret)");
  
  try {
    // To verify the client credentials without a user, we attempt to exchange a fake authorization code.
    // If the credentials are valid, Google returns 'invalid_grant' (because the code is fake).
    // If the credentials are bad, Google returns 'invalid_client'.
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: "fake_test_code",
        redirect_uri: redirectUri || "http://localhost:3000"
      })
    });
    
    const data = await res.json();
    if (data.error === "invalid_grant") {
      console.log(`✅ Gmail: OAuth Credentials are valid (verified via token endpoint)`);
    } else if (data.error === "invalid_client") {
      console.log(`❌ Gmail: Invalid OAuth credentials (${data.error_description || "Unauthorized client"})`);
    } else {
      console.log(`⚠️ Gmail: Unexpected response from Google OAuth (${data.error || res.status})`);
    }
  } catch (err) {
    console.log(`❌ Gmail: Error connecting to Google API (${err.message})`);
  }
}

async function runAll() {
  console.log("🔍 Checking API configurations...\n");
  await checkGmail();
  await checkGitHub();
  await checkSlack();
  await checkPipeshift();
  await checkHydraDB();
  console.log("\n🏁 API Check Complete");
}

runAll();
