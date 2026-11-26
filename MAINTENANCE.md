# Maintenance

The site updates itself. A person does not need to run a deploy, edit data, or watch a dashboard. Everything below uses the free GitHub and Cloudflare Workers plans.

## How it runs

Once a day, around 6:00 AM America/Chicago, GitHub Actions runs `.github/workflows/data-refresh.yml` (workflow `410961748`). It fetches Arena, Epoch AI, OpenRouter prices, and the Open Agent Leaderboard, builds the worker, and deploys it only after the live pages return HTTP 200. The public "updated" time moves only after those checks pass. A second run at 18:00 UTC does the same job only if that day's refresh has not succeeded.

Each source is fetched on its own, with three attempts and a pause between them. If one source fails or comes back empty, that source keeps its previous file and the other sources still ship.

A monthly job, `.github/workflows/keepalive.yml`, turns the refresh workflow back on through the GitHub API. GitHub disables schedules after 60 days with no commit. The daily data commit is the normal activity. The monthly job also pushes an empty commit if the repository has been idle for 40 days.

Dependabot opens one grouped pull request a month for npm and one for GitHub Actions.

## What an issue means

An open issue labelled `siscope-refresh` means the latest refresh did not finish. The comment names the failing step and includes the last lines of the log. The next successful refresh closes it. One open issue is enough. Later failures add a comment instead of a new issue.

| Failing step | What to do |
| --- | --- |
| Cloudflare secrets | In the repository secrets, set `CLOUDFLARE_API_TOKEN` (Workers edit on the `siscope` worker) and `CLOUDFLARE_ACCOUNT_ID` to the account in `wrangler.jsonc`. |
| Cloudflare token | The token was rejected by `wrangler whoami`. Create a new Workers edit token in Cloudflare and replace `CLOUDFLARE_API_TOKEN`. |
| fetch | Every source failed, or the build could not read the kept files. Open the log. A single source name in "kept their last good snapshot" is not this failure. |
| snapshot sanity | The merged data has a non-number, a price that is not above zero, or too few models. Look at the listed problem. The previous deployment is still live. |
| worker size | The worker gzip is over 2.8 MiB. Remove something from the worker script before the next refresh. The free plan hard limit is 3 MiB. |
| OpenNext build, lint, or typecheck | The log names the file. Fix that and push to `main`. |
| deploy | Cloudflare rejected the upload. The previous worker is still serving. Read the wrangler error in the log. |
| live checks | Some public URL was not HTTP 200. The script rolls back to the last full-traffic version. If the log says rollback did not complete, run `npx wrangler rollback` from a checkout with the same Cloudflare secrets. |
| snapshot commit | The new worker is live and checked, but git push of `data/` failed. The next successful refresh commits the snapshot. |

## If schedules stop

GitHub disables scheduled workflows after 60 days without a commit. The fix is one push, which the monthly job does when it can still run. If that job is disabled too:

```bash
gh api -X PUT repos/SIscope-app/SIscope/actions/workflows/data-refresh.yml/enable
gh api -X PUT repos/SIscope-app/SIscope/actions/workflows/keepalive.yml/enable
```

Then run the **Daily data refresh** workflow from the Actions tab (workflow dispatch). That does not need a new account. The workflow uses `GITHUB_TOKEN`.
