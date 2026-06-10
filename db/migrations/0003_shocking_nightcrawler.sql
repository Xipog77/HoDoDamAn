DO $$ BEGIN
 CREATE TYPE "public"."anniversary_type" AS ENUM('DEATH', 'COMMEMORATION', 'OTHER');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "anniversaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"type" "anniversary_type" DEFAULT 'OTHER' NOT NULL,
	"date_type" varchar(10) DEFAULT 'SOLAR' NOT NULL,
	"day" integer NOT NULL,
	"month" integer NOT NULL,
	"description" text,
	"person_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
