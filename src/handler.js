const { makeBody, respond } = require('./utils');
const createHandler = require('github-webhook-handler');
const fetch = require("node-fetch");
const octokit = require("@octokit/rest")();

const voidResponse = _ => respond("No hay nada que hacer aqui.");

// Allow octokit to act as our account
octokit.authenticate({
  type: "token",
  token: process.env.GITHUB_TOKEN,
});

module.exports = function (req, res, errorCallback) {
  const handler = createHandler({ path: '/', secret: 'myhashsecret' });

  handler.on('error', function (err) {
    console.error('Error:', err.message);
  });

  // handler.on('*', function (event) {
  //   console.log('EVENT PAYLOAD:', event.payload);
  // });

  handler.on('ping', async function (event) {
    const { ping_url } = event.payload.hook;
    await fetch(ping_url, makeBody());
    return respond('Ping exitoso');
  });

  handler.on('issue_comment', async function (event) {

    // Extract a few useful things from the payload
    const { payload } = event;
    const labels = payload.issue.labels;
    const issueNumber = payload.issue.number;
    const repoName = payload.repository.name;
    const repoOwner = payload.repository.owner.login;
    const commentAuthor = payload.comment.user.login;
    const commentBody = payload.comment.body;
    const pull_request = payload.issue.pull_request;

    if (payload.action !== 'created' || payload.issue.state !== 'open') {
      return voidResponse();
    }

    if (pull_request) {
      // ====== PR COMMENT ===== //
      if (commentBody.includes('/merge')) {
        const issueIds = commentBody.match(/#\d+/g) || [];
        if (Array.isArray(issueIds) && issueIds.length === 2) {
          const [fixed, created] = issueIds.map(id => +id.slice(1));
          console.log(`ISSUES IDS: ${issueIds}`);

          await Promise.all([
            // A comment in fixed issue
            octokit.issues.createComment({
              repo: repoName,
              owner: repoOwner,
              number: fixed,
              body: `Genial @${commentAuthor}! Acabas de superar el desafio.
              Espero hayas aprendido algo valioso y que hayas disfrutado hacer el reto, recuerda que la práctica hace al Maestro.
              Felicidades!!!`,
            }),
            // close fixed issue
            octokit.issues.edit({
              repo: repoName,
              owner: repoOwner,
              number: fixed,
              state: 'closed',
              labels: [],
            }),
            // make created issue as available
            octokit.issues.replaceAllLabels({
              repo: repoName,
              owner: repoOwner,
              number: created,
              labels: ["disponible"],
            }),
            // A merge
            octokit.pullRequests.merge({
              repo: repoName,
              owner: repoOwner,
              number: issueNumber,
              // commit_title: `Merge solución de @${commentAuthor} al desafio #${fixed}`,
            }),
          ]);
        }
      }
    } else {
      // ====== ISSUE COMMENT ===== //

      // If it's not a /request comment
      if (!commentBody.includes('/request')) {
        return voidResponse();
      }
  
      // If it's already assigned, inform the user and do nothing.
      const isAssigned = labels.find(({ name }) => name === "asignado");
      const isAvailable = labels.find(({ name }) => name === "disponible");
      if (isAssigned) {
        await octokit.issues.createComment({
          repo: repoName,
          owner: repoOwner,
          number: issueNumber,
          body: `Lo siento @${commentAuthor}, este desafío está asignado a alguien mas.`,
        });
  
        return respond("El desafio ya tiene a alguien asignado.");
      }
      if (!isAvailable) {
        await octokit.issues.createComment({
          repo: repoName,
          owner: repoOwner,
          number: issueNumber,
          body: `@${commentAuthor}, este desafío no está disponible aún. Fíjate en que el desafio que vayas a tomar tenga el label **disponible**.`,
        });
  
        return respond("El desafio no está disponible.");
      }

      const authorActiveIssues = await octokit.search.issues({
        q: `type:issue is:open label:asignado:${commentAuthor} `,
      });

      console.log(authorActiveIssues);
  
      // Else apply new labels and inform the user
      await Promise.all([
        octokit.issues.replaceAllLabels({
          repo: repoName,
          owner: repoOwner,
          number: issueNumber,
          labels: ["asignado", `asignado:${commentAuthor}`],
        }),
        octokit.issues.createComment({
          repo: repoName,
          owner: repoOwner,
          number: issueNumber,
          body: `Hey @${commentAuthor}, el desafio es todo tuyo.`,
        }),
      ]);
    }
  });

  handler(req, res, errorCallback);

};
