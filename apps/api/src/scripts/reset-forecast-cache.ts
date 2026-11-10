import { db } from '../config/db';
import { demandForecastSnapshots } from '../config/schema';

async function resetForecasts() {
  await db.delete(demandForecastSnapshots);
  console.log('Cleared all legacy static demand forecast snapshots.');
  process.exit(0);
}

resetForecasts().catch((err) => {
  console.error(err);
  process.exit(1);
});