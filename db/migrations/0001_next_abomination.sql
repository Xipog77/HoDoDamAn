DO $$ BEGIN
 CREATE TYPE "public"."media_source" AS ENUM('UPLOAD', 'EXTERNAL');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(100),
	"source" "media_source" DEFAULT 'UPLOAD' NOT NULL,
	"person_id" integer,
	"post_id" integer,
	"caption" text,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "achievements" text;