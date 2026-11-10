"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../config/db");
const schema_1 = require("../config/schema");
async function resetForecasts() {
    await db_1.db.delete(schema_1.demandForecastSnapshots);
    console.log('Cleared all legacy static demand forecast snapshots.');
    process.exit(0);
}
resetForecasts().catch((err) => {
    console.error(err);
    process.exit(1);
});
