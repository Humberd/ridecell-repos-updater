# Ridecell Repositories updater

This project automatically makes changes to about 30 repositories.

It:
 * Clones repository
 * Descrypts optional secrets
 * Checks out a new branch
 * Adds scripts to `package.json`
 * Copies required files
 * Installs packages
 * Removes, updates and adds new packages
 * Commits changes
 * Prettyfies the whole project
 * Lints the whole project
 * Pushes the brach
 * (Optionally) Builds a project
 * Creates a pull request
