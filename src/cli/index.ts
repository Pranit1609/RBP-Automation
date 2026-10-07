import { Command } from 'commander';
import { execSync } from 'child_process';
import path from 'path';
import { ConfigLoader } from '../config/ConfigLoader';
import { Logger } from '../utils/Logger';

const program = new Command();

program
  .name('rbp-cli')
  .description('RBP API Automation Framework Command Line Interface')
  .version('1.0.0');

program
  .command('test')
  .description('Run RBP permission validation tests for a project')
  .option('-p, --project <project>', 'Project configuration name or path', 'demo-rbp')
  .option('-r, --role <role>', 'Filter execution by session role (e.g. employee, manager)')
  .option('-t, --test <testId>', 'Filter execution by test ID (e.g. RBP-001)')
  .option('-g, --grep <pattern>', 'Filter test cases by regex/grep string')
  .option('--bad-rbp', 'Simulate BAD RBP mode on local mock server to verify security failure detection')
  .action((options) => {
    try {
      const availableProjects = ConfigLoader.listAvailableProjects();
      Logger.info(`Available projects: [${availableProjects.join(', ')}]`);

      const projectName = options.project;
      Logger.info(`Starting RBP execution for project: '${projectName}'`);

      const envVars: Record<string, string> = {
        ...process.env,
        PROJECT: projectName
      };

      if (options.badRbp) {
        envVars.RBP_MODE = 'bad';
        Logger.warn('!!! BAD RBP MODE ENABLED: Mock server will leak manager records to test failure detection !!!');
      }

      let grepPattern = options.grep || '';

      if (options.role) {
        grepPattern = `${grepPattern}.*${options.role}`;
      }
      if (options.test) {
        grepPattern = options.test;
      }

      const grepArg = grepPattern ? `--grep "${grepPattern}"` : '';
      const cmd = `npx playwright test tests/e2e ${grepArg}`;

      Logger.info(`Executing command: ${cmd}`);

      execSync(cmd, {
        stdio: 'inherit',
        env: envVars,
        cwd: process.cwd()
      });

      Logger.pass(`RBP Security validation suite completed successfully for project '${projectName}'.`);
    } catch (error) {
      Logger.fail(`RBP Test Execution failed or detected permission security violations.`);
      process.exit(1);
    }
  });

program
  .command('projects')
  .description('List all available project configurations')
  .action(() => {
    const projects = ConfigLoader.listAvailableProjects();
    console.log('\nAvailable RBP Project Configurations:');
    projects.forEach((p) => console.log(`  - ${p}`));
    console.log('');
  });

program.parse(process.argv);
