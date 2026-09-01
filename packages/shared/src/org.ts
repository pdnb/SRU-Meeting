import * as z from "zod";

export const OrgRoleSchema = z.enum(["org_admin", "host", "participant"]);

export type OrgRole = z.infer<typeof OrgRoleSchema>;
