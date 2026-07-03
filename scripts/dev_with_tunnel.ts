import localtunnel from 'localtunnel';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('Starting localtunnel on port 3000...');
  
  const tunnel = await localtunnel({ port: 3000 });
  
  console.log(`\n========================================`);
  console.log(`✅ Secure Tunnel Established!`);
  console.log(`🔗 URL: ${tunnel.url}`);
  console.log(`========================================\n`);

  // Update .env file
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');
    if (envContent.includes('NEXT_PUBLIC_APP_URL')) {
      envContent = envContent.replace(
        /NEXT_PUBLIC_APP_URL=.*/,
        `NEXT_PUBLIC_APP_URL="${tunnel.url}"`
      );
    } else {
      envContent += `\nNEXT_PUBLIC_APP_URL="${tunnel.url}"\n`;
    }
    fs.writeFileSync(envPath, envContent);
  }

  // Start Next.js
  const next = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_APP_URL: tunnel.url }
  });

  // Start Bot
  const bot = spawn('npm', ['run', 'bot'], { 
    stdio: 'inherit',
    env: { ...process.env, NEXT_PUBLIC_APP_URL: tunnel.url }
  });

  tunnel.on('close', () => {
    console.log('Tunnel closed');
    next.kill();
    bot.kill();
  });
})();
