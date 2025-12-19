# /commit-and-push — Stage, Message, Commit, Push

Use this slash command when you’re ready to publish the current work in one go.
It stages everything from the repo root, walks you through the existing
`/commit-message` checklist, and pushes the result to whatever branch you have
checked out.

---

## 1. Stage Everything
```bash
git add .
```

## 2. Craft the Message
- Run `/commit-message` to generate the Conventional Commit header, optional
  body, and `Test:` lines.
- Copy the resulting header/body into your clipboard.

## 3. Commit
```bash
git commit
```
> Paste the message from `/commit-message` into the editor and save/close.

## 4. Push the Current Branch
```bash
git push --set-upstream origin "$(git rev-parse --abbrev-ref HEAD)"
```

That’s it—your staged changes are committed and the branch is published.

