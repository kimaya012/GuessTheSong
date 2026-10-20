CREATE TABLE "player_names" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"device_id" uuid,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_names_owner_check" CHECK ("player_names"."device_id" IS NOT NULL OR "player_names"."user_id" IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "player_names" ADD CONSTRAINT "player_names_device_id_user_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."user_devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_names" ADD CONSTRAINT "player_names_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "player_names_name_key_idx" ON "player_names" USING btree ("name_key");--> statement-breakpoint
CREATE UNIQUE INDEX "player_names_device_idx" ON "player_names" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_names_user_idx" ON "player_names" USING btree ("user_id");