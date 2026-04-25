const { execSync } = require('child_process');
const dotenv = require('dotenv');

dotenv.config();

const port = Number(process.env.PORT) || 3000;

const run = (command) => execSync(command, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore']
}).trim();

try {
  const output = run(`netstat -ano | findstr :${port}`);
  const lines = output.split(/\r?\n/).filter((line) => line.includes('LISTENING'));
  const processIds = [...new Set(lines.map((line) => line.trim().split(/\s+/).pop()))];

  if (processIds.length === 0) {
    console.log(`Port ${port} is already free.`);
    process.exit(0);
  }

  processIds.forEach((processId) => {
    console.log(`Closing old server on port ${port} with PID ${processId}...`);
    execSync(`taskkill /PID ${processId} /F`, {
      stdio: 'ignore'
    });
  });

  console.log(`Port ${port} is ready.`);
} catch (error) {
  console.log(`Port ${port} is already free.`);
}
