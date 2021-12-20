CREATE TABLE "Inventory" (
	"id"	INTEGER,
	"title"	TEXT UNIQUE,
	"author"	TEXT,
	"subject"	TEXT,
	"description"	TEXT,
	"price"	INTEGER,
	"quantity"	INTEGER,
	"seller"	INTEGER DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
)

CREATE TABLE "Purchases" (
	"confirmation_code"	INTEGER,
	"item_id"	INTEGER NOT NULL,
	"user_id"	INTEGER NOT NULL,
	"quantity"	INTEGER,
	"price_per_item"	INTEGER,
	"total_cost"	INTEGER,
	"datetime_purchased"	DATETIME DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY("user_id") REFERENCES "Users"("id"),
	FOREIGN KEY("item_id") REFERENCES "Inventory"("id"),
	PRIMARY KEY("confirmation_code" AUTOINCREMENT)
)

CREATE TABLE "Users" (
	"id"	INTEGER,
	"email"	TEXT UNIQUE,
	"username"	TEXT UNIQUE,
	"password"	TEXT,
	"credits"	INTEGER DEFAULT 1000,
	"is_logged_in"	INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY("id" AUTOINCREMENT)
)