/**
 * @rpg-node Database - SQLite connection, WAL mode, version-based migrations
 * @rpg-deps better-sqlite3, constants.ts
 * @rpg-flow Entry point for all data access -> provides db instance to services
 */
import Database from "better-sqlite3";
/** Initialize and return the database connection */
export declare function getDb(): Database.Database;
/** Close the database connection gracefully */
export declare function closeDb(): void;
//# sourceMappingURL=database.d.ts.map