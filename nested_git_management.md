# Managing Nested Git Repositories

You have a repository with several nested git repositories inside it:
- `ddos`
- `blocsavior-ui`
- `polkadot-sdk`

This guide explains how to manage them, specifically focusing on how to consolidate them into a single remote (Monorepo approach), which is the most common desire when asking for "one thing in this git".

## Option 1: The Monorepo Approach (Recommended)

This approach removes the `.git` history of the sub-folders and tracks their files directly in the main repository. This is the simplest way to have everything in "one git".

### Steps to Consolidate

**1. Remove nested `.git` folders:**

Run these commands from the root of your main repository (`/home/sonu/saviour`):

```bash
# Remove .git folder from ddos
rm -rf ddos/.git

# Remove .git folder from blocsavior-ui
rm -rf blocsavior-ui/.git

# Remove .git folder from polkadot-sdk
rm -rf polkadot-sdk/.git
```

**2. Remove them from cache (if they were previously added as submodules):**

```bash
git rm --cached ddos
git rm --cached blocsavior-ui
git rm --cached polkadot-sdk
```
*(If you get an error saying "pathspec ... did not match any files", that's fine, just ignore it.)*

**3. Add the files to your main repository:**

```bash
git add ddos blocsavior-ui polkadot-sdk
```

**4. Commit the changes:**

```bash
git commit -m "Merge nested repositories into monorepo structure"
```

**5. Push to your single remote:**

```bash
git push origin main
```

Now, all files in `ddos`, `blocsavior-ui`, and `polkadot-sdk` are part of your main repository's history.

---

## Option 2: Git Submodules (Advanced)

Use this if you want to keep the sub-projects as *separate* repositories with their own remotes, but link them here.

**To add a submodule:**
```bash
git submodule add <url-to-repo> <path>
# Example: git submodule add https://github.com/username/ddos.git ddos
```

**To clone a repo with submodules:**
```bash
git clone --recursive <url-to-main-repo>
```

---

## Option 3: Git Subtree (Advanced)

Use this if you want to merge the history of the sub-projects into your main project but still be able to push changes back to the original separate repositories.

**To add a subtree:**
```bash
git subtree add --prefix=ddos <url-to-ddos-repo> main --squash
```
