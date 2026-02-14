CREATE TABLE `userGoals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`height` float,
	`weight` float,
	`age` int,
	`gender` enum('male','female','other'),
	`activityLevel` enum('sedentary','light','moderate','active','veryActive'),
	`dailyCalories` int DEFAULT 2000,
	`dailyProtein` float DEFAULT 150,
	`dailyCarbs` float DEFAULT 250,
	`dailyFats` float DEFAULT 65,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userGoals_id` PRIMARY KEY(`id`),
	CONSTRAINT `userGoals_userId_unique` UNIQUE(`userId`)
);
