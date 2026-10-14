<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Install SheetJS (`xlsx`) from its official versioned distribution URL, because the npm release is outdated and contains known vulnerabilities.
- Cadastro edits use a shared dialog and a validated inspector-session server function, recording safe before/after snapshots without rewriting historical inspection records; this preserves audit history and restricts writes to inspectors.
