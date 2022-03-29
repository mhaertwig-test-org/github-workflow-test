import { Octokit } from 'octokit';

const repoConfig = {
    owner: 'mhaertwig', //'sbb-design-systems',
    repo: 'github-workflow-test', // 'sbb-angular',
};

const issuePath = {
    ...repoConfig,
    issue_number: 43, // TODO
};

const prPath = {
    ...repoConfig,
    pull_number: parseInt(process.env['PR_NUMBER']!, 10)
};

const githubToken = process.env['GITHUB_TOKEN'];

export class MaintenanceIssueUpdater {
    constructor(private _octokit: Octokit, private _now: Date) {
    }

    async run() {
        const issue = await this._octokit.rest.issues.get(issuePath);
        const pr = await this._octokit.rest.pulls.get(prPath);

        if (!issue.data.body) {
            throw new Error('Could not load issue body');
        }

        if (!pr.data.title || !pr.data.html_url) {
            throw new Error('Could not load pull request');
        }

        const hint = '**Unable to merge the following pull requests into the maintenance branch**';
        let openTasks = this._extractOpenTasks(issue.data.body);
        openTasks.push(`- [ ] [${pr.data.title}](${pr.data.html_url})`)
        openTasks = [...new Set(openTasks)];
        const dateInfo = `${this._now.toISOString()}`

        return this._octokit.rest.issues.update({
            ...issuePath,
            body: `${hint}\r\n${openTasks.join('\r\n')}\r\n${dateInfo}`,
        });
    }

    private _extractOpenTasks(issueBody: string = ''): string[] {
        return issueBody
            .split('\r\n')
            .filter((line) =>  line.startsWith('- [ ]'));
    }
}

if (module === require.main) {
    const maintenanceIssueUpdater = new MaintenanceIssueUpdater(
        new Octokit({
            auth: githubToken,
        }),
        new Date(),
    );
    maintenanceIssueUpdater.run();
}
