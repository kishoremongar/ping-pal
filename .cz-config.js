module.exports = {
  types: [
    { value: 'feat', name: 'feat:     A new feature' },
    { value: 'fix', name: 'fix:      A bug fix' },
    { value: 'docs', name: 'docs:     Documentation changes' },
    { value: 'style', name: 'style:    Code style changes' },
    { value: 'refactor', name: 'refactor: Code changes without bug fixes' },
    { value: 'perf', name: 'perf:     Performance improvements' },
    { value: 'test', name: 'test:     Add missing tests' },
    { value: 'chore', name: 'chore:    Build process or tooling changes' },
  ],

  scopes: [
    { name: 'ui' },
    { name: 'api' },
    { name: 'auth' },
    { name: 'config' },
    { name: 'custom', description: 'Anything not listed here' },
  ],

  allowCustomScopes: true,
  scopeOverrides: {
    chore: [{ name: 'deps' }, { name: 'ci' }, { name: 'custom' }],
  },

  messages: {
    type: "Select the type of change you're committing:",
    scope: "\nSpecify scope of this change (select 'custom' for custom scope):",
    customScope: 'Enter your custom scope:',
    subject: 'Write a SHORT, imperative tense description:\n',
    body: 'Provide a longer description (optional):\n',
    breaking: 'List BREAKING CHANGES (optional):\n',
    footer: 'List ISSUES CLOSED (optional):\n',
    confirmCommit: 'Are you sure you want to proceed?',
  },

  skipQuestions: ['body', 'breaking', 'footer'],
  subjectLimit: 72,
};
