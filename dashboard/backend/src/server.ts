import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { SqliteExecutionRepository } from '../../../src/database/ExecutionRepository';
import { ConfigLoader } from '../../../src/config/ConfigLoader';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.DASHBOARD_PORT ? parseInt(process.env.DASHBOARD_PORT, 10) : 3000;
const dbRepo = new SqliteExecutionRepository();

// Initialize Database connection on start
dbRepo.init().catch((err) => console.error('Failed to init SQLite DB:', err));

// 1. API: List all project configurations
app.get('/api/projects', (req: Request, res: Response) => {
  try {
    const projects = ConfigLoader.listAvailableProjects();
    res.json({ success: true, projects });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 2. API: Get details for a specific project config
app.get('/api/projects/:name', (req: Request, res: Response) => {
  try {
    const config = ConfigLoader.loadProjectConfig(req.params.name);
    res.json({ success: true, config });
  } catch (error) {
    res.status(404).json({ success: false, error: (error as Error).message });
  }
});

// 3. API: List execution history
app.get('/api/executions', async (req: Request, res: Response) => {
  try {
    const executions = await dbRepo.getExecutions();
    res.json({ success: true, executions });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 4. API: Get latest execution record
app.get('/api/executions/latest', async (req: Request, res: Response) => {
  try {
    const latest = await dbRepo.getLatestExecution();
    res.json({ success: true, execution: latest });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 5. API: Get specific execution record
app.get('/api/executions/:id', async (req: Request, res: Response) => {
  try {
    const record = await dbRepo.getExecutionById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, error: 'Execution record not found' });
    }
    res.json({ success: true, execution: record });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// 6. API: Trigger a test run
app.post('/api/trigger-test', (req: Request, res: Response) => {
  const { project = 'demo-rbp', badRbp = false } = req.body;
  const envFlag = badRbp ? 'RBP_MODE=bad' : '';

  exec(`${envFlag} npx tsx src/cli/index.ts test --project ${project} ${badRbp ? '--bad-rbp' : ''}`, (error, stdout, stderr) => {
    res.json({
      success: !error,
      stdout,
      stderr,
      error: error ? error.message : null
    });
  });
});

// Serve frontend static assets if built
const frontendDist = path.resolve(__dirname, '../dist-frontend');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`  RBP Security Dashboard Server Running`);
    console.log(`  URL: http://localhost:${PORT}`);
    console.log(`==================================================`);
  });
}

export default app;
