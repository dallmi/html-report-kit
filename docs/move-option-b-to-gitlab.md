# Move option-b into a GitLab repository

Turns the hand-copied `option-b` folder into its own git repository and pushes it to an empty GitLab project that already has an initial README commit. Real data (`data/`, workbooks) stays out. The `dashboard/` folder next to `option-b/` stays outside the repository, so the build commands in `option-b/README.md` keep working unchanged.

Every block is meant to be pasted into the terminal as a whole. If the editor asks whether to paste several lines, confirm.

## 1. Check the folder is not a repository yet

Open the terminal in the `option-b` folder, then:

```bash
git status
```

Expected: `fatal: not a git repository`. Anything else: stop here.

## 2. Ignore real data and clutter

`option-b` becomes the repository root, so the `.gitignore` one level up no longer applies. `/data/` needs the leading slash: without it, the code in `src/data/` would be ignored too.

```bash
cat > .gitignore <<'EOF'
# Dashboard data built from real figures, never in git
/data/
# Real source files (dashboard, workbooks), never in git
*.xlsx
# Photos and screenshots
*.jpeg
*.jpg
*.png
# Local clutter
__pycache__/
*.pyc
.pytest_cache/
.DS_Store
EOF
```

## 3. Create the repository

```bash
git init -b main
```

Connect it to GitLab. In the GitLab project, open **Code → Clone with HTTPS** and copy the URL. Type the start of the command below, paste the URL after it, and press Enter:

```
git remote add origin 
```

Then load the GitLab history and put the local files on top of it. `fetch` downloads GitLab's initial commit without touching any file; `reset` moves the branch onto that commit and leaves every local file as it is, so the local `README.md` replaces GitLab's. No force push is needed.

```bash
git fetch origin
git reset origin/main
git add -A
```

If `fetch` asks for a username and password: the username is your GitLab username, the password is a personal access token (GitLab → avatar → **Preferences → Access Tokens**, scope `write_repository`). Type the token only into the prompt, never into a file.

## 4. Check before committing

```bash
git ls-files | wc -l
git ls-files | grep -E '^data/|\.xlsx$|\.(jpe?g|png)$|__pycache__'
git grep -Inwi --cached 'u[b]s'
```

- The first line prints about **53**.
- The other two print **nothing**. If either prints a line, do not commit.

## 5. Name, commit and push

Only if `git config user.email` prints nothing:

```
git config user.name "Your Name"
git config user.email "your work email"
```

Then:

```bash
git commit -m "Import dashboard"
git push -u origin main
```

## 6. Clean up in GitLab

Editing a file in the GitLab web editor can leave a branch named `…-patch-…`. If nothing in it is needed, delete it under **Code → Branches**.
