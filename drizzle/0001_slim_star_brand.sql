CREATE TABLE `customFoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`foodName` varchar(255) NOT NULL,
	`calories` int NOT NULL,
	`protein` float NOT NULL,
	`carbs` float NOT NULL,
	`fats` float NOT NULL,
	`unit` varchar(50) DEFAULT 'serving',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customFoods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailySummary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` timestamp NOT NULL,
	`totalCalories` int DEFAULT 0,
	`totalProtein` float DEFAULT 0,
	`totalCarbs` float DEFAULT 0,
	`totalFats` float DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailySummary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `foodEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`foodName` varchar(255) NOT NULL,
	`mealTime` enum('morning','noon','evening','lateNight') NOT NULL,
	`calories` int NOT NULL,
	`protein` float NOT NULL,
	`carbs` float NOT NULL,
	`fats` float NOT NULL,
	`quantity` float DEFAULT 1,
	`unit` varchar(50) DEFAULT 'serving',
	`imageUrl` varchar(512),
	`barcode` varchar(100),
	`source` enum('manual','image','barcode') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`date` timestamp NOT NULL,
	CONSTRAINT `foodEntries_id` PRIMARY KEY(`id`)
);
