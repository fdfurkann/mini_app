import { run_trader } from './run_trader.js';

async function main() {
  try {
    await run_trader(5104);
  } catch (error) {
    console.error('Hata:', error);
  }
}

main();
