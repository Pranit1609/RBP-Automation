import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.MOCK_PORT ? parseInt(process.env.MOCK_PORT, 10) : 4000;

// Simple Token Store for Mock Server
const TOKENS: Record<string, { role: string; email: string }> = {
  'mock-token-employee-12345': { role: 'employee', email: 'employee@test.com' },
  'mock-token-manager-67890': { role: 'manager', email: 'manager@test.com' }
};

// 1. Authentication Endpoint
app.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  if (email === 'employee@test.com' && (password === 'Employee123!' || password.length > 0)) {
    return res.status(200).json({
      success: true,
      token: 'mock-token-employee-12345',
      user: { email, role: 'employee' }
    });
  }

  if (email === 'manager@test.com' && (password === 'Manager123!' || password.length > 0)) {
    return res.status(200).json({
      success: true,
      token: 'mock-token-manager-67890',
      user: { email, role: 'manager' }
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid email or password'
  });
});

// Helper middleware to inspect Authorization header
function authenticate(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const session = TOKENS[token];

  if (!session) {
    return res.status(403).json({ error: 'Invalid or expired session token' });
  }

  (req as any).session = session;
  next();
}

// 2. Employee API Endpoint
app.get('/employee/getEmployee', authenticate, (req: Request, res: Response) => {
  return res.status(200).json({
    data: [
      { id: '101', name: 'John Employee', role: 'Employee', department: 'Engineering' }
    ]
  });
});

// 3. Manager API Endpoint
app.get('/manager/getEmployee', authenticate, (req: Request, res: Response) => {
  const session = (req as any).session;
  const isBadMode = req.query.mode === 'bad_rbp' || process.env.RBP_MODE === 'bad';

  if (session.role === 'employee') {
    if (isBadMode) {
      // BAD RBP MODE: Wrongly leak Manager record 102 to employee session!
      return res.status(200).json({
        data: [
          { id: '101', name: 'John Employee', role: 'Employee' },
          { id: '102', name: 'Jane Manager', role: 'Manager', salary: '$150,000' }
        ]
      });
    } else {
      // GOOD RBP MODE: Reject or filter out manager record 102!
      return res.status(200).json({
        data: [
          { id: '101', name: 'John Employee', role: 'Employee' }
        ]
      });
    }
  }

  if (session.role === 'manager') {
    return res.status(200).json({
      data: [
        { id: '102', name: 'Jane Manager', role: 'Manager', salary: '$150,000' }
      ]
    });
  }

  return res.status(403).json({ error: 'Access denied' });
});

// 4. Alternate Endpoint simulation
app.get('/employee/getentityname', authenticate, (req: Request, res: Response) => {
  return res.status(200).json({
    data: [
      { id: '101', entity: 'EmployeeEntity' }
    ]
  });
});

app.get('/manager/getentityname', authenticate, (req: Request, res: Response) => {
  const session = (req as any).session;
  const isBadMode = req.query.mode === 'bad_rbp' || process.env.RBP_MODE === 'bad';

  if (session.role === 'employee' && isBadMode) {
    return res.status(200).json({
      data: [{ id: '102', entity: 'ManagerEntity' }]
    });
  }

  return res.status(200).json({
    data: [{ id: '101', entity: 'EmployeeEntity' }]
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Mock RBP Server] Running on http://localhost:${PORT}`);
  });
}

export default app;
