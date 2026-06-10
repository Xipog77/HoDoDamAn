DO $$ BEGIN
 CREATE TYPE "public"."edit_request_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."fund_type" AS ENUM('IN', 'OUT');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('GUEST', 'MEMBER', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "edit_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"requester_id" integer NOT NULL,
	"changes" jsonb NOT NULL,
	"status" "edit_request_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "family_fund" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "fund_type" NOT NULL,
	"amount" integer NOT NULL,
	"description" text NOT NULL,
	"date" varchar(20) NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "galleries" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"description" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marriages" (
	"id" serial PRIMARY KEY NOT NULL,
	"husband_id" integer NOT NULL,
	"wife_id" integer NOT NULL,
	"wedding_year" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "memory_wall" (
	"id" serial PRIMARY KEY NOT NULL,
	"person_id" integer NOT NULL,
	"author_name" varchar(200) NOT NULL,
	"author_user_id" integer,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "persons" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"gender" "gender" DEFAULT 'MALE' NOT NULL,
	"birth_year" integer,
	"death_year" integer,
	"dob" varchar(20),
	"dod" varchar(20),
	"dob_lunar" varchar(20),
	"dod_lunar" varchar(20),
	"father_id" integer,
	"mother_id" integer,
	"biography" text,
	"avatar_url" text,
	"hometown" varchar(300),
	"birthplace" varchar(300),
	"residence" varchar(300),
	"burial_place" varchar(300),
	"generation" integer DEFAULT 1 NOT NULL,
	"branch" varchar(100),
	"is_deceased" boolean DEFAULT false,
	"extra" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"excerpt" text,
	"author_id" integer NOT NULL,
	"is_featured" boolean DEFAULT false,
	"cover_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'MEMBER' NOT NULL,
	"status" "user_status" DEFAULT 'PENDING' NOT NULL,
	"person_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
