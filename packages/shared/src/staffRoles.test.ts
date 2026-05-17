import { describe, expect, it } from "vitest";
import {
  parseStaffRoleFromClaims,
  staffCanAccessNav,
  staffCanPerformAction,
  staffRoleMeetsMinimum,
} from "./staffRoles";

describe("staffRoles", () => {
  it("parses staffRole claim", () => {
    expect(parseStaffRoleFromClaims({ staffRole: "moderator" })).toBe("moderator");
    expect(parseStaffRoleFromClaims({ staffRole: "owner" })).toBe("owner");
  });

  it("maps legacy admin claim to owner", () => {
    expect(parseStaffRoleFromClaims({ admin: true })).toBe("owner");
  });

  it("gates nav by minimum role", () => {
    expect(staffCanAccessNav("moderator", "reports")).toBe(true);
    expect(staffCanAccessNav("moderator", "users")).toBe(true);
    expect(staffCanAccessNav("moderator", "staff")).toBe(false);
    expect(staffCanAccessNav("owner", "site")).toBe(true);
    expect(staffRoleMeetsMinimum("admin", "moderator")).toBe(true);
  });

  it("gates actions for support vs owner", () => {
    expect(staffCanPerformAction("moderator", "users.ban")).toBe(true);
    expect(staffCanPerformAction("moderator", "users.manage_staff")).toBe(false);
    expect(staffCanPerformAction("admin", "users.delete")).toBe(false);
    expect(staffCanPerformAction("owner", "users.manage_staff")).toBe(true);
    expect(staffCanPerformAction("owner", "users.delete")).toBe(true);
  });
});
