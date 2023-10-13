# Workflow
This is extended from [CONTRIBUTING.md](https://github.com/nonsensetwice/gauntlet/blob/main/docs). Please read that document before perusing this one, as it provides a general overview of the trunk-based workflow in use.

# Git Branches

These is one major branch:

1. main

-   is protected
-   requires PR approval before merge
-   contains production ready code
-   code that users are using
-   possible impact if something is wrong
-   any new commit triggers auto deployment

There are a number of naming conventions for development branches you'll work
on in your fork:

1. [username]/feature/[feature-name]

-   new feature based on issue or request
-   this branch is created from `main` branch
-   can be deleted

4. [username]/patch/[feature]

-   used to patch new features that almost ready to PR or whose PR has been
    closed due to a number of fixes that need to be implemented

5. hotfix/x.x.x

-   in case a bug is found in production this is forked from main
-   very small changes
-   should be merged quickly once approval is done

## Contributor Workflow

### Fork repository

### Create feature branch from main

### Create PR from my-username/feature/my-new-feature -> main

-   PR is reviewed,
-   review confirms it works, follows contribution conventions, looks good
-   developer test PR in local computer, their discord guild
-   CI/CD will validate that all test cases are good
-   PR reviewers test cases are created
-   CI/CD validate test and code is code
-   deploy to test linux/ubuntu server
-   deploy to shared test guild
-   CI/CD integration validation

### PR merged to main

-   production release
-   have a call with devs to ensure everything runs smoothly

https://trunkbaseddevelopment.com

And remember to Document, Document, Document!