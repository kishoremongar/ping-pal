module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "build",
        "chore",
        "ci",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "revert",
        "style",
        "test",
      ],
    ],
    "scope-enum": (ctx) => [
      2,
      "always",
      [
        "ui",
        "api",
        "auth",
        "config",
        "deps",
        "ci",
        // Allow custom scopes when specified
        ...(ctx.scope === "custom" ? [] : ["custom"]),
      ],
    ],
    "scope-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "header-max-length": [2, "always", 72],
  },
};
